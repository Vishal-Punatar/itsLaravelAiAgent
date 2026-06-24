import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { ArrowRight, XCircle } from 'lucide-react';

// Hook to get current theme-aware logo
function useThemeLogo() {
    const [themeLogo, setThemeLogo] = useState('/build/assets/logo-brand.png');
    useEffect(() => {
        const updateLogo = () => {
            const theme = document.documentElement.getAttribute('data-theme');
            if (theme === 'light') {
                setThemeLogo('/build/assets/logo-brand-light.png');
            } else {
                setThemeLogo('/build/assets/logo-brand.png');
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

interface RegisterProps {
    errors?: Record<string, string>;
}

export default function Register({ errors = {} }: RegisterProps) {
    const themeLogo = useThemeLogo();
    const { data, setData, post, processing } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post('/register');
    }

    return (
        <>
            <Head title="Create Account — ThinkChat" />

            <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--theme-bg-app, #1a1a2e)' }}>
                <div className="fixed inset-0 pointer-events-none">
                    <div className="absolute top-[-20%] right-[10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px]" />
                    <div className="absolute bottom-[-10%] left-[10%] w-[400px] h-[400px] rounded-full bg-purple-600/8 blur-[120px]" />
                </div>

                <div className="relative w-full max-w-sm">
                    <div className="text-center mb-8">
                        <div class="flex items-center justify-center mb-2"><img src="/build/assets/logo-brand.png" alt="ThinkChat" className="w-24 h-24 rounded-2xl object-cover mb-2 shadow-lg shadow-violet-500/20" /></div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--theme-text-primary, #e0e0e0)' }}>Create your account</h1>
                        <p className="text-sm mt-1" style={{ color: 'var(--theme-text-muted, #888888)' }}>Join ThinkChat and start chatting with AI</p>
                    </div>

                    <div className="relative p-6 rounded-2xl shadow-xl" style={{ background: 'var(--theme-bg-card, #1a1a2e)', border: '1px solid var(--theme-border, #2d2d4a)' }}>
                        {Object.keys(errors).length > 0 && (
                            <div className="flex items-start gap-2 px-4 py-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <div>{Object.values(errors)[0]}</div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-text-muted, #888888)' }}>Full Name</label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={e => setData('name', e.target.value)}
                                    required
                                    autoComplete="name"
                                    placeholder="John Doe"
                                    className="w-full px-4 py-2.5 rounded-xl text-sm placeholder:text-zinc-600 focus:outline-none transition-all"
                                    style={{ background: 'var(--theme-bg-input, #252542)', border: '1px solid var(--theme-border, #2d2d4a)', color: 'var(--theme-text-primary, #e0e0e0)' }}
                                />
                            </div>

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
                                    minLength={8}
                                    autoComplete="new-password"
                                    placeholder="Min. 8 characters"
                                    className="w-full px-4 py-2.5 rounded-xl text-sm placeholder:text-zinc-600 focus:outline-none transition-all"
                                    style={{ background: 'var(--theme-bg-input, #252542)', border: '1px solid var(--theme-border, #2d2d4a)', color: 'var(--theme-text-primary, #e0e0e0)' }}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--theme-text-muted, #888888)' }}>Confirm Password</label>
                                <input
                                    type="password"
                                    value={data.password_confirmation}
                                    onChange={e => setData('password_confirmation', e.target.value)}
                                    required
                                    autoComplete="new-password"
                                    placeholder="Repeat password"
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
                                        Creating account...
                                    </>
                                ) : (
                                    <>Create Account <ArrowRight className="w-4 h-4" /></>
                                )}
                            </button>
                        </form>

                        <div className="mt-5 text-center">
                            <span className="text-xs" style={{ color: 'var(--theme-text-muted, #888888)' }}>Already have an account? </span>
                            <a href="/login" className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors">Sign in</a>
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
