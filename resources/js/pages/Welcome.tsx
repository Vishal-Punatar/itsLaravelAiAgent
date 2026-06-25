import { Head, Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Bot, MessageSquare, Zap, Shield, Star, ArrowRight, CheckCircle2, Layers, Globe, Sun, Moon, Monitor } from 'lucide-react';

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
const heroFeatures = [
    { icon: Bot, label: 'AI Agents', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
    { icon: MessageSquare, label: 'Real-time Chat', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { icon: Layers, label: 'Multi-Provider', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { icon: Shield, label: 'Secure & Private', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
];
const features = [
    {
        icon: Bot,
        title: 'AI Agents',
        description: 'Build and deploy multiple AI agents tailored to your needs. Each agent can have its own personality, instructions, and AI provider.',
        gradient: 'from-violet-500 to-purple-600',
        glow: 'rgba(139, 92, 246, 0.15)',
    },
    {
        icon: MessageSquare,
        title: 'Conversations',
        description: 'Engage in rich, persistent conversations. Save, rename, and pin your most important chats for quick access anytime.',
        gradient: 'from-emerald-500 to-teal-600',
        glow: 'rgba(16, 185, 129, 0.15)',
    },
    {
        icon: Layers,
        title: 'Multi-Provider',
        description: 'Connect OpenAI, Anthropic, Google Gemini, and more. Switch between providers or let ThinkChat pick the best model for your task.',
        gradient: 'from-blue-500 to-cyan-600',
        glow: 'rgba(59, 130, 246, 0.15)',
    },
    {
        icon: Globe,
        title: 'Access Anywhere',
        description: 'ThinkChat is fully responsive. Chat with your AI agents from desktop, tablet, or mobile — anywhere, anytime.',
        gradient: 'from-rose-500 to-pink-600',
        glow: 'rgba(236, 72, 153, 0.15)',
    },
];
const steps = [
    { number: '01', title: 'Create your account', description: 'Sign up in seconds. No credit card required, no complicated setup.' },
    { number: '02', title: 'Connect an AI provider', description: 'Link your OpenAI, Anthropic, or other API key. ThinkChat supports all major providers.' },
    { number: '03', title: 'Start chatting', description: 'Create agents, pick a model, and start having meaningful AI conversations instantly.' },
];
export default function Welcome() {
    const [mounted, setMounted] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');
    const themeLogo = useThemeLogo();

    const applyTheme = (newTheme: string) => {
        const root = document.documentElement;
        const isDark = newTheme === 'dark' || (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        const effectiveTheme = isDark ? 'dark' : 'light';
        root.setAttribute('data-theme', effectiveTheme);
        root.classList.remove('light', 'dark');
        root.classList.add(effectiveTheme);
        document.body.classList.remove('light', 'dark');
        document.body.classList.add(effectiveTheme);
    };

    const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
        setTheme(newTheme);
        localStorage.setItem('app_theme', newTheme);
        applyTheme(newTheme);
        fetch('/profile/theme', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '' },
            body: JSON.stringify({ theme: newTheme })
        }).catch(console.error);
    };

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 100);
        const savedTheme = localStorage.getItem('app_theme') as 'light' | 'dark' | 'system' | null;
        if (savedTheme) {
            setTheme(savedTheme);
            applyTheme(savedTheme);
        }
        return () => clearTimeout(timer);
    }, []);
    return (
        <>
            <Head title="Welcome to ThinkChat" />
            <div className="min-h-screen theme-bg-app text-[var(--text-primary)] overflow-x-hidden">
                {/* Ambient background glows */}
                {theme !== 'light' && (
                    <div className="fixed inset-0 pointer-events-none">
                        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
                        <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] rounded-full bg-blue-600/8 blur-[120px]" />
                    </div>
                )}
                {/* Navbar */}
                <nav className="relative z-10 border-b theme-border bg-[var(--bg-secondary)] backdrop-blur-xl">
                    <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src={themeLogo} alt="ThinkChat" className="w-12 h-12 rounded-xl object-cover shadow-lg shadow-violet-500/20" />
                            <div className="flex flex-col">
                                <span className="text-lg font-bold theme-text-primary leading-none">ThinkChat</span>
                                <span className="text-[10px] text-[var(--accent-color)] font-medium leading-none mt-0.5">Where ideas meet instant answers</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 p-1 rounded-xl theme-bg-tertiary border theme-border">
                                <button
                                    onClick={() => handleThemeChange('light')}
                                    className={`p-1.5 rounded-lg transition-all ${theme === 'light' ? 'bg-[#667eea] text-white' : 'theme-text-muted hover:bg-[var(--accent-color)]/10 hover:theme-text-primary'}`}
                                    title="Light theme"
                                >
                                    <Sun className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleThemeChange('dark')}
                                    className={`p-1.5 rounded-lg transition-all ${theme === 'dark' ? 'bg-[#667eea] text-white' : 'theme-text-muted hover:bg-[var(--accent-color)]/10 hover:theme-text-primary'}`}
                                    title="Dark theme"
                                >
                                    <Moon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleThemeChange('system')}
                                    className={`p-1.5 rounded-lg transition-all ${theme === 'system' ? 'bg-[#667eea] text-white' : 'theme-text-muted hover:bg-[var(--accent-color)]/10 hover:theme-text-primary'}`}
                                    title="System theme"
                                >
                                    <Monitor className="w-4 h-4" />
                                </button>
                            </div>
                            <Link href="/login" className="px-4 py-2 rounded-xl text-sm font-medium theme-text-secondary hover:theme-text-primary hover:bg-[var(--bg-tertiary)] transition-all">
                                Sign In
                            </Link>
                            <Link href="/register" className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:opacity-90 transition-all">
                                Get Started
                            </Link>
                        </div>
                    </div>
                </nav>
                {/* Hero */}
                <section className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-24">
                    <div className={`text-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/20 mb-8">
                            <Zap className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                            <span className="text-xs font-medium text-[var(--accent-color)]">The modern AI chat platform</span>
                        </div>
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold theme-text-primary leading-[1.1] tracking-tight mb-6">
                            Chat with AI,
                            <br />
                            <span className="bg-gradient-to-r from-[#667eea] via-[#764ba2] to-[#3b82f6] bg-clip-text text-transparent">
                                Built for Humans
                            </span>
                        </h1>
                        <p className="text-lg theme-text-secondary max-w-2xl mx-auto leading-relaxed mb-10">
                            ThinkChat gives you powerful AI agents, multi-provider support, and a beautiful
                            chat experience — all in one place. No fluff, just conversations that matter.
                        </p>
                        {/* CTA */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                            <Link href="/register" className="flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:opacity-90 shadow-lg shadow-[#667eea]/20 transition-all duration-200">
                                Start Free — No Card Needed
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                            <Link href="/login" className="flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-medium theme-text-secondary border theme-border hover:bg-[var(--bg-tertiary)] transition-all">
                                Sign in to your account
                            </Link>
                        </div>
                        <div className="flex items-center justify-center gap-6 text-xs theme-text-muted">
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Free to start</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                <span>5-minute setup</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Your data stays private</span>
                            </div>
                        </div>
                    </div>
                    {/* Hero feature pills */}
                    <div className={`flex flex-wrap items-center justify-center gap-3 mt-16 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        {heroFeatures.map((f, i) => {
                            const Icon = f.icon;
                            return (
                                <div key={i} className={`flex items-center gap-2 px-4 py-2 rounded-full ${f.bg} border ${f.border} backdrop-blur-sm`}>
                                    <Icon className={`w-4 h-4 ${f.color}`} />
                                    <span className="text-xs font-medium theme-text-primary">{f.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </section>
                {/* Divider */}
                <div className="relative z-10 max-w-6xl mx-auto px-6">
                    <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent" />
                </div>
                {/* How it works */}
                <section className="relative z-10 max-w-6xl mx-auto px-6 py-20">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold theme-text-primary mb-3">Get started in minutes</h2>
                        <p className="theme-text-secondary text-sm">Three simple steps to your first AI conversation</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {steps.map((step, i) => (
                            <div key={i} className="relative p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all group">
                                <div className="text-5xl font-black theme-text-muted/10 mb-4 group-hover:text-[var(--accent-color)]/10 transition-colors">{step.number}</div>
                                <h3 className="text-base font-semibold theme-text-primary mb-2">{step.title}</h3>
                                <p className="text-sm theme-text-secondary leading-relaxed">{step.description}</p>
                            </div>
                        ))}
                    </div>
                </section>
                {/* Divider */}
                <div className="relative z-10 max-w-6xl mx-auto px-6">
                    <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent" />
                </div>
                {/* Features */}
                <section className="relative z-10 max-w-6xl mx-auto px-6 py-20">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold theme-text-primary mb-3">Everything you need for AI conversations</h2>
                        <p className="theme-text-secondary text-sm">Powerful features, beautifully designed</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {features.map((feature, i) => {
                            const Icon = feature.icon;
                            return (
                                <div key={i} className="group relative p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all overflow-hidden">
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(circle at 50% 0%, ${feature.glow}, transparent 70%)` }} />
                                    <div className="relative">
                                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg`}>
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                        <h3 className="text-base font-semibold theme-text-primary mb-2">{feature.title}</h3>
                                        <p className="text-sm theme-text-secondary leading-relaxed">{feature.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
                {/* Divider */}
                <div className="relative z-10 max-w-6xl mx-auto px-6">
                    <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent" />
                </div>
                {/* Final CTA */}
                <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
                    <div className="relative text-center p-12 rounded-3xl overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-purple-600/10" />
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15),transparent_70%)]" />
                        <div className="absolute inset-0 border border-violet-500/20 rounded-3xl" />
                        <div className="relative">
                            <div className="flex items-center justify-center gap-1 mb-4">
                                <Star className="w-5 h-5 text-violet-400" />
                                <Star className="w-5 h-5 text-violet-400" />
                                <Star className="w-5 h-5 text-violet-400" />
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to meet your AI agents?</h2>
                            <p className="text-zinc-400 text-sm mb-8 max-w-md mx-auto">
                                Join ThinkChat today and start having conversations that actually help. It takes less than 5 minutes to get started.
                            </p>
                            <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 hover:shadow-lg hover:shadow-violet-500/20 transition-all duration-200">
                                Create Free Account
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </section>
                {/* Footer */}
                <footer className="relative z-10 border-t border-white/5">
                    <div className="max-w-6xl mx-auto px-6 py-8">
                        <p className="text-xs theme-text-muted text-center">
                            &copy; {new Date().getFullYear()} ThinkChat. Powered by Laravel, React & Inertia.
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}
