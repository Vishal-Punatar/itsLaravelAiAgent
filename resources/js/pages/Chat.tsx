import { useState, useEffect, useRef, useMemo } from 'react';
import { Bot, Sparkles, Zap, MessageSquare, Star } from 'lucide-react';
import ChatLayout, { AgentSelector, ModelSelector, ChatInput, MessageBubble, TypingIndicator, Lightbox } from '@/components/ChatLayout';
import ProviderIcon, { getProviderGradient } from '@/components/ProviderIcon';

// Returns BOTH logo variants. The visible one is chosen by CSS via the
// [data-theme] attribute on <html> — see .theme-logo-stack in app.css. This
// avoids a JS-driven <img src=...> swap (which pops instantly, no transition)
// and avoids a MutationObserver cycle on data-theme (which scheduled an extra
// React render and made the logo flip before the rest of the UI). Result:
// the logo crossfades in the SAME paint as every other theme-driven element.
function useThemeLogo() {
    return {
        logoDark: '/img/logo-brand.png',
        logoLight: '/img/logo-brand-light.png',
    };
}

interface Agent {
    id: number;
    name: string;
    provider: string;
    is_default: boolean;
    has_api_key?: boolean;
    is_admin_default?: boolean;
}

interface AdminDefaultProvider {
    provider: string;
    name: string;
    has_api_key: boolean;
}

interface Attachment {
    name: string;
    path: string;
    mime: string;
    size: number;
}

interface Message {
    id?: number;
    role: 'user' | 'assistant';
    message: string;
    attachments?: Attachment[] | null;
    created_at?: string;
}

interface Chat {
    id: number;
    title: string;
    messages: Message[];
    created_at: string;
    updated_at?: string;
    is_pinned?: boolean;
    is_favourite?: boolean;
    favourited_at?: string | null;
}

interface ChatPageProps {
    agents: Agent[];
    chats: Chat[];
    chat?: Chat;
    user?: {
        id?: number;
        is_admin: boolean;
        theme?: 'light' | 'dark' | 'system';
    };
    userHasAgents?: boolean;
    adminDefaultProvider?: AdminDefaultProvider | null;
}

