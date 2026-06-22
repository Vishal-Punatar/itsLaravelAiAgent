import { useState, useEffect } from 'react';
import { Sun, Moon, Monitor, LogOut, Eye, EyeOff } from 'lucide-react';
import ChatLayout from '@/components/ChatLayout';
import { Head } from '@inertiajs/react';

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

const inputCls = 'w-full px-3 py-2 rounded-lg border-2 text-sm outline-none transition-colors theme-bg-input theme-border theme-text-primary focus:border-[#667eea]';
const labelCls = 'block text-xs mb-1 theme-text-secondary';
const btnCls = 'px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-xs font-medium hover:shadow-md hover:shadow-[rgba(102,126,234,0.3)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed';
const sectionCls = 'rounded-xl p-4 theme-bg-card border-0';

export default function ProfilePage({ agents, chats, user }: ProfilePageProps) {
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>((document.documentElement.getAttribute('data-theme') as 'light' | 'dark' | 'system') ?? user.theme ?? 'system');
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const csrf = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

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

        // Fire-and-forget save to server
        fetch('/profile/theme', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
            body: JSON.stringify({ theme: newTheme }),
        }).catch(() => {});
    };

    // Theme is applied by ChatLayout — do not apply here

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSuccessMessage('');
        setErrorMessage('');

        try {
            const response = await fetch('/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify({ name, email }),
            });
            const data = await response.json();
            if (response.ok) {
                setSuccessMessage(data.message || 'Profile updated successfully!');
            } else {
                setErrorMessage(data.error || 'Failed to update profile.');
            }
        } catch (error) {
            setErrorMessage('An error occurred. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch('/logout', { method: 'POST', headers: { 'X-CSRF-TOKEN': csrf() } });
            if (response.ok) window.location.href = '/login';
        } catch (error) { window.location.href = '/login'; }
    };

    const themeOptions: { value: 'light' | 'dark' | 'system'; label: string; Icon: typeof Sun }[] = [
        { value: 'light', label: 'Light', Icon: Sun },
        { value: 'dark', label: 'Dark', Icon: Moon },
        { value: 'system', label: 'System', Icon: Monitor },
    ];

    return (
        <>
            <Head title="Profile - ThinkChat" />
            <ChatLayout agents={agents} chats={chats} user={user} theme={theme}>
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

                        {/* Success/Error */}
                        {successMessage && (
                            <div className="p-2.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-xs">{successMessage}</div>
                        )}
                        {errorMessage && (
                            <div className="p-2.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs">{errorMessage}</div>
                        )}

                        {/* Theme + Logout (combined card) */}
                        <div className={sectionCls}>
                            <h2 className="text-sm font-semibold mb-2 theme-text-primary">Appearance</h2>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                <div className="flex gap-1 p-0.5 rounded-lg theme-bg-input flex-wrap">
                                    {themeOptions.map(({ value, label, Icon }) => (
                                        <button
                                            key={value}
                                            onClick={() => handleThemeChange(value)}
                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                                theme === value
                                                    ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white'
                                                    : 'theme-text-secondary theme-bg-hover'
                                            }`}
                                        >
                                            <Icon className="w-3.5 h-3.5" /> {label}
                                        </button>
                                    ))}
                                </div>
                                <form method="POST" action="/logout" onSubmit={handleLogout}>
                                    <button type="submit" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(231,76,60,0.15)] text-[#e74c3c] text-xs font-medium hover:bg-[rgba(231,76,60,0.25)] transition-colors">
                                        <LogOut className="w-3.5 h-3.5" /> Logout
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Update Profile */}
                        <form onSubmit={handleSaveProfile} className={sectionCls}>
                            <h2 className="text-sm font-semibold mb-2 theme-text-primary">Update Profile</h2>
                            <div className="space-y-3">
                                <div>
                                    <label className={labelCls}>Name</label>
                                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Email</label>
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
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
                                    <label className={labelCls}>Current Password</label>
                                    <div className="relative">
                                        <input
                                            type={showCurrentPassword ? 'text' : 'password'}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className={inputCls + ' pr-10'}
                                        />
                                        <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 theme-text-secondary">
                                            {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className={inputCls + ' pr-10'}
                                        />
                                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 theme-text-secondary">
                                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Confirm New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className={inputCls + ' pr-10'}
                                        />
                                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 theme-text-secondary">
                                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                                    onClick={async () => {
                                        if (newPassword !== confirmPassword) { setErrorMessage('Passwords do not match.'); return; }
                                        setChangingPassword(true);
                                        setErrorMessage('');
                                        try {
                                            const res = await fetch('/profile/password', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                                                body: JSON.stringify({ current_password: currentPassword, password: newPassword, password_confirmation: confirmPassword }),
                                            });
                                            const d = await res.json();
                                            if (res.ok) {
                                                setSuccessMessage('Password changed successfully!');
                                                setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
                                            } else { setErrorMessage(d.error || 'Failed to change password.'); }
                                        } catch { setErrorMessage('An error occurred.'); }
                                        finally { setChangingPassword(false); }
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
