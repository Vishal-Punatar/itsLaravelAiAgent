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
    // True while this assistant message is actively streaming tokens from SSE.
    // MessageBubble skips markdown parsing while streaming (avoids per-token
    // reflow as incomplete lines arrive) and renders plain whitespace-preserving
    // text instead. Flipped to false when the stream ends (success or abort).
    streaming?: boolean;
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
    // AbortController for the active SSE stream (so "Stop generating" can
    // cancel the request mid-flight, saving API cost on aborted requests).
    const abortControllerRef = useRef<AbortController | null>(null);
    // Whether the user clicked "Stop" — the message bubble shows a hint.
    const [streamStopped, setStreamStopped] = useState(false);

    // ─────────────────────────────────────────────────────────────────
    // Per-token rendering: buffer deltas and emit small chunks per rAF
    // tick so providers that batch (Gemini sends ~50–75 tokens per delta)
    // don't appear as "3 dots then whole response". One constant, one
    // queue, one rAF loop. Works the same for every provider.
    // ─────────────────────────────────────────────────────────────────
    // Chars emitted per rAF tick (60fps → ~360 chars/sec for chatty
    // responses, ~60 chars/sec for short ones thanks to the small queue
    // draining fast).
    const CHARS_PER_TICK = 6;
    // Queue of small chunks waiting to be rendered.
    const tokenQueueRef = useRef<string[]>([]);
    const rafIdRef = useRef<number | null>(null);
    // True while the user is within ~80px of the bottom. Auto-scroll
    // follows new tokens; once they scroll up, this flips false and
    // tokens continue streaming without forcing scroll position.
    const streamPinToBottomRef = useRef<boolean>(true);

    // Pop one chunk from the queue and append it to the assistant
    // message. rAF self-schedules while the queue has more items.
    const flushPendingDelta = () => {
        rafIdRef.current = null;
        if (tokenQueueRef.current.length === 0) return;

        // Drain up to CHARS_PER_TICK in one render. We pop from the front
        // of the array so the order matches the upstream stream order.
        let batch = '';
        for (let i = 0; i < CHARS_PER_TICK && tokenQueueRef.current.length > 0; i++) {
            batch += tokenQueueRef.current.shift();
        }

        setLocalMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === 'assistant') {
                updated[updated.length - 1] = { ...last, message: last.message + batch };
            }
            return updated;
        });

        if (tokenQueueRef.current.length > 0) {
            rafIdRef.current = requestAnimationFrame(flushPendingDelta);
        }
    };

    const appendDelta = (delta: string) => {
        if (!delta) return;
        setShowTyping(false);
        for (let i = 0; i < delta.length; i += CHARS_PER_TICK) {
            tokenQueueRef.current.push(delta.slice(i, i + CHARS_PER_TICK));
        }
        if (rafIdRef.current === null) {
            rafIdRef.current = requestAnimationFrame(flushPendingDelta);
        }
    };
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
    // Inner content wrapper — ResizeObserver watches its height. When tokens
    // stream in (bubble grows), the markdown re-renders (bubble re-grows),
    // a new message arrives, or the typing indicator shows/hides, the
    // observer fires and we scroll-to-bottom instantly. Bulletproof: no
    // dependency on rAF timing or scrollHeight staleness.
    const messagesInnerRef = useRef<HTMLDivElement>(null);

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

    // ResizeObserver — fires once per actual layout change of the inner
    // message stack. When tokens stream in (bubble grows), the markdown
    // re-render finishes (bubble re-grows), a new message arrives, or the
    // typing indicator appears/disappears, this fires and we scroll the
    // container to the new bottom. This is the bulletproof version that
    // doesn't depend on rAF timing or scrollHeight staleness.
    useEffect(() => {
        const inner = messagesInnerRef.current;
        const container = messagesContainerRef.current;
        if (!inner || !container) return;

        const observer = new ResizeObserver(() => {
            if (!streamPinToBottomRef.current) return;
            // Over-shoot scrollTop so browser clamps to maxScrollTop regardless
            // of how much the content continues to grow in the next paint.
            container.scrollTop = container.scrollHeight + 1_000_000;
        });
        observer.observe(inner);
        return () => observer.disconnect();
    }, []);

    // Handle scroll to show/hide scroll-to-bottom button
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
            setShowScrollButton(distanceFromBottom > 100);
            // Update the streaming auto-scroll pin: if user has scrolled back
            // near the bottom (within 80 px), re-pin so new tokens auto-scroll.
            // If they scroll further up, un-pin so we don't fight their scroll.
            streamPinToBottomRef.current = distanceFromBottom < 80;
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
        setStreamStopped(false);
        setIsSubmitting(true);
        // Reset streaming rendering state for this new message.
        tokenQueueRef.current = [];
        rafIdRef.current = null;
        streamPinToBottomRef.current = true;

        // No chat yet (first message in a new chat) — fall back to the
        // non-streaming POST /chat endpoint, which creates the chat and
        // redirects. Streaming requires an existing chat_id.
        if (!chat) {
            try {
                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
                const formData = new FormData();
                formData.append('_token', csrfToken);
                formData.append('message', userMessage.message);
                const agentIdToSend = selectedAgent?.is_admin_default ? '' : String(selectedAgent?.id);
                formData.append('agent_id', agentIdToSend);
                formData.append('model_id', selectedModel);
                attachments.forEach((file, index) => {
                    formData.append(`attachments[${index}]`, file);
                });
                const response = await fetch('/chat', { method: 'POST', body: formData });
                if (response.ok || response.redirected) {
                    window.location.href = response.url || window.location.href;
                    return;
                }
                throw new Error('Failed');
            } catch {
                setShowTyping(false);
                setIsSubmitting(false);
                alert('Failed to send message.');
            }
            return;
        }

        // Streaming path: POST /chat/{id}/stream → text/event-stream
        // The assistant message starts empty and is filled token-by-token
        // as SSE events arrive. TypingIndicator hides on the first token.
        const streamingMessage: Message = {
            role: 'assistant',
            message: '',
            created_at: new Date().toISOString(),
            streaming: true,
        };
        setLocalMessages((prev) => [...prev, streamingMessage]);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const formData = new FormData();
            formData.append('_token', csrfToken);
            formData.append('message', userMessage.message);
            const agentIdToSend = selectedAgent?.is_admin_default ? '' : String(selectedAgent?.id);
            formData.append('agent_id', agentIdToSend);
            formData.append('model_id', selectedModel);
            attachments.forEach((file, index) => {
                formData.append(`attachments[${index}]`, file);
            });

            const response = await fetch(`/chat/${chat.id}/stream`, {
                method: 'POST',
                body: formData,
                signal: controller.signal,
                headers: { Accept: 'text/event-stream' },
            });

            if (!response.ok || !response.body) {
                const errorText = await response.text().catch(() => '');
                throw new Error(errorText || `HTTP ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // SSE events are delimited by blank lines. Split, process the
                // complete events, keep the trailing incomplete chunk in the
                // buffer for the next read.
                let eventEnd;
                while ((eventEnd = buffer.indexOf('\n\n')) !== -1) {
                    const rawEvent = buffer.slice(0, eventEnd);
                    buffer = buffer.slice(eventEnd + 2);

                    // Each event can have multiple "data:" lines; concatenate them.
                    const dataLines: string[] = [];
                    for (const line of rawEvent.split('\n')) {
                        if (line.startsWith('data:')) {
                            dataLines.push(line.slice(5).trimStart());
                        }
                    }
                    if (dataLines.length === 0) continue;
                    const data = dataLines.join('\n');
                    if (data === '[DONE]') continue;

                    // The Laravel AI SDK yields StreamEvent objects whose __toString()
                    // returns `json_encode($this->toArray())`. So `data` is JSON like:
                    //   {"type":"text_delta","delta":"Hello","message_id":"..."}
                    //   {"type":"text_start", ...}
                    //   {"type":"stream_end","usage":{...}}
                    //   {"type":"insufficient_quota","message":"...","recoverable":false} ← Error
                    //   {"type":"rate_limit_exceeded","message":"...","recoverable":false} ← Error
                    //   {"type":"request_too_large","message":"...","recoverable":false} ← Error
                    //   {"type":"authentication_error","message":"...","recoverable":false} ← Error
                    //   {"type":"error","message":"...","code":429}  ← emitted by ChatController
                    //     when the SDK throws mid-stream (e.g. network timeout).
                    // We only append the text delta; other events are control signals.
                    let delta: string | null = null;
                    try {
                        const parsed = JSON.parse(data);
                        const eventType = parsed?.type;
                        if (eventType === 'text_delta' || eventType === 'text-delta') {
                            delta = typeof parsed.delta === 'string' ? parsed.delta : null;
                        } else if (eventType === 'reasoning_delta' || eventType === 'reasoning-delta') {
                            // Skip reasoning content — it's chain-of-thought, not user-facing.
                            // Future: render as collapsible "thinking" panel.
                            delta = null;
                        } else if (
                            // Detect ANY provider error event by its unique signature:
                            // string `type` (not a text-delta variant) + string `message`.
                            //
                            // SDK Error events: {type: "insufficient_quota"|"request_too_large"|
                            //   "rate_limit_exceeded"|"authentication_error"|...,
                            //   message: "...", recoverable: bool}
                            // Backend-emitted errors (from ChatController try/catch):
                            //   {type: "error", message: "...", recoverable: false, code: 0,
                            //    exception_class: "RateLimitedException"}
                            //
                            // No control event (stream_start/text_start/text_end/stream_end) or
                            // text event (text_delta/reasoning_delta) has `message` as a string
                            // field — they use `delta`, `provider`, `model`, `usage`, etc. So
                            // checking `eventType !== text_delta && parsed.message is string`
                            // is sufficient to identify errors without enumerating types.
                            typeof eventType === 'string' &&
                            eventType !== 'text_delta' && eventType !== 'text-delta' &&
                            eventType !== 'reasoning_delta' && eventType !== 'reasoning-delta' &&
                            typeof parsed?.message === 'string' &&
                            parsed.message
                        ) {
                            const errorMessage = parsed.message;
                            setLocalMessages((prev) => {
                                const updated = [...prev];
                                const last = updated[updated.length - 1];
                                if (last && last.role === 'assistant') {
                                    updated[updated.length - 1] = { ...last, message: errorMessage };
                                }
                                return updated;
                            });
                            delta = null;
                        } else {
                            // text_start / text_end / stream_start / stream_end / tool_call etc.
                            delta = null;
                        }
                    } catch {
                        // Not JSON — append verbatim as a fallback (shouldn't happen with SDK).
                        delta = data;
                    }

                    if (delta === null) continue;

                    // Hide typing indicator on the first text chunk received,
                    // and buffer the delta for the next rAF tick.
                    appendDelta(delta);
                }
            }

            // Drain any remaining buffered data (rare: chunk arrived without trailing \n\n)
            if (buffer.trim()) {
                const tail = buffer.trim();
                if (tail.startsWith('data:')) {
                    const data = tail.slice(5).trimStart();
                    if (data && data !== '[DONE]') {
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed?.type === 'text_delta' || parsed?.type === 'text-delta') {
                                const delta = typeof parsed.delta === 'string' ? parsed.delta : '';
                                if (delta) appendDelta(delta);
                            }
                        } catch {
                            // ignore
                        }
                    }
                }
            }
        } catch (err) {
            const isAbort = err instanceof DOMException && err.name === 'AbortError';
            if (isAbort) {
                setStreamStopped(true);
            } else {
                console.error('Stream failed:', err);
                setLocalMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last && last.role === 'assistant') {
                        updated[updated.length - 1] = {
                            ...last,
                            message: last.message || 'Sorry, I couldn\u2019t reach the AI service. Please try again.',
                        };
                    }
                    return updated;
                });
            }
        } finally {
            // Stream ended (success, error, or browser abort). Cancel any
            // pending rAF, then schedule one final drain to render any
            // remaining buffered chunks. The natural rAF loop will continue
            // from there if the queue is still non-empty.
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            if (tokenQueueRef.current.length > 0) {
                rafIdRef.current = requestAnimationFrame(flushPendingDelta);
            }
            // Flip the last assistant message from streaming → finalized so
            // MessageBubble re-runs the markdown parser once on the completed
            // text (bullets, numbered lists, paragraph breaks all settle).
            setLocalMessages((prev) => prev.map((msg, i) =>
                i === prev.length - 1 && msg.role === 'assistant' && msg.streaming
                    ? { ...msg, streaming: false }
                    : msg
            ));
            // No need to manually scroll here — the ResizeObserver observing
            // messagesInnerRef fires as soon as the streamed→finalized flip
            // triggers the markdown re-render and grows the bubble height.
            setShowTyping(false);
            setIsSubmitting(false);
            abortControllerRef.current = null;
        }
    };

    // "Stop generating" handler — aborts the active SSE stream. The backend
    // sees the disconnect, the SDK's then() callback fires, and whatever was
    // generated up to the abort point is persisted to chat_messages.
    const handleStop = () => {
        abortControllerRef.current?.abort();
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
                // Inner content wrapper. ResizeObserver watches this element's
                // height (bubbles + typing indicator + stopped hint + anchor).
                // The outer container is overflow-y-auto; this inner just lays
                // out children in a column.
                <div ref={messagesInnerRef} className="flex flex-col gap-4">
                    {localMessages.map((msg, index) => (
                        <MessageBubble key={index} message={msg} userId={user?.id} onImageClick={setLightboxSrc} />
                    ))}
                    {showTyping && <TypingIndicator />}
                    {/* "Stopped" hint shown briefly after the user aborts */}
                    {streamStopped && !isSubmitting && (
                        <div className={`text-xs italic px-2 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                            Stopped.
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            )}

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
        </div>
    );

    // Theme is applied synchronously by ChatLayout — no MutationObserver needed

    // When user has no agents, they're shown the admin default — use that as selected
    const effectiveHasAgents = userHasAgents !== undefined ? userHasAgents : agents.length > 0;

    // Show the admin default info when user has no agents
    const usingAdminDefault = !effectiveHasAgents && adminDefaultProvider;

    // True when the user CAN chat (has their own agents OR the admin default
    // is available). Used by the unified chat-input area below.
    const canChat = effectiveHasAgents || usingAdminDefault;

    // One single unified section: chat + agent selector + chat input.
    // Shared between "user has agents" and "using admin default" branches —
    // they were previously duplicated 2× and now live in one place.
    const chatControls = (
        <div
            ref={agentSelectorRef}
            className="flex-shrink-0 flex flex-col sm:flex-row sm:items-end gap-2 px-3 sm:px-4 pb-3 sm:pb-4 mx-auto w-full max-w-[1100px]"
        >
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
                onStop={handleStop}
                isStreaming={isSubmitting}
                disabled={isSubmitting || !selectedAgent || !selectedModel}
                theme={theme}
                attachments={attachments}
                onAttach={handleAttach}
                onRemoveAttachment={handleRemoveAttachment}
            />
        </div>
    );

    // One single unified section: chat + agent selector + chat input
    const combinedArea = (
        <div className="flex-1 flex flex-col min-h-0">
            {chatContent}
            {canChat ? chatControls : (
                <div className={`flex items-center justify-center py-3 px-4 rounded-xl mx-3 sm:mx-4 mb-3 sm:mb-4 ${theme === 'light' ? 'bg-gray-100 text-gray-500' : 'bg-[#1a1a2e] text-[#888]'}`}>
                    <div className="text-center">
                        <p className="text-sm">⚠️ No AI Provider Configured</p>
                        <p className="text-xs mt-1">Please add an AI agent to start chatting</p>
                    </div>
                </div>
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