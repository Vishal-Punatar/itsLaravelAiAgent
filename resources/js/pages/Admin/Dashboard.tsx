import {
    Users,
    Bot,
    MessageSquare,
    BarChart3,
    ArrowLeft,
    Shield,
    Settings,
    Key,
    ChevronRight,
    Waves,
    Zap,
    Activity,
    TrendingUp,
    RefreshCw,
} from 'lucide-react';
import { Link } from '@inertiajs/react';

interface Stats {
    total_users: number;
    total_chats: number;
    total_messages: number;
    total_agents: number;
}

interface AdminDashboardProps {
    stats: Stats;
}

const statCards = [
    {
        label: 'Total Users',
        value: (props: Stats) => props.stats.total_users,
        icon: Users,
        gradient: 'from-violet-500 to-purple-600',
        glow: 'rgba(139, 92, 246, 0.2)',
        description: 'Registered accounts',
    },
    {
        label: 'Total Chats',
        value: (props: Stats) => props.stats.total_chats,
        icon: MessageSquare,
        gradient: 'from-emerald-500 to-teal-600',
        glow: 'rgba(16, 163, 127, 0.2)',
        description: 'Conversations started',
    },
    {
        label: 'Total Messages',
        value: (props: Stats) => props.stats.total_messages,
        icon: BarChart3,
        gradient: 'from-amber-500 to-orange-600',
        glow: 'rgba(245, 158, 11, 0.2)',
        description: 'Messages exchanged',
    },
    {
        label: 'AI Agents',
        value: (props: Stats) => props.stats.total_agents,
        icon: Bot,
        gradient: 'from-pink-500 to-rose-600',
        glow: 'rgba(236, 72, 153, 0.2)',
        description: 'Active agents',
    },
];

const navItems = [
    {
        label: 'Users',
        description: 'Manage accounts & permissions',
        href: '/admin/users',
        icon: Users,
        gradient: 'from-violet-500 to-purple-600',
        accent: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
    },
    {
        label: 'AI Providers',
        description: 'Configure API keys & defaults',
        href: '/admin/providers',
        icon: Key,
        gradient: 'from-emerald-500 to-teal-600',
        accent: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    },
    {
        label: 'Agent Settings',
        description: 'View agent configurations',
        href: '/admin/settings',
        icon: Settings,
        gradient: 'from-amber-500 to-orange-600',
        accent: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    },
];

