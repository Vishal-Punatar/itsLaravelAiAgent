import { useState, useEffect } from 'react';
import { Bot, Plus, Edit3, Trash2 } from 'lucide-react';
import ChatLayout from '@/components/ChatLayout';
import ProviderIcon, { getProviderGradient } from '@/components/ProviderIcon';
import FlashBanner from '@/components/FlashBanner';

interface Agent {
    id: number;
    name: string;
    provider: string;
    model: string | null;
    is_default: boolean;
}

interface Chat {
    id: number;
    title: string;
    created_at: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    is_admin: boolean;
    theme?: 'light' | 'dark' | 'system';
}

interface AgentsPageProps {
    agents: Agent[];
    chats: Chat[];
    user: User;
}

export default function AgentsPage({ agents, chats, user }: AgentsPageProps) {
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(user.theme ?? 'system');
    const [deleteMessage, setDeleteMessage] = useState<{text: string; type: 'success'|'error'}|null>(null);
    const [agentList, setAgentList] = useState(agents);

    const csrf = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

    const handleSetDefault = async (agentId: number) => {
        try {
            const response = await fetch(`/ai-agents/${agentId}/set-default`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
            });
            if (response.ok) window.location.reload();
        } catch (error) { console.error('Failed to set default:', error); }
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
            } else {
                setDeleteMessage({ text: 'Failed to delete agent.', type: 'error' });
            }
        } catch (error) {
            setDeleteMessage({ text: 'Failed to delete agent.', type: 'error' });
        }
    };

    // Theme is applied by ChatLayout — do not apply here

    // Auto-dismiss delete message after 3 seconds
    useEffect(() => {
        if (deleteMessage) {
            const timer = setTimeout(() => setDeleteMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [deleteMessage]);

    return (
        <ChatLayout agents={agents} chats={chats} user={user} theme={theme}>
            <div className="flex-1 overflow-y-auto p-4 md:p-5 theme-bg-app">
                <div className="max-w-4xl mx-auto">
                    {/* Flash message from controller (success/error on save) */}
                    <FlashBanner className="mb-3" />

                    {/* Delete success/error message */}
                    {deleteMessage && (
                        <div className={`mb-3 px-4 py-2.5 rounded-lg text-sm font-medium ${deleteMessage.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {deleteMessage.text}
                        </div>
                    )}

                    {/* Page Header */}
                    <div className="rounded-xl p-3 mb-3 theme-bg-card theme-border">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center text-white flex-shrink-0">
                                    <Bot className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-base font-bold theme-text-primary truncate">AI Agents</h1>
                                    <p className="text-xs theme-text-muted">{agentList.length} configured</p>
                                </div>
                            </div>
                            <a
                                href="/ai-agents/create"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-xs font-medium shadow-md shadow-[rgba(102,126,234,0.3)] hover:shadow-lg hover:-translate-y-0.5 transition-all flex-shrink-0"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Agent
                            </a>
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
                                                    {agent.model && ` • ${agent.model}`}
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
                </div>
            </div>
        </ChatLayout>
    );
}
