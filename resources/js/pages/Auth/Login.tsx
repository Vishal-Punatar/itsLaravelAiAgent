import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { ArrowRight, XCircle } from 'lucide-react';

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

interface LoginProps {
    errors?: Record<string, string>;
    flash?: { error?: string; success?: string };
}

export default function Login({ errors = {}, flash = {} }: LoginProps) {
    const themeLogo = useThemeLogo();
    const { data, setData, post, processing } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post('/login', {
            onFinish: () => setData('password', ''),
        });
    }

    return (
        <>
            <Head title="Sign In — ThinkChat" />

            <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--theme-bg-app, #1a1a2e)' }}>
                <div className="fixed inset-0 pointer-events-none">
                    <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] rounded-full bg-purple-600/8 blur-[120px]" />
                </div>

                <div className="relative w-full max-w-sm">
                    <div className="text-center mb-8">
                        <div class="flex items-center justify-center mb-2"><img src={themeLogo} alt="ThinkChat" className="w-24 h-24 rounded-2xl object-cover mb-2 shadow-lg shadow-violet-500/20" /></div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--theme-text-primary, #e0e0e0)' }}>Welcome back</h1>
                        <p className="text-sm mt-1" style={{ color: 'var(--theme-text-muted, #888888)' }}>Sign in to your ThinkChat account</p>
                    </div>

                    <div className="relative p-6 rounded-2xl shadow-xl" style={{ background: 'var(--theme-bg-card, #1a1a2e)', border: '1px solid var(--theme-border, #2d2d4a)' }}>
                        {flash?.error && (
                            <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                <XCircle className="w-4 h-4 flex-shrink-0" />
                                {flash.error}
                            </div>
                        )}

                        {Object.keys(errors).length > 0 && (
                            <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                <XCircle className="w-4 h-4 flex-shrink-0" />
                                {Object.values(errors)[0]}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-text-muted, #888888)' }}>Email Address</label>
                                <input
                                    type="email"
                                    value={data.email}
                                    onChange={e => setData('email', e.target.value)}
                                    required
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    className="w-full px-4 py-2.5 rounded-xl text-sm placeholder:text-zinc-600 focus:outline-none transition-all"
                                    style={{ background: 'var(--theme-bg-input, #252542)', border: '1px solid var(--theme-border, #2d2d4a)', color: 'var(--theme-text-primary, #e0e0e0)' }}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-text-muted, #888888)' }}>Password</label>
                                <input
                                    type="password"
                                    value={data.password}
                                    onChange={e => setData('password', e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    className="w-full px-4 py-2.5 rounded-xl text-sm placeholder:text-zinc-600 focus:outline-none transition-all"
                                    style={{ background: 'var(--theme-bg-input, #252542)', border: '1px solid var(--theme-border, #2d2d4a)', color: 'var(--theme-text-primary, #e0e0e0)' }}
                                />
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
                                        Signing in...
                                    </>
                                ) : (
                                    <>Sign In <ArrowRight className="w-4 h-4" /></>
                                )}
                            </button>
                        </form>

                        <div className="mt-5 text-center">
                            <span className="text-xs" style={{ color: 'var(--theme-text-muted, #888888)' }}>Don&apos;t have an account? </span>
                            <a href="/register" className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors">Create one</a>
                        </div>
                    </div>

                    <div className="mt-4 text-center">
                        <a href="/" className="text-xs" style={{ color: 'var(--theme-text-muted, #888888)' }}>← Back to ThinkChat</a>
                    </div>
                </div>
            </div>
        </>
    );
}
