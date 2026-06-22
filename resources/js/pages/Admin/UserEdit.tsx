import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Key, Save, Shield, User, CheckCircle2, XCircle } from 'lucide-react';

interface UserData {
    id: number;
    name: string;
    email: string;
    is_admin: boolean;
}

interface UserEditProps {
    user: UserData;
}

export default function UserEdit({ user }: UserEditProps) {
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [isAdmin, setIsAdmin] = useState(user.is_admin);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});
        setToast(null);

        const formData = new FormData();
        formData.append('_token', document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '');
        formData.append('_method', 'PUT');
        formData.append('name', name);
        formData.append('email', email);
        formData.append('is_admin', isAdmin ? '1' : '0');
        if (password) formData.append('password', password);

        fetch(`/admin/users/${user.id}`, {
            method: 'POST',
            body: formData,
        })
            .then((res) => {
                if (res.status === 422) {
                    // Validation errors — parse and show inline, no toast
                    return res.json().then((data) => ({ type: 'validation', data }));
                }
                return res.json().then((data) => ({ type: res.ok ? 'ok' : 'error', data }));
            })
            .then((result) => {
                if (result.type === 'validation') {
                    setErrors(result.data.errors || {});
                    setProcessing(false);
                } else if (result.type === 'ok') {
                    setToast({ type: 'success', message: result.data.message });
                    setTimeout(() => { window.location.href = '/admin/users'; }, 1500);
                } else {
                    setToast({ type: 'error', message: result.data.message || 'Something went wrong.' });
                    setProcessing(false);
                }
            })
            .catch(() => {
                setToast({ type: 'error', message: 'Something went wrong.' });
                setProcessing(false);
            });
    };

    return (
        <div className="p-6 space-y-6">
            {toast && (
                <div
                    className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium max-w-sm ${
                        toast.type === 'success'
                            ? 'bg-green-500/15 border-green-500/30 text-green-400'
                            : 'bg-red-500/15 border-red-500/30 text-red-400'
                    }`}
                >
                    {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
                    <span>{toast.message}</span>
                </div>
            )}

            <div className="flex items-center gap-4">
                <a href="/admin/users" className="p-2 rounded-lg hover:bg-[rgba(102,126,234,0.15)] transition-colors">
                    <ArrowLeft className="w-5 h-5 text-[#888]" />
                </a>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Edit User</h1>
                        <p className="text-xs text-[#666]">Update user account settings</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Name <span className="text-red-500">*</span></label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border-2 text-white text-sm placeholder:text-[#555] focus:outline-none focus:border-[#667eea] transition-colors ${errors.name ? 'border-red-500' : 'border-[var(--border-color)]'}`}
                        placeholder="Enter user name" />
                    {errors.name && <p className="text-xs text-[#e74c3c]">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Email <span className="text-red-500">*</span></label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border-2 text-white text-sm placeholder:text-[#555] focus:outline-none focus:border-[#667eea] transition-colors ${errors.email ? 'border-red-500' : 'border-[var(--border-color)]'}`}
                        placeholder="Enter email address" />
                    {errors.email && <p className="text-xs text-[#e74c3c]">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">New Password</label>
                    <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
                        <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                            className={`w-full pl-10 pr-10 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border-2 text-white text-sm placeholder:text-[#555] focus:outline-none focus:border-[#667eea] transition-colors ${errors.password ? 'border-red-500' : 'border-[var(--border-color)]'}`}
                            placeholder="Leave blank to keep current password" autoComplete="new-password" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-[#666] hover:text-white transition-colors" tabIndex={-1}>
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {errors.password && <p className="text-xs text-[#e74c3c]">{errors.password}</p>}
                    <p className="text-xs text-[#666]">Only fill this in if you want to reset the user's password.</p>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center flex-shrink-0">
                            <Shield className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">Administrator</p>
                            <p className="text-xs text-[#666]">Full access to all settings</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-[#2d2d4a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-[#667eea] peer-checked:to-[#764ba2]"></div>
                    </label>
                </div>

                <div className="flex items-center gap-3 pt-2">
                    <button type="submit" disabled={processing}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                        <Save className="w-4 h-4" /> Save Changes
                    </button>
                    <a href="/admin/users" className="px-5 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] text-sm hover:bg-[var(--bg-input)] transition-colors">
                        Cancel
                    </a>
                </div>
            </form>
        </div>
    );
}
