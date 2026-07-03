import { Head, useForm, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import FlashBanner from '@/components/FlashBanner';

// Hook to get current theme-aware logo
function useThemeLogo() {
    const [themeLogo, setThemeLogo] = useState('/img/logo-brand.png');
    useEffect(() => {
        const updateLogo = () => {
            const theme = document.documentElement.getAttribute('data-theme');
            if (theme === 'light') {
                setThemeLogo('/img/logo-brand-light.png');
            } else {
                setThemeLogo('/img/logo-brand.png');
            }
        };
        updateLogo();
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', updateLogo);
        const observer = new MutationObserver(updateLogo);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => {
            mediaQuery.removeEventListener('change', updateLogo);
            observer.disconnect();
        };
    }, []);
    return themeLogo;
}

interface ResetPasswordProps {
    email?: string;
    token: string;
    errors?: Record<string, string>;
}

export default function ResetPassword({ email = '', token, errors = {} }: ResetPasswordProps) {
    const themeLogo = useThemeLogo();
    const { data, setData, post, processing } = useForm({
        token,
        email,
        password: '',
        password_confirmation: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    // Local toast override for non-validation errors.
    const [overrideFlash, setOverrideFlash] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setOverrideFlash(null);
        // Mismatch is handled by Laravel's `confirmed` rule on the backend
        // (see NewPasswordController::store). On mismatch the response is
        // 422 with `errors: { password: ['The password field confirmation
        // does not match.'] }` and the field-level error renders below
        // the input. No client-side check needed.
        post('/reset-password', {
            onSuccess: () => {
                // Server redirects to /chat with success flash; FlashBanner
                // reads it on the next page render.
            },
            onError: (errs) => {
                if (Object.keys(errs).length === 0) {
                    setOverrideFlash({ type: 'error', message: 'Could not reset password. Please try again.' });
                }
                // Field-level errors render inline below the inputs.
            },
        });
    }

    return (
        <>
            <Head title="Reset Password \u2014 ThinkChat" />

            <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--theme-bg-app, #1a1a2e)' }}>
                <div className="fixed inset-0 pointer-events-none">
                    <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] rounded-full bg-purple-600/8 blur-[120px]" />
                </div>

                <div className="relative w-full max-w-sm">
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center mb-2"><img src={themeLogo} alt="ThinkChat" className="w-24 h-24 rounded-2xl object-cover mb-2 shadow-lg shadow-violet-500/20" /></div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--theme-text-primary, #e0e0e0)' }}>Set a new password</h1>
                        <p className="text-sm mt-1" style={{ color: 'var(--theme-text-muted, #888888)' }}>
                            Choose a strong password you don&apos;t use anywhere else.
                        </p>
                    </div>

                    <FlashBanner variant="toast" override={overrideFlash} />

                    <div className="relative p-6 rounded-2xl shadow-xl" style={{ background: 'var(--theme-bg-card, #1a1a2e)', border: '1px solid var(--theme-border, #2d2d4a)' }}>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-text-muted, #888888)' }}>Email Address</label>
                                <input
                                    type="email"
                                    value={data.email}
                                    onChange={e => setData('email', e.target.value)}
                                    required
                                    autoComplete="email"
                                    readOnly={!!email}
                                    className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
                                    style={{
                                        background: 'var(--theme-bg-input, #252542)',
                                        border: '1px solid var(--theme-border, #2d2d4a)',
                                        color: 'var(--theme-text-primary, #e0e0e0)',
                                        cursor: email ? 'not-allowed' : 'text',
                                        opacity: email ? 0.7 : 1,
                                    }}
                                />
                                {errors.email && <p className="text-xs mt-1 text-red-400">{errors.email}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-text-muted, #888888)' }}>New Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={data.password}
                                        onChange={e => setData('password', e.target.value)}
                                        required
                                        autoFocus
                                        autoComplete="new-password"
                                        placeholder="At least 8 characters"
                                        className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm placeholder:text-zinc-600 focus:outline-none transition-all"
                                        style={{ background: 'var(--theme-bg-input, #252542)', border: '1px solid var(--theme-border, #2d2d4a)', color: 'var(--theme-text-primary, #e0e0e0)' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                                        style={{ color: 'var(--theme-text-muted, #888888)' }}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-xs mt-1 text-red-400">{errors.password}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-text-muted, #888888)' }}>Confirm New Password</label>
                                <div className="relative">
                                    <input
                                        type={showConfirm ? 'text' : 'password'}
                                        value={data.password_confirmation}
                                        onChange={e => setData('password_confirmation', e.target.value)}
                                        required
                                        autoComplete="new-password"
                                        placeholder="Repeat your password"
                                        className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm placeholder:text-zinc-600 focus:outline-none transition-all"
                                        style={{ background: 'var(--theme-bg-input, #252542)', border: '1px solid var(--theme-border, #2d2d4a)', color: 'var(--theme-text-primary, #e0e0e0)' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                                        style={{ color: 'var(--theme-text-muted, #888888)' }}
                                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                                    >
                                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                            >
                                {processing ? (
                                    <>
                                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                        </svg>
                                        Resetting password...
                                    </>
                                ) : (
                                    <>Reset Password <ArrowRight className="w-4 h-4" /></>
                                )}
                            </button>
                        </form>

                        <div className="mt-5 text-center">
                            <Link href="/login" className="inline-flex items-center gap-1 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors">
                                <ArrowLeft className="w-3 h-3" /> Back to sign in
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}