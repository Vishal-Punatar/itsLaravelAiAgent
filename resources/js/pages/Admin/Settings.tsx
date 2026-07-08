import { Bot, Key, User, ArrowLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import Pagination from '@/components/Pagination';
import PerPageSelector from '@/components/PerPageSelector';

interface AgentData {
    id: number;
    name: string;
    provider: string;
    user: {
        id: number;
        name: string;
        email: string;
    };
    created_at: string;
}

interface PaginatedAgents {
    data: AgentData[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface ProviderOption {
    value: string;
    label: string;
}

interface AdminSettingsProps {
    agents: PaginatedAgents | AgentData[];
    filters?: { per_page?: number };
    availableProviders?: ProviderOption[];
}

export default function AdminSettings({ agents, filters, availableProviders = [] }: AdminSettingsProps) {
    const isPaginated = !Array.isArray(agents) && (agents as PaginatedAgents)?.data !== undefined;
    const paginated = agents as PaginatedAgents;
    const dataList = isPaginated ? paginated.data : (agents as AgentData[]);
    const linkList = isPaginated ? paginated.links : [];
    const total = isPaginated ? paginated.total : dataList.length;
    const perPage = isPaginated
        ? paginated.per_page
        : (filters?.per_page ?? (dataList.length || 10));

    // Provider filter — CLIENT-SIDE ONLY.
    //
    // Sits purely in local component state so a hard refresh resets it
    // back to "All providers" (per Vishal's request, matching /admin/users).
    // Filtering happens against the currently-loaded page slice; for the
    // current 13-agent dataset that's fine.
    const [provider, setProvider] = useState<string>('');

    const filteredDataList = useMemo(() => {
        if (!provider) return dataList;
        return dataList.filter((a) => a.provider === provider);
    }, [dataList, provider]);

    const hasActiveFilter = provider !== '';

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <a href="/admin" className="p-2 rounded-lg hover:bg-[rgba(102,126,234,0.15)] transition-colors">
                        <ArrowLeft className="w-5 h-5 text-[#888]" />
                    </a>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center">
                        <Key className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">AI Agent Settings</h1>
                        <p className="text-xs text-[#666]">{total} total agents</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <PerPageSelector
                        value={perPage}
                        currentUrl="/admin/settings"
                    />
                </div>
            </div>

            {/* Filter bar — provider dropdown + matches count + clear.
                Right-aligned (justify-end) so the per-page selector and the
                filter cluster both sit on the right side of the page,
                matching the layout on /admin/users. */}
            <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3 flex flex-wrap items-center justify-end gap-3">
                <div className="relative">
                    <select
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        aria-label="Filter by provider"
                        className="h-9 pl-3 pr-8 rounded-lg text-xs appearance-none cursor-pointer bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[#667eea] focus:ring-2 focus:ring-[#667eea]/30 capitalize"
                    >
                        <option value="">All providers</option>
                        {availableProviders.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888] text-[10px]">▾</span>
                </div>
                {hasActiveFilter && (
                    <span className="text-xs text-[#666]">
                        {filteredDataList.length} match{filteredDataList.length === 1 ? '' : 'es'}
                    </span>
                )}
            </div>

            {/* Agents Table */}
            <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[var(--border-color)]">
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Agent</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Provider</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Owner</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2d2d4a]">
                            {filteredDataList.map((agent) => (
                                <tr key={agent.id} className="hover:bg-[rgba(102,126,234,0.05)] transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center">
                                                <Bot className="w-4 h-4 text-white" />
                                            </div>
                                            <span className="text-sm font-medium text-white">{agent.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-[rgba(102,126,234,0.2)] text-[#667eea] capitalize">
                                            {agent.provider}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <User className="w-3.5 h-3.5 text-[#555]" />
                                            <span className="text-sm text-[var(--text-secondary)]">{agent.user.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-[#888]">{formatDate(agent.created_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {linkList.length > 0 && (
                <Pagination links={linkList} className="mt-3" />
            )}
        </div>
    );
}