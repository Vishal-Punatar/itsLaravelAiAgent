import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Key, Save, Shield, User, XCircle, X, Trash2 } from 'lucide-react';

interface UserData {
    id: number;
    name: string;
    email: string;
    is_admin: boolean;
}

interface UserEditProps {
    user: UserData;
    onSave: (updated: UserData) => void;
    onCancel: () => void;
}

export default function UserEditForm({ user, onSave, onCancel }: UserEditProps) {
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [isAdmin, setIsAdmin] = useState(user.is_admin);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});

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
                    return res.json().then((data) => ({ type: 'validation', data }));
                }
                return res.json().then((data) => ({ type: res.ok ? 'ok' : 'error', data }));
            })
            .then((result) => {
                if (result.type === 'validation') {
                    setErrors(result.data.errors || {});
                    setProcessing(false);
                } else if (result.type === 'ok') {
                    onSave({ ...user, name, email, is_admin: isAdmin });
                } else {
                    setErrors({ _form: result.data.message || 'Something went wrong.' });
                    setProcessing(false);
                }
            })
            .catch(() => {
                setErrors({ _form: 'Something went wrong.' });
                setProcessing(false);
            });
    };

    return (
        <div className="relative w-full max-w-md rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-white">Edit User</h2>
                        <p className="text-xs text-[#666]">Update account settings</p>
                    </div>
                </div>
                <button
                    onClick={onCancel}
                    className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors text-[#666] hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-5">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--text-secondary)]">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border text-white text-sm placeholder:text-[#555] focus:outline-none focus:border-[#667eea] transition-colors ${
                                errors.name ? 'border-red-500' : 'border-[var(--border-color)]'
                            }`}
                            placeholder="Enter user name"
                        />
                        {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--text-secondary)]">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border text-white text-sm placeholder:text-[#555] focus:outline-none focus:border-[#667eea] transition-colors ${
                                errors.email ? 'border-red-500' : 'border-[var(--border-color)]'
                            }`}
                            placeholder="Enter email address"
                        />
                        {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--text-secondary)]">New Password</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666] pointer-events-none" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Leave blank to keep current password"
                                className={`w-full pl-10 pr-16 py-3 rounded-xl bg-[var(--bg-tertiary)] border text-white text-sm placeholder:text-[#555] focus:outline-none focus:border-[#667eea] transition-colors ${
                                    errors.password ? 'border-red-500' : 'border-[var(--border-color)]'
                                }`}
                                autoComplete="new-password"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="p-1.5 rounded-lg text-[#666] hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                                    title={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                {password !== '' && (
                                    <button
                                        type="button"
                                        onClick={() => setPassword('')}
                                        className="p-1.5 rounded-lg text-[#666] hover:text-red-400 hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                                        title="Clear password"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                        {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
                        <p className="text-xs text-[#666]">Only fill this in if you want to reset the user's password.</p>
                    </div>

                    {/* Admin Role */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--text-secondary)]">Role</label>
                        <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isAdmin ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2]' : 'bg-[var(--bg-secondary)] border border-[var(--border-color)]'}`}>
                                    <Shield className={`w-4 h-4 ${isAdmin ? 'text-white' : 'text-[#666]'}`} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">{isAdmin ? 'Admin' : 'Regular User'}</p>
                                    <p className="text-xs text-[#666]">{isAdmin ? 'Full access to all settings and features' : 'Standard access — no admin panel'}</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isAdmin}
                                    onChange={(e) => setIsAdmin(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-[#2d2d4a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-[#667eea] peer-checked:to-[#764ba2]"></div>
                            </label>
                        </div>
                    </div>

                    {/* Form-level error */}
                    {errors._form && (
                        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                            {errors._form}
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center gap-3 px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-tertiary)]">
                    <button
                        type="submit"
                        disabled={processing}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {processing ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-5 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] text-sm hover:bg-[var(--bg-hover)] transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