export default function AdminDashboard({ stats }: AdminDashboardProps) {
    const props = { stats };

    return (
        <div className="min-h-screen bg-[var(--bg-app)]">
            {/* Top Navigation Bar */}
            <div className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <a
                            href="/chat"
                            className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Chat
                        </a>
                        <div className="w-px h-5 bg-[var(--border-color)]" />
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                <Shield className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-semibold text-[var(--text-primary)]">Admin Panel</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                {/* Page Title */}
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Overview of your ThinkChat application
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {statCards.map((card, i) => {
                        const Icon = card.icon;
                        return (
                            <div
                                key={i}
                                className="relative overflow-hidden rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] p-5 group hover:border-[var(--border-color)]/80 transition-all"
                            >
                                {/* Glow effect */}
                                <div
                                    className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                    style={{ background: card.glow }}
                                />

                                <div className="relative">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                            {card.label}
                                        </span>
                                        <div
                                            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg`}
                                        >
                                            <Icon className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                    <div className="text-3xl font-bold text-[var(--text-primary)] mb-1">
                                        {card.value(props).toLocaleString()}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                                        <span className="text-xs text-[var(--text-muted)]">{card.description}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent" />

                {/* Management Sections */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-4 h-4 text-violet-400" />
                        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Management</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {navItems.map((item, i) => {
                            const Icon = item.icon;
                            return (
                                <a
                                    key={i}
                                    href={item.href}
                                    className={`group relative flex items-center gap-4 p-4 rounded-2xl border ${item.accent} hover:scale-[1.02] transition-all duration-200`}
                                >
                                    <div
                                        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}
                                    >
                                        <Icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-[var(--text-primary)]">{item.label}</div>
                                        <div className="text-xs text-[var(--text-muted)] mt-0.5">{item.description}</div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                                </a>
                            );
                        })}
                    </div>
                </div>

                {/* Info Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Activity Summary */}
                    <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Activity className="w-4 h-4 text-rose-400" />
                            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Activity Summary</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-[var(--text-muted)]">Messages per Chat</span>
                                <span className="text-sm font-medium text-[var(--text-primary)]">
                                    {stats.total_chats > 0
                                        ? Math.round(stats.total_messages / stats.total_chats)
                                        : 0}
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full"
                                    style={{
                                        width: `${Math.min((stats.total_messages / (stats.total_users * 100)) * 100, 100)}%`,
                                    }}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-[var(--text-muted)]">Agents per User</span>
                                <span className="text-sm font-medium text-[var(--text-primary)]">
                                    {stats.total_users > 0
                                        ? (stats.total_agents / stats.total_users).toFixed(1)
                                        : '0.0'}
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full"
                                    style={{
                                        width: `${Math.min((stats.total_agents / (stats.total_users * 5)) * 100, 100)}%`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Platform Health */}
                    <div className="rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Waves className="w-4 h-4 text-blue-400" />
                            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Platform Health</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {/* Active Users 24h */}
                            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border border-emerald-500/15 hover:border-emerald-500/25 transition-all group">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                                        <Users className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">24h</span>
                                </div>
                                <div className="text-xl font-bold text-[var(--text-primary)] mb-0.5">
                                    {(stats as any).active_users_24h ?? 0}
                                </div>
                                <div className="text-[11px] text-[var(--text-muted)]">Active Users</div>
                            </div>

                            {/* Database */}
                            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/5 to-amber-500/10 border border-amber-500/15 hover:border-amber-500/25 transition-all group">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                                        <BarChart3 className="w-4 h-4 text-amber-400" />
                                    </div>
                                    <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Connected</span>
                                </div>
                                <div className="text-base font-bold text-[var(--text-primary)] mb-0.5">MySQL</div>
                                <div className="text-[11px] text-[var(--text-muted)]">Database</div>
                            </div>

                            {/* Most Used AI Agent */}
                            <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/5 to-violet-500/10 border border-violet-500/15 hover:border-violet-500/25 transition-all group">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
                                        <Bot className="w-4 h-4 text-violet-400" />
                                    </div>
                                    {(stats as any).top_agent ? (
                                        <div className="flex items-center gap-0.5 text-[10px] text-violet-400 font-semibold">
                                            <MessageSquare className="w-3 h-3" />
                                            {(stats as any).top_agent.message_count.toLocaleString()}
                                        </div>
                                    ) : null}
                                </div>
                                <div className="text-sm font-bold text-[var(--text-primary)] truncate mb-0.5">
                                    {(stats as any).top_agent?.name ?? '—'}
                                </div>
                                <div className="text-[11px] text-[var(--text-muted)]">Most Used Agent</div>
                            </div>

                            {/* ThinkChat's Default AI Provider */}
                            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/5 to-blue-500/10 border border-blue-500/15 hover:border-blue-500/25 transition-all group">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
                                        <Shield className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">ThinkChat's Default</span>
                                </div>
                                <div className="text-sm font-bold text-[var(--text-primary)] truncate mb-0.5">
                                    {(stats as any).default_provider?.name ?? "—"}
                                </div>
                                <div className={`text-[11px] truncate flex items-center gap-1 ${
                                    (stats as any).default_provider?.has_api_key
                                        ? 'text-emerald-400'
                                        : 'text-[var(--text-muted)]'
                                }`}>
                                    {(stats as any).default_provider
                                        ? ((stats as any).default_provider.has_api_key
                                            ? '✓ Configured'
                                            : 'Not configured')
                                        : 'No default set'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