export default function ChatPage({ agents, chats, chat, user, userHasAgents, adminDefaultProvider }: ChatPageProps) {
    const { logoDark, logoLight } = useThemeLogo();
    const [message, setMessage] = useState('');
    const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
    // Initialize selected agent - prefer user's default agent, then admin default, else null
    const initialAgent = agents.find(a => a.is_default) || agents[0] || null;
    const adminDefaultAgent: Agent | null = adminDefaultProvider ? {
        id: -1,
        name: adminDefaultProvider.name,
        provider: adminDefaultProvider.provider,
        is_default: false,
        has_api_key: adminDefaultProvider.has_api_key,
        is_admin_default: true,
    } : null;
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(
        initialAgent || adminDefaultAgent || null
    );
    // Runtime-only model selection. NEVER persisted — ModelSelector will populate
    // this via onSelectModel when an agent is chosen (server returns its preferred).
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [localMessages, setLocalMessages] = useState<Message[]>(chat?.messages || []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showTyping, setShowTyping] = useState(false);
    const [theme, setTheme] = useState((): 'light' | 'dark' | 'system' => {
        // Read from body's class (set by blade template / applyTheme) — this is the most reliable source
        if (document.body.classList.contains('light')) return 'light';
        if (document.body.classList.contains('dark')) return 'dark';
        // Fallback to page props or data-theme attribute
        return (user?.theme as 'light' | 'dark' | 'system') ?? document.documentElement.getAttribute('data-theme') as 'light' | 'dark' | 'system' ?? 'system';
    });
    const [attachments, setAttachments] = useState<File[]>([]);
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);
    // Sync theme state with other components via the `app:theme-changed` event.
    // We intentionally do NOT observe <body class> here: ChatLayout's
    // applyTheme() adds .light/.dark to <body> synchronously inside
    // handleThemeChange — a MutationObserver on body would fire from that
    // microtask and schedule an extra setTheme commit, breaking the atomic
    // single-paint transition. The window event below is fired after React's
    // flushSync commit, so we update in lock-step with the visual change.
    useEffect(() => {
        function onThemeChanged(e: Event) {
            const ce = e as CustomEvent<'light' | 'dark' | 'system'>;
            const next = ce.detail;
            if (next === 'light' || next === 'dark' || next === 'system') {
                setTheme(next);
            }
        }
        window.addEventListener('app:theme-changed', onThemeChanged);
        return () => window.removeEventListener('app:theme-changed', onThemeChanged);
    }, []);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const agentSelectorRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // Close agent dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
        if (!agentDropdownOpen) return;
        if (agentSelectorRef.current && !agentSelectorRef.current.contains(event.target as Node)) {
            setAgentDropdownOpen(false);
        }
    };
    
    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [handleClickOutside]);

    useEffect(() => {
        if (chat?.messages) {
            setLocalMessages(chat.messages);
        } else {
            setLocalMessages([]);
        }
    }, [chat]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [localMessages, showTyping]);

    // Handle scroll to show/hide scroll-to-bottom button
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            // Show button if user has scrolled up more than 100px from the bottom
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
            setShowScrollButton(distanceFromBottom > 100);
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Handle paste events for clipboard images
    useEffect(() => {
        function handlePaste(e: ClipboardEvent) {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
                if (item.type && item.type.startsWith('image/')) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file) {
                        handleAttach([file]);
                    }
                    return;
                }
            }
        }
        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, []);

    const handleAgentSelect = (agent: Agent) => {
        setSelectedAgent(agent);
        // Clearing model — ModelSelector will repopulate it once the new agent's
        // live model list is fetched. Prevents using the previous agent's model.
        setSelectedModel('');
        setAgentDropdownOpen(false);
    };

    const handleAttach = (files: File[]) => {
        setAttachments(prev => [...prev, ...files]);
    };

    const handleRemoveAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if ((!message.trim() && attachments.length === 0) || isSubmitting || !selectedAgent) return;
        // Block submit if no model is selected yet (in-flight fetch / fetch failed).
        if (!selectedModel) {
            console.warn('Submit blocked: no model selected yet');
            return;
        }


        // Build attachment data with object URLs for immediate preview
        const attachmentData: Attachment[] = attachments.map((file) => ({
            name: file.name,
            path: URL.createObjectURL(file), // local preview URL
            mime: file.type,
            size: file.size,
        }));

        const userMessage: Message = {
            role: 'user',
            message: message.trim(),
            attachments: attachmentData,
            created_at: new Date().toISOString(),
        };

        setLocalMessages((prev) => [...prev, userMessage]);
        setMessage('');
        setAttachments([]);
        setShowTyping(true);
        setIsSubmitting(true);

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const url = chat ? `/chat/${chat.id}` : '/chat';

            const formData = new FormData();
            formData.append('_token', csrfToken);
            formData.append('message', userMessage.message);
            // If using admin default (id=-1), send null so backend uses its fallback logic
            console.log('DEBUG submit', { selectedAgent, selectedModel, isAdminDefault: selectedAgent?.is_admin_default, agentIdToSend: selectedAgent?.is_admin_default ? '' : String(selectedAgent?.id) });
            const agentIdToSend = selectedAgent?.is_admin_default ? '' : String(selectedAgent?.id);
            formData.append('agent_id', agentIdToSend);
            // Runtime-only model selection — NEVER persisted on ai_agents.
            formData.append('model_id', selectedModel);

            // Add attachments
            attachments.forEach((file, index) => {
                formData.append(`attachments[${index}]`, file);
            });

            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });

            if (response.ok || response.redirected) {
                window.location.href = response.url || window.location.href;
            } else {
                throw new Error('Failed');
            }
        } catch {
            setShowTyping(false);
            setIsSubmitting(false);
            alert('Failed to send message.');
        }
    };

    const chatContent = (
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto pt-2 pb-2 sm:pt-4 sm:pb-4 md:pt-6 md:pb-6 flex flex-col gap-4 theme-bg-app">
            {localMessages.length === 0 ? (
                <ChatWelcome
                    theme={theme}
                    logoDark={logoDark}
                    logoLight={logoLight}
                    chats={chats}
                    agents={agents}
                    adminDefaultProvider={adminDefaultProvider}
                    selectedAgent={selectedAgent}
                    setSelectedAgent={handleAgentSelect}
                    selectedModel={selectedModel}
                    user={user}
                />
            ) : (
                <>
                    {localMessages.map((msg, index) => (
                        <MessageBubble key={index} message={msg} userId={user?.id} onImageClick={setLightboxSrc} />
                    ))}
                    {showTyping && <TypingIndicator />}
                    <div ref={messagesEndRef} />

                    {/* Scroll to Bottom Button */}
                    {showScrollButton && (
                        <button
                            onClick={scrollToBottom}
                            className={`fixed bottom-24 right-6 flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition-all duration-200 z-40
                                ${theme === 'light' ? 'bg-white border border-gray-200 hover:bg-gray-50' : 'bg-[#252542] hover:bg-[var(--border-color)]'}
                                animate-bounce-subtle`}
                            title="Scroll to bottom"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme === 'light' ? '#374151' : '#ffffff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 5v14M19 12l-7 7-7-7"/>
                            </svg>
                        </button>
                    )}
                </>
            )}
        </div>
    );

    // Theme is applied synchronously by ChatLayout — no MutationObserver needed

    // When user has no agents, they're shown the admin default — use that as selected
    const effectiveHasAgents = userHasAgents !== undefined ? userHasAgents : agents.length > 0;

    // Show the admin default info when user has no agents
    const usingAdminDefault = !effectiveHasAgents && adminDefaultProvider;

    // One single unified section: chat + agent selector + chat input
    const combinedArea = (
        <div className="flex-1 flex flex-col min-h-0">
            {chatContent}
            {effectiveHasAgents ? (
                <div ref={agentSelectorRef} className="flex-shrink-0 flex flex-col sm:flex-row sm:items-end gap-2 px-3 sm:px-4 pb-3 sm:pb-4 mx-auto w-full max-w-[1100px]">
                    <div className="flex flex-row items-end gap-2 w-full sm:w-auto sm:flex-shrink-0">
                        <AgentSelector
                            agents={agents}
                            selectedAgent={selectedAgent}
                            onSelectAgent={handleAgentSelect}
                            isOpen={agentDropdownOpen}
                            onToggle={() => setAgentDropdownOpen(!agentDropdownOpen)}
                            theme={theme}
                            adminDefaultProvider={adminDefaultProvider}
                            userHasAgents={effectiveHasAgents}
                        />
                        <ModelSelector
                            selectedAgent={selectedAgent}
                            selectedModel={selectedModel}
                            onSelectModel={setSelectedModel}
                            theme={theme}
                        />
                    </div>
                    <ChatInput
                        value={message}
                        onChange={setMessage}
                        onSubmit={handleSubmit}
                        disabled={isSubmitting || !selectedAgent || !selectedModel}
                        theme={theme}
                        attachments={attachments}
                        onAttach={handleAttach}
                        onRemoveAttachment={handleRemoveAttachment}
                    />
                </div>
            ) : (
                usingAdminDefault ? (
                    <div ref={agentSelectorRef} className="flex-shrink-0 flex flex-col sm:flex-row sm:items-end gap-2 px-3 sm:px-4 pb-3 sm:pb-4 mx-auto w-full max-w-[900px]">
                        <div className="flex flex-row items-end gap-2 w-full sm:w-auto sm:flex-shrink-0">
                        <AgentSelector
                            agents={agents}
                            selectedAgent={selectedAgent}
                            onSelectAgent={handleAgentSelect}
                            isOpen={agentDropdownOpen}
                            onToggle={() => setAgentDropdownOpen(!agentDropdownOpen)}
                            theme={theme}
                            adminDefaultProvider={adminDefaultProvider}
                            userHasAgents={effectiveHasAgents}
                        />
                        <ModelSelector
                            selectedAgent={selectedAgent}
                            selectedModel={selectedModel}
                            onSelectModel={setSelectedModel}
                            theme={theme}
                        />
                        </div>
                        <ChatInput
                            value={message}
                            onChange={setMessage}
                            onSubmit={handleSubmit}
                            disabled={isSubmitting || !selectedAgent || !selectedModel}
                            theme={theme}
                            attachments={attachments}
                            onAttach={handleAttach}
                            onRemoveAttachment={handleRemoveAttachment}
                        />
                    </div>
                ) : (
                    <div className={`flex items-center justify-center py-3 px-4 rounded-xl mx-3 sm:mx-4 mb-3 sm:mb-4 ${theme === 'light' ? 'bg-gray-100 text-gray-500' : 'bg-[#1a1a2e] text-[#888]'}`}>
                        <div className="text-center">
                            <p className="text-sm">⚠️ No AI Provider Configured</p>
                            <p className="text-xs mt-1">Please add an AI agent to start chatting</p>
                        </div>
                    </div>
                )
            )}
        </div>
    );

    return (
        <ChatLayout agents={agents} chats={chats} currentChat={chat} user={user} adminDefaultProvider={adminDefaultProvider} userHasAgents={userHasAgents}>
            {combinedArea}
            {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
        </ChatLayout>
    );
}

