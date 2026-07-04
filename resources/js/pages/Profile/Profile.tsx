import { useState, useEffect } from 'react';
import { Sun, Moon, Monitor, Eye, EyeOff } from 'lucide-react';
import ChatLayout from '@/components/ChatLayout';
import FlashBanner from '@/components/FlashBanner';
import { Head, router, usePage } from '@inertiajs/react';

interface Agent {
    id: number;
    name: string;
    provider: string;
    model: string | null;
    is_default: boolean;
}

interface Chat {
    id: number;
    title: string;
    created_at: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    is_admin: boolean;
    theme?: 'light' | 'dark' | 'system';
}

interface AdminDefaultProvider {
    provider: string;
    name: string;
    has_api_key: boolean;
}

interface ProfilePageProps {
    agents: Agent[];
    chats: Chat[];
    user: User;
    adminDefaultProvider?: AdminDefaultProvider | null;
}

const inputCls = 'w-full px-3 py-2 rounded-lg border-2 text-sm outline-none transition-colors theme-bg-input theme-border theme-text-primary focus:border-[#667eea]';
const labelCls = 'block text-xs mb-1 theme-text-secondary';
const btnCls = 'px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-xs font-medium hover:shadow-md hover:shadow-[rgba(102,126,234,0.3)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed';
const sectionCls = 'rounded-xl p-4 theme-bg-card border-0';

