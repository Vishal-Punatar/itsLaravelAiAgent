import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Bot, Plus, Edit3, Trash2 } from 'lucide-react';
import ChatLayout from '@/components/ChatLayout';
import ProviderIcon, { getProviderGradient } from '@/components/ProviderIcon';
import FlashBanner from '@/components/FlashBanner';
import Pagination from '@/components/Pagination';
import PerPageSelector from '@/components/PerPageSelector';

interface Agent {
    id: number;
    name: string;
    provider: string;
    is_default: boolean;
}

interface PaginatedAgents {
    data: Agent[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface Chat {
    id: number;
    title: string;
    created_at: string;
    is_favourite?: boolean;
    is_pinned?: boolean;
    favourited_at?: string | null;
}

interface PaginatedChats {
    data: Chat[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    has_more: boolean;
    next_page_url: string | null;
}

interface User {
    id: number;
    name: string;
    email: string;
    is_admin: boolean;
    theme?: 'light' | 'dark' | 'system';
}

interface AdminDefaultProvider {
    provider: string;
    name: string;
    has_api_key: boolean;
}

interface AgentsPageProps {
    /** Full unpaginated agents list — used by ChatLayout (sidebar agent dropdown). */
    agents: Agent[];
    /** Paginated slice for the page body. */
    agentsPage: PaginatedAgents | Agent[];
    /** Sidebar: un-paginated favourites, full list. */
    favouriteChats?: Chat[];
    /** Sidebar: first page of non-favourite chats, with has_more + next_page_url. */
    allChatsPage?: PaginatedChats;
    /** Sidebar: top 4 chats by updated_at (dashboard grid). */
    recentChats?: Chat[];
    user: User;
    adminDefaultProvider?: AdminDefaultProvider | null;
    filters?: { per_page?: number };
}

export default function AgentsPage({ agents, agentsPage, favouriteChats, allChatsPage, recentChats, user, adminDefaultProvider, filters }: AgentsPageProps) {
    const isPaginated = !Array.isArray(agentsPage) && (agentsPage as PaginatedAgents)?.data !== undefined;
    const paginated = agentsPage as PaginatedAgents;
    const initialData = isPaginated ? paginated.data : (agentsPage as Agent[]);
    const initialLinks = isPaginated ? paginated.links : [];
    const initialTotal = isPaginated ? paginated.total : initialData.length;
    const initialPerPage = isPaginated
        ? paginated.per_page
        : (filters?.per_page ?? (initialData.length || 10));
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(
        (() => {
            try {
                const ls = localStorage.getItem('app_theme');
                if (ls === 'light' || ls === 'dark' || ls === 'system') return ls;
            } catch (e) {}
            return user.theme ?? 'system';
        })()
    );
    const [deleteMessage, setDeleteMessage] = useState<{text: string; type: 'success'|'error'}|null>(null);
    const [agentList, setAgentList] = useState<Agent[]>(initialData);

    const csrf = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

    const handleSetDefault = async (agentId: number) => {
        try {
            const response = await fetch(`/ai-agents/${agentId}/set-default`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
            });
            if (response.ok) {
                window.location.reload();
            } else {
                setDeleteMessage({ text: 'Failed to set default agent.', type: 'error' });
            }
        } catch (error) {
            setDeleteMessage({ text: 'Failed to set default agent.', type: 'error' });
        }
    };

    const handleDelete = async (agentId: number) => {
        if (!confirm('Are you sure you want to delete this agent?')) return;
        const agentName = agentList.find(a => a.id === agentId)?.name ?? 'Agent';
        try {
            const response = await fetch(`/ai-agents/${agentId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
            });
            // Treat 2xx, 301, 302, 303, 307, 308 as success (deletion succeeded even if server redirected)
            if (response.ok || response.redirected) {
                setAgentList(prev => prev.filter(a => a.id !== agentId));
                setDeleteMessage({ text: `"${agentName}" deleted successfully.`, type: 'success' });

                // Refresh the paginated agentsPage prop from server so
                // the total count + pagination links stay in sync.
                router.reload({ only: ['agentsPage'] });
            } else {
                setDeleteMessage({ text: 'Failed to delete agent.', type: 'error' });
            }
        } catch (error) {
            setDeleteMessage({ text: 'Failed to delete agent.', type: 'error' });
        }
    };

    // NOTE: We intentionally do NOT observe data-theme here. data-theme on <html>
    // is the RESOLVED 'light'/'dark' (set by the blade script and ChatLayout's
    // applyTheme), so an observer would overwrite the user's literal 'system'
    // selection with the resolved value. setTheme(newTheme) inside
    // handleThemeChange is the single source of truth for the picked value.

    // Auto-dismiss delete message after 3 seconds
    useEffect(() => {
        if (deleteMessage) {
            const timer = setTimeout(() => setDeleteMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [deleteMessage]);

    return (
        <ChatLayout
            agents={agents}
            favouriteChats={favouriteChats}
            allChats={allChatsPage?.data ?? []}
            hasMore={allChatsPage?.has_more ?? false}
            nextPageUrl={allChatsPage?.next_page_url ?? null}
            recentChats={recentChats}
            user={user}
            theme={theme}
            adminDefaultProvider={adminDefaultProvider}
        >
            {/* Single source of truth for response messages on this page.
                - Override fires for client-side actions like delete (fetch
                  follows the controller's 302 redirect and consumes the
                  server flash, so we render a toast from local state instead).
                - Without an override, FlashBanner reads page.props.flash
                  (set by the controller via Inertia::flash() — survives the
                  redirect for create/update because router.post/put preserves
                  Inertia session state). */}
            <FlashBanner variant="toast" override={deleteMessage ? { type: deleteMessage.type, message: deleteMessage.text } : null} />
            <div className="flex-1 overflow-y-auto p-4 md:p-5 theme-bg-app">
                <div className="max-w-4xl mx-auto">

                    {/* Page Header */}
                    <div className="rounded-xl p-3 mb-3 theme-bg-card theme-border">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center text-white flex-shrink-0">
                                    <Bot className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-base font-bold theme-text-primary truncate">AI Agents</h1>
                                    <p className="text-xs theme-text-muted">{initialTotal} configured</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <PerPageSelector
                                    value={initialPerPage}
                                    currentUrl="/ai-agents"
                                />
                                <a
                                    href="/ai-agents/create"
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-xs font-medium shadow-md shadow-[rgba(102,126,234,0.3)] hover:shadow-lg hover:-translate-y-0.5 transition-all"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Agent
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Agents List */}
                    {agentList.length === 0 ? (
                        <div className="rounded-xl p-8 text-center theme-bg-card theme-border">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center mx-auto mb-3">
                                <Bot className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-base font-semibold mb-1 theme-text-primary">No AI Agents Yet</h3>
                            <p className="text-xs mb-4 theme-text-muted">Add your first AI agent to start chatting.</p>
                            <a
                                href="/ai-agents/create"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-xs font-medium shadow-md shadow-[rgba(102,126,234,0.3)]"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Your First Agent
                            </a>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {agentList.map((agent) => (
                                <div
                                    key={agent.id}
                                    className="rounded-lg p-2.5 transition-all theme-bg-card theme-border"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <div className={`w-9 h-9 rounded-lg bg-gradient-to-r ${getProviderGradient(agent.provider)} flex items-center justify-center flex-shrink-0`}>
                                                <ProviderIcon provider={agent.provider} size={20} color="#ffffff" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <h3 className="text-sm font-semibold truncate theme-text-primary">{agent.name}</h3>
                                                    {agent.is_default && (
                                                        <span className="px-1.5 py-0.5 rounded-full bg-[rgba(39,174,96,0.2)] text-[#27ae60] text-[10px] font-medium flex-shrink-0">
                                                            Default
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs truncate theme-text-muted">
                                                    {agent.provider.charAt(0).toUpperCase() + agent.provider.slice(1)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {!agent.is_default && (
                                                <button
                                                    onClick={() => handleSetDefault(agent.id)}
                                                    className="px-2 py-1 rounded-md text-[11px] font-medium transition-colors theme-bg-hover theme-text-secondary"
                                                >
                                                    Set Default
                                                </button>
                                            )}
                                            <a
                                                href={`/ai-agents/${agent.id}/edit`}
                                                className="p-1.5 rounded-md transition-colors theme-bg-hover theme-text-muted"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </a>
                                            <button
                                                onClick={() => handleDelete(agent.id)}
                                                className="p-1.5 rounded-md transition-colors hover:bg-[rgba(231,76,60,0.15)] text-[#e74c3c]"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {initialLinks.length > 0 && (
                        <Pagination links={initialLinks} className="mt-3" />
                    )}
                </div>
            </div>
        </ChatLayout>
    );
}
