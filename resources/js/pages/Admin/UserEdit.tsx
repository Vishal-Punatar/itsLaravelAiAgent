import { useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Eye, EyeOff, Key, Save, Shield, User } from 'lucide-react';

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
    const { data, setData, put, processing, errors, transform, reset, recentlySuccessful } = useForm({
        name: user.name,
        email: user.email,
        is_admin: user.is_admin,
        password: '',
        password_confirmation: '',
    });

    // Local state for password visibility toggle. We do NOT store the actual
    // password in this state — only the "show" flag.
    const [showPassword, setShowPassword] = useState(false);
    const [passwordTouched, setPasswordTouched] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);

        // Inertia's useForm ignores the second arg to put() — it always sends
        // `data` from the form state. We use `transform()` to mutate the
        // payload synchronously: strip empty password fields so the server's
        // `nullable` rule is the single source of truth and the `confirmed`
        // rule never runs against blank fields.
        if (!data.password || data.password.length === 0) {
            transform((payload) => {
                const { password, password_confirmation, ...rest } = payload as Record<string, unknown>;
                return rest;
            });
        }

        put(`/admin/users/${user.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                // After a successful update, clear the password fields so the
                // next edit doesn't accidentally submit a stale value.
                setData('password', '');
                setData('password_confirmation', '');
                setPasswordTouched(false);
            },
            onError: (errs) => {
                // Inertia also populates `errors` automatically; this is just
                // a belt-and-braces fallback in case the server returns a
                // non-field error.
                if (errs && Object.keys(errs).length > 0) {
                    setSubmitError('Please fix the highlighted fields.');
                }
            },
        });
    };

    const passwordError = errors.password;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/admin/users" className="p-2 rounded-lg hover:bg-[rgba(102,126,234,0.15)] transition-colors">
                    <ArrowLeft className="w-5 h-5 text-[#888]" />
                </Link>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Edit User</h1>
                        <p className="text-xs text-[#666]">{user.email}</p>
                    </div>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
                {/* Top-of-form error summary: surfaces server-side validation
                    errors that aren't tied to a single field, and gives the
                    user an obvious signal that something went wrong. */}
                {Object.keys(errors).length > 0 && (
                    <div className="rounded-xl border border-[#e74c3c]/40 bg-[#e74c3c]/10 px-4 py-3 text-xs text-[#e74c3c] space-y-1">
                        <p className="font-semibold">Please fix the following:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                            {Object.entries(errors).map(([field, msgs]) => {
                                const list = Array.isArray(msgs) ? msgs : [msgs];
                                return (
                                    <li key={field}>
                                        <span className="font-medium">{field}:</span> {list.join(', ')}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
                {submitError && Object.keys(errors).length === 0 && (
                    <div className="rounded-xl border border-[#e74c3c]/40 bg-[#e74c3c]/10 px-4 py-3 text-xs text-[#e74c3c]">
                        {submitError}
                    </div>
                )}
                {recentlySuccessful && (
                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-400">
                        User updated successfully.
                    </div>
                )}
                {/* Name */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Name <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] text-white text-sm placeholder:text-[#555] focus:outline-none focus:border-[#667eea] transition-colors"
                        placeholder="Enter user name"
                    />
                    {errors.name && <p className="text-xs text-[#e74c3c]">{errors.name}</p>}
                </div>

                {/* Email */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Email <span className="text-red-500">*</span></label>
                    <input
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] text-white text-sm placeholder:text-[#555] focus:outline-none focus:border-[#667eea] transition-colors"
                        placeholder="Enter email address"
                    />
                    {errors.email && <p className="text-xs text-[#e74c3c]">{errors.email}</p>}
                </div>

                {/* Password (admin reset) */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">
                        New Password
                    </label>
                    <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={data.password}
                            onChange={(e) => {
                                setPasswordTouched(true);
                                setData('password', e.target.value);
                            }}
                            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] text-white text-sm placeholder:text-[#555] focus:outline-none focus:border-[#667eea] transition-colors"
                            placeholder="Leave blank to keep current password"
                            autoComplete="new-password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-[#666] hover:text-white transition-colors"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {passwordError && (
                        <p className="text-xs text-[#e74c3c]">{passwordError}</p>
                    )}
                    <p className="text-xs text-[#666]">
                        Only fill this in if you want to reset the user's password. Minimum 8 characters.
                    </p>
                </div>

                {/* Password confirmation (only shown if user started typing a new password) */}
                {passwordTouched && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--text-secondary)]">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] text-white text-sm placeholder:text-[#555] focus:outline-none focus:border-[#667eea] transition-colors"
                                placeholder="Re-enter the new password"
                                autoComplete="new-password"
                            />
                        </div>
                        {errors.password_confirmation && (
                            <p className="text-xs text-[#e74c3c]">{errors.password_confirmation}</p>
                        )}
                    </div>
                )}

                {/* Admin Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-[#e74c3c] to-[#c0392b] flex items-center justify-center">
                            <Shield className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <div className="text-sm font-medium text-white">Admin Privileges</div>
                            <div className="text-xs text-[#666]">Can access admin dashboard</div>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={data.is_admin}
                            onChange={(e) => setData('is_admin', e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-[#2d2d4a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-[#667eea] peer-checked:to-[#764ba2]"></div>
                    </label>
                </div>

                {/* Submit */}
                <div className="flex items-center gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={processing}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-medium text-sm shadow-lg shadow-[rgba(102,126,234,0.3)] hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" /> Save Changes
                    </button>
                    <Link href="/admin/users" className="px-5 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] text-sm hover:bg-[var(--bg-input)] transition-colors">
                        Cancel
                    </Link>
                </div>
            </form>
        </div>
    );
}