export default function ProfilePage({ agents, chats, user, adminDefaultProvider }: ProfilePageProps) {
    // Source of truth for the initial selection: localStorage (user's last active choice)
    // or the DB value. data-theme on <html> is always the RESOLVED 'light'/'dark'
    // (set by the inline blade script), so reading it would lose 'system'.
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(
        (() => {
            try {
                const ls = localStorage.getItem('app_theme');
                if (ls === 'light' || ls === 'dark' || ls === 'system') return ls;
            } catch (e) {}
            return user.theme ?? 'system';
        })()
    );
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    // Laravel returns validation errors as { field: [msg, msg, ...] } — store the full arrays
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    // Manual toast override for non-validation errors (e.g. network failures,
    // 500 responses). Pass to <FlashBanner variant="toast" override={...} />.
    // Validation errors flow through `$page.props.errors` → field errors only.
    const [overrideFlash, setOverrideFlash] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const csrf = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

    // Sync field errors from Inertia's `$page.props.errors` (auto-populated
    // by the `errors` shared prop). This covers BOTH the 422 validation
    // case (Laravel's validate() failure) AND any controller path that
    // returns back()->withErrors(...). Either way, errors display as
    // field-level only — never as a top-level toast.
    const { errors: pageErrors } = usePage<{ errors?: Record<string, string> }>().props;
    useEffect(() => {
        if (pageErrors && Object.keys(pageErrors).length > 0) {
            const arr: Record<string, string[]> = {};
            for (const [k, v] of Object.entries(pageErrors)) {
                arr[k] = [v];
            }
            setFieldErrors(arr);
        }
        // Intentionally do NOT clear fieldErrors when pageErrors is empty —
        // the form's submit handlers clear local state at the start of each
        // submission, and we don't want this effect to race with that.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageErrors]);

    const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
        // Wrap the entire DOM mutation + state commit in a View Transition
        // (when supported) so the theme change is atomic — the browser
        // crossfades the whole page in a single 250ms animation instead of
        // letting elements repaint in a visible cascade (logo → dropdown →
        // sidebar → main body).
        //
        // Fallback path (Firefox / older): instant cut. ChatLayout listens
        // for the app:theme-changed event and arms the per-element
        // CSS transitions via .theme-changing for a smooth (if slightly
        // cascaded) transition.
        const effective = newTheme === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : newTheme;

        const mutate = () => {
            const root = document.documentElement;
            root.classList.remove('light', 'dark');
            document.body.classList.remove('light', 'dark');
            root.classList.add(effective);
            document.body.classList.add(effective);
            root.setAttribute('data-theme', effective);
            setTheme(newTheme);
            try { localStorage.setItem('app_theme', newTheme); } catch (e) {}
            try {
                window.dispatchEvent(new CustomEvent('app:theme-changed', { detail: newTheme }));
            } catch (e) {}
        };

        if (typeof document.startViewTransition === 'function') {
            // Suppress live-DOM CSS transitions during the crossfade.
            document.documentElement.classList.add('theme-vt');
            const transition = document.startViewTransition(mutate);
            transition.finished.finally(() => {
                document.documentElement.classList.remove('theme-vt');
            });
        } else {
            mutate();
        }

        // Fire-and-forget save to server
        fetch('/profile/theme', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': csrf() },
            body: JSON.stringify({ theme: newTheme }),
        }).catch(() => {});
    };

    // Listen for theme changes from other components (e.g. ChatLayout's header
    // dropdown) so the Appearance picker's selected state stays in sync.
    useEffect(() => {
        function onThemeChanged(e: Event) {
            const ce = e as CustomEvent<'light' | 'dark' | 'system'>;
            const next = ce.detail;
            if (next === 'light' || next === 'dark' || next === 'system') {
                setTheme(next);
            }
        }
        window.addEventListener('app:theme-changed', onThemeChanged);
        return () => window.removeEventListener('app:theme-changed', onThemeChanged);
    }, []);

    // Theme is applied by ChatLayout — do not apply here

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setFieldErrors({});
        setOverrideFlash(null);

        // Use Inertia router.post so the backend's back()->with('flash', ...)
        // flows into $page.props.flash and is rendered by <FlashBanner />.
        // Validation errors land on `errors` from Inertia's default share();
        // we still extract them into fieldErrors for per-field display.
        router.post('/profile', { name, email }, {
            preserveScroll: true,
            onSuccess: () => {
                // Success toast is rendered by FlashBanner via $page.props.flash.
                setFieldErrors({});
            },
            onError: (errors) => {
                if (Object.keys(errors).length === 0) {
                    // Non-validation error (e.g. 500, network) — show a toast.
                    setOverrideFlash({ type: 'error', message: 'Failed to update profile. Please try again.' });
                } else {
                    const arr: Record<string, string[]> = {};
                    for (const [k, v] of Object.entries(errors)) {
                        arr[k] = Array.isArray(v) ? v : [String(v)];
                    }
                    setFieldErrors(arr);
                }
            },
            onFinish: () => setSaving(false),
        });
    };

    // handleLogout removed — logout button moved to sidebar (ChatLayout)

    // NOTE: We intentionally do NOT observe data-theme here. data-theme on <html>
    // is the RESOLVED 'light'/'dark' (set by the blade script and ChatLayout's
    // applyTheme), so an observer would overwrite the user's literal 'system'
    // selection with the resolved value. setTheme(newTheme) inside
    // handleThemeChange is the single source of truth for the picked value.

    const themeOptions: { value: 'light' | 'dark' | 'system'; label: string; Icon: typeof Sun }[] = [
        { value: 'light', label: 'Light', Icon: Sun },
        { value: 'dark', label: 'Dark', Icon: Moon },
        { value: 'system', label: 'System', Icon: Monitor },
    ];

    return (
        <>
            <Head title="Profile - ThinkChat" />
            <ChatLayout agents={agents} chats={chats} user={user} theme={theme} adminDefaultProvider={adminDefaultProvider}>
                {/* Flash banner — reads $page.props.flash (set by the Inertia
                    middleware on every back()->with('flash', ...) response) and
                    renders a top-right toast. The `override` prop is used for
                    non-validation errors (network failures, 500s) that don't
                    flow through the flash channel. Validation errors display
                    per-field only, never as a toast. */}
                <FlashBanner variant="toast" override={overrideFlash} />

                <div className="flex-1 overflow-y-auto p-4 md:p-5 theme-bg-app">
                    <div className="max-w-[900px] mx-auto space-y-3">
                        {/* Page Header */}
                        <div className={sectionCls}>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center text-base font-bold text-white flex-shrink-0">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h1 className="text-base font-bold theme-text-primary truncate">{user.name}</h1>
                                        {user.is_admin && (
                                            <span className="px-1.5 py-0.5 rounded-full bg-[rgba(231,76,60,0.2)] text-[#e74c3c] text-[10px] font-medium">
                                                Admin
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs theme-text-muted truncate">{user.email}</p>
                                </div>
                            </div>
                        </div>

                        {/* Theme picker (logout moved to sidebar) */}
                        <div className={sectionCls}>
                            <h2 className="text-sm font-semibold mb-2 theme-text-primary">Appearance</h2>
                            <div
                                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                                style={{ backgroundColor: 'transparent' }}
                            >
                                <div
                                    className="flex gap-1 p-1 rounded-lg"
                                    style={{ backgroundColor: 'transparent' }}
                                >
                                    {themeOptions.map(({ value, label, Icon }) => (
                                        <button
                                            key={value}
                                            onClick={() => handleThemeChange(value)}
                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                                theme === value
                                                    ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white border border-transparent'
                                                    : 'theme-text-secondary hover:opacity-80 border border-transparent'
                                            }`}
                                        >
                                            <Icon className="w-3.5 h-3.5" /> {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Update Profile */}
                        <form onSubmit={handleSaveProfile} className={sectionCls}>
                            <h2 className="text-sm font-semibold mb-2 theme-text-primary">Update Profile</h2>
                            <div className="space-y-3">
                                <div>
                                    <label className={labelCls}>Name <span className="text-red-500">*</span></label>
                                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls + (fieldErrors.name ? ' !border-red-500' : '')} />
                                    {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name[0]}</p>}
                                </div>
                                <div>
                                    <label className={labelCls}>Email <span className="text-red-500">*</span></label>
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls + (fieldErrors.email ? ' !border-red-500' : '')} />
                                    {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email[0]}</p>}
                                </div>
                                <button type="submit" disabled={saving} className={btnCls}>
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>

                        {/* Change Password */}
                        <div className={sectionCls}>
                            <h2 className="text-sm font-semibold mb-2 theme-text-primary">Change Password</h2>
                            <div className="space-y-3">
                                <div>
                                    <label className={labelCls}>Current Password <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <input
                                            type={showCurrentPassword ? 'text' : 'password'}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className={inputCls + (fieldErrors.current_password ? ' !border-red-500' : '')}
                                        />
                                        <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 theme-text-secondary">
                                            {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {fieldErrors.current_password && <p className="text-red-500 text-xs mt-1">{fieldErrors.current_password[0]}</p>}
                                </div>
                                <div>
                                    <label className={labelCls}>New Password <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className={inputCls + (fieldErrors.password ? ' !border-red-500' : '')}
                                        />
                                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 theme-text-secondary">
                                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password[0]}</p>}
                                </div>
                                <div>
                                    <label className={labelCls}>Confirm New Password <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className={inputCls + (fieldErrors.password_confirmation ? ' !border-red-500' : '')}
                                        />
                                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 theme-text-secondary">
                                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {fieldErrors.password_confirmation && <p className="text-red-500 text-xs mt-1">{fieldErrors.password_confirmation[0]}</p>}
                                </div>
                                <button
                                    type="button"
                                    disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                                    onClick={() => {
                                        // Password mismatch is handled by Laravel's `confirmed`
                                        // rule on the backend (see ProfileController::changePassword).
                                        // On mismatch the response is 422 with
                                        //   errors: { password: ['The password field confirmation does not match.'] }
                                        // and the useEffect on `$page.props.errors` populates
                                        // fieldErrors — the error renders under the new-password
                                        // input. No client-side check needed.
                                        setChangingPassword(true);
                                        setFieldErrors({});
                                        setOverrideFlash(null);
                                        // Use Inertia router so back()->with('flash', ...) flows
                                        // into $page.props.flash; success toast is rendered by
                                        // FlashBanner. Validation errors populate field-level
                                        // errors; non-validation errors show as a toast.
                                        router.post('/profile/password', {
                                            current_password: currentPassword,
                                            password: newPassword,
                                            password_confirmation: confirmPassword,
                                        }, {
                                            preserveScroll: true,
                                            onSuccess: () => {
                                                setCurrentPassword('');
                                                setNewPassword('');
                                                setConfirmPassword('');
                                                setFieldErrors({});
                                            },
                                            onError: (errors) => {
                                                if (Object.keys(errors).length === 0) {
                                                    setOverrideFlash({ type: 'error', message: 'Failed to change password. Please try again.' });
                                                } else {
                                                    const arr: Record<string, string[]> = {};
                                                    for (const [k, v] of Object.entries(errors)) {
                                                        arr[k] = Array.isArray(v) ? v : [String(v)];
                                                    }
                                                    setFieldErrors(arr);
                                                }
                                            },
                                            onFinish: () => setChangingPassword(false),
                                        });
                                    }}
                                    className={btnCls}
                                >
                                    {changingPassword ? 'Changing...' : 'Change Password'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </ChatLayout>
        </>
    );
}