// Dashboard A — "Continue where you left off"
// Renders in place of the welcome view when the user has no current chat selected.
// Layout: search bar → recent chats grid (4) → agents row.
function ChatWelcome({
    theme,
    logoDark,
    logoLight,
    chats,
    agents,
    adminDefaultProvider,
    selectedAgent,
    setSelectedAgent,
    selectedModel,
    user,
}: {
    theme: 'light' | 'dark' | 'system';
    logoDark: string;
    logoLight: string;
    chats: Chat[];
    agents: Agent[];
    adminDefaultProvider?: AdminDefaultProvider | null;
    selectedAgent: Agent | null;
    setSelectedAgent: (agent: Agent) => void;
    selectedModel: string;
    user?: { name?: string };
}) {
    // NOTE: `userHasAgents` prop removed (was unused). It's also declared later
    // in ChatPage so referencing it inside the chatContent JSX above caused a
    // TDZ error ("Cannot access 'Q' before initialization") in production.
    // Backend already sorts chats by updated_at desc (controller). Top 4 for the dashboard.
    const recentChats = (chats ?? []).slice(0, 4);

    // Sort user agents: default first, then alphabetical.
    const sortedAgents = useMemo(() => {
        return [...(agents ?? [])]
            .filter((a) => a.id !== -1)
            .sort((a, b) => {
                if (a.is_default && !b.is_default) return -1;
                if (!a.is_default && b.is_default) return 1;
                return a.name.localeCompare(b.name);
            });
    }, [agents]);

    // Admin default agent (for users without their own agents).
    const adminAgent: Agent | null = adminDefaultProvider ? {
        id: -1,
        name: adminDefaultProvider.name,
        provider: adminDefaultProvider.provider,
        is_default: false,
        has_api_key: adminDefaultProvider.has_api_key,
        is_admin_default: true,
    } : null;

    // Relative time formatter: just now / Nm / Nh / Nd / Mon Day
    const formatTimeAgo = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const mins = Math.floor(diffMs / 60000);
        const hours = Math.floor(mins / 60);
        const days = Math.floor(hours / 24);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Pull last message as preview; truncate gracefully.
    const getChatPreview = (chat: Chat): string => {
        if (!chat.messages || chat.messages.length === 0) return 'No messages yet';
        const last = chat.messages[chat.messages.length - 1];
        const preview = last?.message || '';
        return preview.length > 60 ? preview.substring(0, 60) + '…' : preview;
    };

    // Whether the active selection matches a given agent pill (handles admin default).
    const isAgentActive = (a: Agent): boolean => {
        if (!selectedAgent) return false;
        if (a.id === -1) return !!selectedAgent.is_admin_default;
        return selectedAgent.id === a.id && !selectedAgent.is_admin_default;
    };

    return (
        <div className="flex-1 overflow-y-auto theme-bg-app">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
                {/* Header */}
                <div className="flex flex-col items-center text-center mb-6">
                    <span className="theme-logo-stack mb-3">
                        <img src={logoDark} alt="ThinkChat" className="logo-img logo-dark w-14 h-14 rounded-2xl object-cover shadow-lg shadow-[rgba(102,126,234,0.35)]" />
                        <img src={logoLight} alt="" aria-hidden="true" className="logo-img logo-light w-14 h-14 rounded-2xl object-cover shadow-lg shadow-[rgba(102,126,234,0.35)]" />
                    </span>
                    <h2 className={`text-xl font-bold mb-1 ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                        Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
                    </h2>
                    <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-[#888]'}`}>
                        Pick up where you left off, or start something new.
                    </p>
                </div>

                {/* Recent chats grid (up to 4) */}
                {recentChats.length > 0 && (
                    <div className="mb-7">
                        <h3 className={`text-[11px] font-semibold uppercase tracking-wider mb-3 px-1 ${theme === 'light' ? 'text-gray-500' : 'text-[#888]'}`}>
                            Continue where you left off
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {recentChats.map((chat) => (
                                <a
                                    key={chat.id}
                                    href={`/chat/${chat.id}`}
                                    className={`block p-3 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                                        theme === 'light'
                                            ? 'bg-white border-gray-200 hover:border-[#667eea]'
                                            : 'bg-[#1a1a2e] border-[#2d2d4a] hover:border-[rgba(102,126,234,0.5)]'
                                    }`}
                                >
                                    <div className="flex items-start gap-2.5">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm ${
                                            chat.is_pinned
                                                ? 'bg-gradient-to-r from-[#f59e0b] to-[#d97706]'
                                                : 'bg-gradient-to-r from-[#667eea] to-[#764ba2]'
                                        }`}>
                                            {chat.is_pinned ? '📌' : '💬'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-1.5 mb-0.5">
                                                <h4 className={`text-xs font-semibold truncate flex-1 min-w-0 ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                                                    {chat.title}
                                                </h4>
                                                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                                                    <span className={`text-[10px] ${theme === 'light' ? 'text-gray-400' : 'text-[#666]'}`}>
                                                        {formatTimeAgo(chat.updated_at || chat.created_at)}
                                                    </span>
                                                    {chat.is_favourite && <Star className="w-3 h-3 text-[#f59e0b]" fill="currentColor" />}
                                                </div>
                                            </div>
                                            <p className={`text-[11px] truncate ${theme === 'light' ? 'text-gray-500' : 'text-[#888]'}`}>
                                                {getChatPreview(chat)}
                                            </p>
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* User agents row — click to set as active for the next message */}
                {sortedAgents.length > 0 && (
                    <div>
                        <h3 className={`text-[11px] font-semibold uppercase tracking-wider mb-3 px-1 ${theme === 'light' ? 'text-gray-500' : 'text-[#888]'}`}>
                            Your Agents
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {sortedAgents.map((agent) => {
                                const active = isAgentActive(agent);
                                return (
                                    <button
                                        key={agent.id}
                                        type="button"
                                        onClick={() => setSelectedAgent(agent)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                                            active
                                                ? 'border-[#667eea] bg-[rgba(102,126,234,0.15)] shadow-md shadow-[rgba(102,126,234,0.2)]'
                                                : theme === 'light'
                                                    ? 'bg-white border-gray-200 hover:border-[#667eea]'
                                                    : 'bg-[#1a1a2e] border-[#2d2d4a] hover:border-[rgba(102,126,234,0.5)]'
                                        }`}
                                    >
                                        <div className={`w-6 h-6 rounded-md bg-gradient-to-r ${getProviderGradient(agent.provider)} flex items-center justify-center flex-shrink-0`}>
                                            <ProviderIcon provider={agent.provider} size={14} color="#ffffff" />
                                        </div>
                                        <span className={`text-xs font-medium ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                                            {agent.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Admin default agent — separate section, clearly labeled */}
                {adminAgent && (
                    <div className={sortedAgents.length > 0 ? 'mt-5' : ''}>
                        <h3 className={`text-[11px] font-semibold uppercase tracking-wider mb-3 px-1 ${theme === 'light' ? 'text-gray-500' : 'text-[#888]'}`}>
                            ThinkChat's Default
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedAgent(adminAgent)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                                    isAgentActive(adminAgent)
                                        ? 'border-[#667eea] bg-[rgba(102,126,234,0.15)] shadow-md shadow-[rgba(102,126,234,0.2)]'
                                        : theme === 'light'
                                            ? 'bg-white border-gray-200 hover:border-[#667eea]'
                                            : 'bg-[#1a1a2e] border-[#2d2d4a] hover:border-[rgba(102,126,234,0.5)]'
                                }`}
                            >
                                <div className={`w-6 h-6 rounded-md bg-gradient-to-r ${getProviderGradient(adminAgent.provider)} flex items-center justify-center flex-shrink-0`}>
                                    <ProviderIcon provider={adminAgent.provider} size={14} color="#ffffff" />
                                </div>
                                <span className={`text-xs font-medium ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                                    {adminAgent.name}
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide ${
                                    theme === 'light' ? 'bg-amber-100 text-amber-700' : 'bg-amber-900/30 text-amber-400'
                                }`}>
                                    Default
                                </span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Empty state — no agents at all */}
                {sortedAgents.length === 0 && !adminAgent && (
                    <div>
                        <h3 className={`text-[11px] font-semibold uppercase tracking-wider mb-3 px-1 ${theme === 'light' ? 'text-gray-500' : 'text-[#888]'}`}>
                            Your Agents
                        </h3>
                        <a
                            href="/ai-agents"
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed text-xs ${
                                theme === 'light' ? 'border-gray-300 text-gray-500 hover:border-[#667eea]' : 'border-[#2d2d4a] text-[#888] hover:border-[rgba(102,126,234,0.5)]'
                            }`}
                        >
                            + Add your first AI agent
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}