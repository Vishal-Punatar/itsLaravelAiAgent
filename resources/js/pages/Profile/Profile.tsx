import { useState, useEffect } from 'react';
import { Sun, Moon, Monitor, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import ChatLayout from '@/components/ChatLayout';
import { Head, router } from '@inertiajs/react';

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

interface ProfilePageProps {
    agents: Agent[];
    chats: Chat[];
    user: User;
}

interface Toast {
    id: number;
    type: 'success' | 'error';
    message: string;
}

const inputCls = 'w-full px-3 py-2 rounded-lg border-2 text-sm outline-none transition-colors theme-bg-input theme-border theme-text-primary focus:border-[#667eea]';
const labelCls = 'block text-xs mb-1 theme-text-secondary';
const btnCls = 'px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-xs font-medium hover:shadow-md hover:shadow-[rgba(102,126,234,0.3)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed';
const sectionCls = 'rounded-xl p-4 theme-bg-card border-0';

export default function ProfilePage({ agents, chats, user }: ProfilePageProps) {
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
    const [toasts, setToasts] = useState<Toast[]>([]);
    // Laravel returns validation errors as { field: [msg, msg, ...] } — store the full arrays
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const csrf = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

    // Toast helper — pushes a toast and auto-dismisses after the duration
    const showToast = (type: 'success' | 'error', message: string) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, type, message }]);
        const duration = type === 'error' ? 6000 : 4000;
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    };

    const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
        // Immediately apply theme to DOM so user sees the change right away
        const effective = newTheme === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : newTheme;
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        document.body.classList.remove('light', 'dark');
        root.classList.add(effective);
        document.body.classList.add(effective);
        root.setAttribute('data-theme', effective);
        // Update state — ChatLayout's useLayoutEffect applies the theme to DOM
        setTheme(newTheme);
        try { localStorage.setItem('app_theme', newTheme); } catch (e) {}

        // Notify other components (e.g. ChatLayout's header dropdown) so
        // their local `theme` state stays in sync without a full page refresh.
        try { window.dispatchEvent(new CustomEvent('app:theme-changed', { detail: newTheme })); } catch (e) {}

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

        try {
            const response = await fetch('/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify({ name, email }),
            });
            const data = await response.json().catch(() => ({}));
            if (response.ok) {
                showToast('success', data.message || 'Profile updated successfully!');
                setFieldErrors({});
            } else if (response.status === 422 && data.errors) {
                // Validation error → show ONLY under each specific field
                // (top-level `data.message` is redundant with `data.errors` field entries,
                //  so we deliberately skip the toast here — toast is for non-validation errors only)
                setFieldErrors(data.errors);
            } else {
                showToast('error', data.error || 'Failed to update profile.');
            }
        } catch (error) {
            showToast('error', 'An error occurred. Please try again.');
        } finally {
            setSaving(false);
        }
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
            <ChatLayout agents={agents} chats={chats} user={user} theme={theme}>
                {/* Toast Notifications — fixed top-right, z-50 above layout */}
                <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
                    {toasts.map((toast) => (
                        <div
                            key={toast.id}
                            className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium max-w-sm animate-slide-in ${
                                toast.type === 'success'
                                    ? 'border-[#5a5ec7] shadow-blue-900/30'
                                    : 'border-red-700 shadow-red-900/30'
                            }`}
                            style={{
                                // Inline styles to guarantee toast colors render correctly in both themes
                                // (no chance of CSS specificity or theme overrides interfering)
                                backgroundImage: toast.type === 'success'
                                    ? 'linear-gradient(to right, #667eea, #764ba2)'
                                    : 'none',
                                backgroundColor: toast.type === 'success' ? 'transparent' : '#dc2626', // red-600
                                color: '#000000',
                            }}
                        >
                            {toast.type === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                            ) : (
                                <XCircle className="w-4 h-4 flex-shrink-0" />
                            )}
                            <span>{toast.message}</span>
                        </div>
                    ))}
                </div>

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
                                    onClick={async () => {
                                        if (newPassword !== confirmPassword) { showToast('error', 'Passwords do not match.'); return; }
                                        setChangingPassword(true);
                                        setFieldErrors({});
                                        try {
                                            const res = await fetch('/profile/password', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': csrf() },
                                                body: JSON.stringify({ current_password: currentPassword, password: newPassword, password_confirmation: confirmPassword }),
                                            });
                                            const d = await res.json().catch(() => ({}));
                                            if (res.ok) {
                                                showToast('success', 'Password changed successfully!');
                                                setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
                                                setFieldErrors({});
                                            } else if (res.status === 422 && d.errors) {
                                                // Validation error → field-only, no toast (avoid redundancy)
                                                setFieldErrors(d.errors);
                                            } else {
                                                showToast('error', d.error || 'Failed to change password.');
                                            }
                                        } catch {
                                            showToast('error', 'An error occurred.');
                                        } finally {
                                            setChangingPassword(false);
                                        }
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