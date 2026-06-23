import { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, Zap, MessageSquare } from 'lucide-react';
import ChatLayout, { AgentSelector, ChatInput, MessageBubble, TypingIndicator, Lightbox } from '@/components/ChatLayout';

interface Agent {
    id: number;
    name: string;
    provider: string;
    is_default: boolean;
    has_api_key?: boolean;
    is_admin_default?: boolean;
}

interface AdminDefaultProvider {
    key: string;
    label: string;
    has_api_key: boolean;
    default_model: string;
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
    const [message, setMessage] = useState('');
    const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(
        agents.find(a => a.is_default) || agents[0] || null
    );
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
    // Sync theme state when body's class changes (blade template toggles .light/.dark on body)
    useEffect(() => {
        const observer = new MutationObserver(() => {
            if (document.body.classList.contains('light')) { setTheme('light'); return; }
            if (document.body.classList.contains('dark')) { setTheme('dark'); return; }
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const agentSelectorRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // Close agent dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (agentDropdownOpen && agentSelectorRef.current && !agentSelectorRef.current.contains(event.target as Node)) {
                setAgentDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [agentDropdownOpen]);

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
            const agentIdToSend = selectedAgent?.is_admin_default ? '' : String(selectedAgent?.id);
            formData.append('agent_id', agentIdToSend);
            
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
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6 pt-6 flex flex-col gap-4 theme-bg-app">
            {localMessages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                    {/* Welcome Icon */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center mb-5 shadow-lg shadow-[rgba(102,126,234,0.35)]">
                        <Bot className="w-8 h-8 text-white" />
                    </div>
                    
                    {/* Welcome Text */}
                    <h2 className={`text-xl font-bold mb-2 ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                        Welcome to <span className="bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">ThinkChat</span>
                    </h2>
                    <p className={`text-sm max-w-md mb-6 ${theme === 'light' ? 'text-gray-500' : 'text-[#777]'}`}>
                        Select an agent above and start a conversation.
                    </p>
                    
                    {/* Feature Cards */}
                    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 max-w-xl w-full mb-3 sm:mb-4">
                        <div className="p-3.5 rounded-xl bg-[#1a1a2e] border border-[#2d2d4a] text-left hover:border-[rgba(102,126,234,0.3)] transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center mb-2.5">
                                <Zap className="w-4 h-4 text-white" />
                            </div>
                            <h3 className="text-xs font-semibold text-white mb-0.5">Fast</h3>
                            <p className="text-[10px] text-[#888]">Quick AI responses</p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-[#1a1a2e] border border-[#2d2d4a] text-left hover:border-[rgba(102,126,234,0.3)] transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center mb-2.5">
                                <MessageSquare className="w-4 h-4 text-white" />
                            </div>
                            <h3 className="text-xs font-semibold text-white mb-0.5">Multi-Agent</h3>
                            <p className="text-[10px] text-[#888]">Choose your AI</p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-[#1a1a2e] border border-[#2d2d4a] text-left hover:border-[rgba(102,126,234,0.3)] transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center mb-2.5">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <h3 className="text-xs font-semibold text-white mb-0.5">Smart</h3>
                            <p className="text-[10px] text-[#888]">Context aware</p>
                        </div>
                    </div>
                </div>
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
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {chatContent}
            {effectiveHasAgents ? (
                <div ref={agentSelectorRef} className="flex-shrink-0 flex flex-row items-end gap-2 px-3 sm:px-4 pb-3 sm:pb-4 mx-auto w-full max-w-[900px]">
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
                    <ChatInput
                        value={message}
                        onChange={setMessage}
                        onSubmit={handleSubmit}
                        disabled={isSubmitting || !selectedAgent}
                        theme={theme}
                        attachments={attachments}
                        onAttach={handleAttach}
                        onRemoveAttachment={handleRemoveAttachment}
                    />
                </div>
            ) : (
                usingAdminDefault ? (
                    <div ref={agentSelectorRef} className="flex-shrink-0 flex flex-row items-end gap-2 px-3 sm:px-4 pb-3 sm:pb-4 mx-auto w-full max-w-[900px]">
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
                        <ChatInput
                            value={message}
                            onChange={setMessage}
                            onSubmit={handleSubmit}
                            disabled={isSubmitting || !selectedAgent}
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