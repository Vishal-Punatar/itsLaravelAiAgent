import { useState, useEffect, useRef, memo } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Bot, Sparkles, Zap, MessageSquare, ChevronDown, Check, Send, Menu, Plus, Settings, LogOut, Pin, PinOff, Sun, Moon, Monitor, Edit3, X, Trash2, MoreVertical, Paperclip, Cpu, AlertTriangle, ArrowLeft, Star, StarOff } from 'lucide-react';
import { useMemo } from 'react';
import { router } from '@inertiajs/react';
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

// Format message content with proper list handling
function formatMessage(text: string): React.ReactNode[] {
    if (!text) return [text];
    
    // Split into lines preserving empty lines
    const lines = text.split(/\n/);
    const result: React.ReactNode[] = [];
    let bulletBuffer: string[] = [];
    let listKey = 0;
    
    const flushBullets = () => {
        if (bulletBuffer.length > 0) {
            result.push(
                <ul key={`ul-${listKey++}`} className="my-2 ml-5 space-y-1.5 list-none">
                    {bulletBuffer.map((item, i) => (
                        <li key={i} className="flex items-start">
                            <span className="text-[#667eea] mr-2 mt-0.5 flex-shrink-0">•</span>
                            <span className="leading-relaxed">{formatInline(item.trim())}</span>
                        </li>
                    ))}
                </ul>
            );
            bulletBuffer = [];
        }
    };
    
    lines.forEach((line, idx) => {
        const trimmed = line.trim();
        
        // Empty line - flush bullets and add spacing
        if (trimmed === '') {
            flushBullets();
            result.push(<div key={`sp-${idx}`} className="h-2" />);
            return;
        }
        
        // Bullet point (starts with • or - or * followed by space)
        const bulletMatch = trimmed.match(/^([•*\-])\s+(.*)$/);
        if (bulletMatch) {
            bulletBuffer.push(bulletMatch[2]);
            return;
        }
        
        // Numbered item (starts with number, dot, space)
        const numMatch = trimmed.match(/^(\d+[.)])\s+(.*)$/);
        if (numMatch) {
            flushBullets();
            result.push(
                <div key={`n-${idx}`} className="flex items-start my-1.5 ml-5">
                    <span className="text-[#667eea] mr-2 mt-0.5 flex-shrink-0 font-medium">{numMatch[1]}</span>
                    <span className="leading-relaxed">{formatInline(numMatch[2])}</span>
                </div>
            );
            return;
        }
        
        // Regular text line - flush bullets first
        flushBullets();
        result.push(
            <p key={`p-${idx}`} className="my-1.5 leading-relaxed">
                {formatInline(trimmed)}
            </p>
        );
    });
    
    // Flush any remaining bullets
    flushBullets();
    return result;
}

// Format inline styles (bold, italic, code, links, citations)
function formatInline(text: string): React.ReactNode {
    if (!text) return text;
    
    // Handle citation markers [1], [2], etc. first (before other processing)
    const citationParts = text.split(/(\[\d+\])/g);
    
    return citationParts.map((part, i) => {
        // Citation marker [1], [2], etc.
        const citationMatch = part.match(/^\[(\d+)\]$/);
        if (citationMatch) {
            return (
                <sup 
                    key={`cite-${i}`} 
                    className="inline-flex items-center justify-center w-4 h-4 text-[9px] font-semibold rounded-full bg-[rgba(102,126,234,0.25)] text-[#667eea] ml-0.5 mr-0.5 align-super hover:bg-[rgba(102,126,234,0.4)] cursor-help"
                    title={`Source ${citationMatch[1]}`}
                >
                    {citationMatch[1]}
                </sup>
            );
        }
        
        // Handle bold **text**
        const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
        return boldParts.map((bp, j) => {
            if (bp.startsWith('**') && bp.endsWith('**')) {
                return <strong key={`${i}-${j}`} className="font-semibold">{bp.slice(2, -2)}</strong>;
            }
            // Handle inline code `text`
            const codeParts = bp.split(/(`[^`]+`)/g);
            return codeParts.map((cp, k) => {
                if (cp.startsWith('`') && cp.endsWith('`')) {
                    return <code key={`${i}-${j}-${k}`} className="px-1.5 py-0.5 rounded bg-[rgba(102,126,234,0.2)] text-[#667eea] text-xs font-mono">{cp.slice(1, -1)}</code>;
                }
                return cp;
            });
        });
    });
}

interface Agent {
    id: number;
    name: string;
    provider: string;
    is_default: boolean;
}

interface Attachment {
    name: string;
    path: string;
    mime: string;
    size: number;
}

interface GeneratedImage {
    path: string;
    prompt: string;
    model: string;
    provider: string;
    generated_at: string;
}

interface AttachmentWithType {
    type: 'image';
    images: GeneratedImage[];
}

interface Message {
    id?: number;
    role: 'user' | 'assistant';
    message: string;
    attachments?: Attachment[] | AttachmentWithType[] | null;
    created_at?: string;
    // True while this assistant message is actively streaming tokens from SSE.
    // When true, MessageBubble skips markdown parsing and renders plain text
    // (whitespace-pre-wrap) to avoid visual reflow as incomplete lines arrive.
    streaming?: boolean;
}

interface Chat {
    id: number;
    title: string;
    messages: Message[];
    created_at: string;
    is_pinned?: boolean;
    pinned_order?: number | null;
    is_favourite?: boolean;
    favourited_at?: string | null;
}

interface ChatLayoutProps {
    agents: Agent[];
    chats: Chat[];
    currentChat?: Chat;
    user?: {
        is_admin: boolean;
        theme?: 'light' | 'dark' | 'system';
    };
    children: React.ReactNode;
    theme: 'light' | 'dark' | 'system';
    adminDefaultProvider?: {
        provider: string;
        name: string;
        has_api_key: boolean;
    } | null;
    userHasAgents?: boolean;
}

export default function ChatLayout({
    agents,
    chats,
    currentChat,
    user,
    children,
    theme: themeProp,
    adminDefaultProvider,
    userHasAgents,
}: ChatLayoutProps) {
    const { logoDark, logoLight } = useThemeLogo();
    // Safety check - ensure user has a default structure
       const safeUser = user ?? { is_admin: false, theme: 'system' };
    // Use passed theme prop, falling back to user's saved theme or system preference
    const [theme, setTheme] = useState(themeProp ?? safeUser?.theme ?? 'system');
    // Ensure agents and chats are always arrays to prevent undefined errors
    const safeAgents = agents ?? [];
    // Sort chats: pinned first (sorted by pinned_order), then by created_at descending
    const sortedChats = [...(chats ?? [])].sort((a, b) => {
        // Pinned chats first
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        // If both pinned, sort by pinned_order (lower = higher priority)
        if (a.is_pinned && b.is_pinned) {
            const orderA = a.pinned_order ?? 999;
            const orderB = b.pinned_order ?? 999;
            if (orderA !== orderB) return orderA - orderB;
        }
        // Otherwise sort by created_at descending (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    const safeChats = sortedChats;
    // Split into favourites and the rest. Backend already sorts favourited
    // first (by favourited_at desc), so filtering preserves order.
    const favouriteChats = safeChats.filter((c) => c.is_favourite);
    const otherChats = safeChats.filter((c) => !c.is_favourite);
    
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarMinimized, setSidebarMinimized] = useState(false);
    const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
    const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
    const [editingChatId, setEditingChatId] = useState<number | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [deletingChatId, setDeletingChatId] = useState<number | null>(null);
    const [activeMenuChatId, setActiveMenuChatId] = useState<number | null>(null);
    // Position of the active 3-dot dropdown, captured from the button's
    // getBoundingClientRect() at click time. Used to render the dropdown in a
    // portal with position:fixed so it escapes the sidebar's overflow-hidden
    // containers (which would otherwise clip the menu vertically).
    const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
    // Collapsible sidebar sections (Design C — Notion-style chevrons).
    // Persisted in localStorage so the user's toggle survives reloads.
    const [favouritesCollapsed, setFavouritesCollapsed] = useState<boolean>(() => {
        try { return localStorage.getItem('sidebar_favs_collapsed') === '1'; } catch { return false; }
    });
    const [allChatsCollapsed, setAllChatsCollapsed] = useState<boolean>(() => {
        try { return localStorage.getItem('sidebar_allchats_collapsed') === '1'; } catch { return false; }
    });
    const dropdownRef = useRef<HTMLDivElement>(null);
    const themeDropdownRef = useRef<HTMLDivElement>(null);
    const themeChangeTimerRef = useRef<number | null>(null);

    useEffect(() => {
        // Apply theme on initial mount only
        applyTheme(theme || 'system');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Listen for theme changes from other components (e.g. Profile page's
    // Appearance picker) so the header dropdown's icon and selected state
    // stay in sync without a full page refresh.
    //
    // NOTE: We intentionally do NOT call applyTheme(next) here. The source
    // that fired the event already mutated the DOM (set data-theme + .light /
    // .dark class) and armed the 350ms theme-changing transition. Re-applying
    // would just reset the timer and queue extra MutationObserver microtasks,
    // which is what caused the cascading repaint before this fix.
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setAgentDropdownOpen(false);
            }
            if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
                setThemeDropdownOpen(false);
            }
            // Close chat menu when clicking outside
            if (activeMenuChatId !== null) {
                const menuButton = document.querySelector(`[data-chat-menu="${activeMenuChatId}"]`);
                const menuDropdown = document.querySelector(`[data-chat-dropdown="${activeMenuChatId}"]`);
                const clickedInsideMenu = (menuButton && menuButton.contains(event.target as Node)) || (menuDropdown && menuDropdown.contains(event.target as Node));
                if (!clickedInsideMenu) {
                    setActiveMenuChatId(null);
                    setMenuPosition(null);
                }
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeMenuChatId]);

    // Close the 3-dot dropdown on scroll or resize, since its position was
    // captured from the button's getBoundingClientRect() and becomes stale.
    useEffect(() => {
        if (activeMenuChatId === null) return;
        const close = () => closeMenu();
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [activeMenuChatId]);

    // Persist collapse state to localStorage on change
    useEffect(() => {
        try {
            localStorage.setItem('sidebar_favs_collapsed', favouritesCollapsed ? '1' : '0');
            localStorage.setItem('sidebar_allchats_collapsed', allChatsCollapsed ? '1' : '0');
        } catch {}
    }, [favouritesCollapsed, allChatsCollapsed]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Format a message timestamp as a human-friendly date+time.
    //   - Today      -> "Today, 2:35 PM"
    //   - Yesterday  -> "Yesterday, 9:12 AM"
    //   - This year  -> "Mar 14, 2:35 PM"
    //   - Other      -> "Mar 14 2024, 2:35 PM"
    // Inlined at call site to avoid minifier issues with closure renames.

    const getPreviewText = (chat: Chat) => {
        if (!chat.messages || chat.messages.length === 0) return '';
        const lastMsg = chat.messages[chat.messages.length - 1];
        return lastMsg.message.length > 35 ? lastMsg.message.substring(0, 35) + '...' : lastMsg.message;
    };

    const handleLogout = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        router.post('/logout', {}, { replace: true });
    };

    const handleTogglePin = async (e: React.MouseEvent, chatId: number, isPinned: boolean) => {
        e.preventDefault();
        e.stopPropagation();

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

        try {
            const response = await fetch(`/chat/${chatId}/pin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
            });

            if (response.ok) {
                // Reload the page to reflect changes
                window.location.reload();
            }
        } catch (error) {
            console.error('Failed to toggle pin:', error);
        }
    };

    const handleToggleFavourite = async (e: React.MouseEvent, chatId: number, isFavourite: boolean) => {
        e.preventDefault();
        e.stopPropagation();

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

        try {
            const response = await fetch(`/chat/${chatId}/favourite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
            });

            if (response.ok) {
                // Reload to reflect sort + state changes
                window.location.reload();
            } else {
                console.error('Failed to toggle favourite: HTTP', response.status);
            }
        } catch (error) {
            console.error('Failed to toggle favourite:', error);
        }
    };

    const closeMenu = () => { setActiveMenuChatId(null); setMenuPosition(null); };

    const handleRenameChat = async (chatId: number) => {
        if (!editingTitle.trim()) {
            setEditingChatId(null);
            return;
        }
        
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        
        try {
            const response = await fetch(`/chat/${chatId}/rename`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({ title: editingTitle.trim() }),
            });
            
            if (response.ok) {
                setEditingChatId(null);
                window.location.reload();
            }
        } catch (error) {
            console.error('Failed to rename chat:', error);
        }
    };

    const startRename = (e: React.MouseEvent, chatId: number, currentTitle: string) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingChatId(chatId);
        setEditingTitle(currentTitle);
    };

    const handleDeleteChat = async (chatId: number) => {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        
        try {
            const response = await fetch(`/chat/${chatId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
            });
            
            if (response.ok) {
                setDeletingChatId(null);
                window.location.href = '/chat';
            }
        } catch (error) {
            console.error('Failed to delete chat:', error);
        }
    };

    const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
        // Save the user's actual selection — keep 'system' as 'system' so
        // the OS preference is re-evaluated on every page load / Inertia nav.
        try {
            localStorage.setItem('app_theme', newTheme);
        } catch (e) {}

        // Atomic theme switch. Two paths:
        //
        //   (A) BROWSER SUPPORTS VIEW TRANSITIONS API (Chrome 111+, Edge 111+,
        //       Safari 18+): wrap the entire DOM mutation + React commit in
        //       document.startViewTransition(). The browser captures the
        //       current page as one bitmap layer and crossfades it into the
        //       new state in a single 250ms animation. This is genuinely
        //       atomic — no per-element cascade possible because the user is
        //       looking at two crossfading images, not at individual elements
        //       repainting.
        //
        //   (B) FALLBACK (Firefox, older browsers): fall back to the
        //       flushSync path. CSS transitions on .theme-changing * handle
        //       the smoothness, with the caveat that Tailwind utilities
        //       (0.15s) finish before our CSS rules (0.25s), producing a
        //       mild visible cascade. Still better than a hard cut.
        const supportsVT = typeof document.startViewTransition === 'function';

        if (supportsVT) {
            // Add a marker class that suppresses live-DOM CSS transitions
            // for the duration of the crossfade, so nothing chases the
            // View Transition's animation. The class is removed in the
            // transition's `finished` callback (which always resolves,
            // even if the animation is skipped).
            document.documentElement.classList.add('theme-vt');

            const transition = document.startViewTransition(() => {
                flushSync(() => {
                    // 1. Mutate DOM: flip data-theme + .light/.dark classes.
                    //    Skip the theme-changing class so live CSS transitions
                    //    don't fight the crossfade — the View Transition
                    //    handles the smoothness for us.
                    applyTheme(newTheme, { skipTransitionClass: true });

                    // 2. Flip local React state. JS-driven classnames
                    //    (e.g. `${theme === 'light' ? 'bg-white' : ...}`)
                    //    update NOW. With VT, these are part of the new
                    //    layer snapshot — they appear atomically with the
                    //    crossfade.
                    setTheme(newTheme);

                    // 3. Notify other components (Profile picker, Chat.tsx).
                    //    Their listeners call setTheme(next) which is batched
                    //    with step 2 — one commit, one paint, for every
                    //    component.
                    try {
                        window.dispatchEvent(
                            new CustomEvent('app:theme-changed', { detail: newTheme })
                        );
                    } catch (e) {}

                    // 4. Close the dropdown. Because this runs INSIDE the
                    //    startViewTransition callback, the unmount happens
                    //    before the new layer is captured — so the dropdown
                    //    fades out as part of the OLD layer's crossfade-out,
                    //    atomically with everything else. No "snap out of
                    //    existence mid-animation".
                    setThemeDropdownOpen(false);
                });
            });

            // Always clean up the marker class + clear pending timers, even
            // if the animation was interrupted. `finished` resolves whether
            // the transition completed or was skipped.
            transition.finished.finally(() => {
                document.documentElement.classList.remove('theme-vt');
                if (themeChangeTimerRef.current !== null) {
                    clearTimeout(themeChangeTimerRef.current);
                    themeChangeTimerRef.current = null;
                }
            });
        } else {
            // Fallback path — no View Transitions. Use flushSync to commit
            // everything atomically + theme-changing CSS class for the
            // per-element smooth transition.
            flushSync(() => {
                applyTheme(newTheme);
                setTheme(newTheme);
                try {
                    window.dispatchEvent(
                        new CustomEvent('app:theme-changed', { detail: newTheme })
                    );
                } catch (e) {}
                setThemeDropdownOpen(false);
            });
        }

        // Persist to server in background (non-blocking). Outside flushSync so
        // the server response (or any later setStates from it) doesn't gate
        // the visual paint.
        const csrfToken =
            document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content') || '';
        try {
            await fetch('/profile/theme', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({ theme: newTheme }),
            });
        } catch (error) {
            console.error('Failed to persist theme:', error);
        }
    };

    const applyTheme = (
        theme: 'light' | 'dark' | 'system',
        options: { skipTransitionClass?: boolean } = {}
    ) => {
        const root = document.documentElement;
        const body = document.body;
        const effectiveTheme = theme === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : theme;
        const skipTransitionClass = options.skipTransitionClass === true;

        // Add the 'theme-changing' class BEFORE flipping data-theme so the
        // transition rule from app.css (html.theme-changing *  → 0.25s ease
        // on background-color, color, border-color, etc.) is in effect on the
        // very next paint. This gives a smooth cross-fade instead of the
        // hard-cut the old transition-lock hack produced.
        //
        // Skip this when wrapping inside document.startViewTransition() —
        // the View Transition handles the visual smoothness, and we don't
        // want CSS transitions on the live DOM to compete with the
        // crossfade (creates a "double animation" where some elements
        // appear to lag behind the crossfade).
        if (!skipTransitionClass) {
            root.classList.add('theme-changing');
            body.classList.add('theme-changing');
        }

        // If a previous removal is still pending, cancel it so the new
        // transition can play uninterrupted (handles rapid theme switching).
        if (themeChangeTimerRef.current !== null) {
            clearTimeout(themeChangeTimerRef.current);
            themeChangeTimerRef.current = null;
        }

        // Apply the new theme
        root.setAttribute('data-theme', effectiveTheme);
        root.classList.remove('light', 'dark');
        root.classList.add(effectiveTheme);
        body.classList.remove('light', 'dark');
        body.classList.add(effectiveTheme);

        if (skipTransitionClass) {
            // View Transitions path: no setTimeout cleanup needed; the
            // caller manages `theme-vt` removal via transition.finished.
            return;
        }

        // Remove the transition class after the 0.25s easing completes
        // (350ms gives a small buffer; matches the 0.25s + a hair).
        themeChangeTimerRef.current = window.setTimeout(() => {
            root.classList.remove('theme-changing');
            body.classList.remove('theme-changing');
            themeChangeTimerRef.current = null;
        }, 350);
    };

    // Listen for system theme changes when theme is 'system'
    useEffect(() => {
        if (theme !== 'system') return;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemThemeChange = () => applyTheme('system');
        mediaQuery.addEventListener('change', handleSystemThemeChange);
        return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }, [theme]);

    // Clear the theme-change timer if the layout unmounts mid-transition
    // (e.g. user navigates away during the 350ms cross-fade). Prevents a
    // dangling setTimeout from trying to mutate classes on a detached DOM.
    useEffect(() => {
        return () => {
            if (themeChangeTimerRef.current !== null) {
                clearTimeout(themeChangeTimerRef.current);
                themeChangeTimerRef.current = null;
            }
        };
    }, []);

    // Use CSS variable-based classes for smooth atomic transitions
    // The .light/.dark class on <html> drives the actual color change
    const themeClasses = 'theme-bg-app theme-text-primary';

    // Render a single chat list item. Used by both Favourites and All Chats
    // sections so we don't duplicate ~100 lines of JSX.
    const renderChatItem = (chat: Chat) => (
        <div key={chat.id} className={`
            flex items-center gap-2 p-2 rounded-lg transition-all duration-200 group chat-item
            ${currentChat?.id === chat.id ? 'bg-[rgba(102,126,234,0.15)] border border-[rgba(102,126,234,0.25)]' : 'border border-transparent hover:bg-[rgba(102,126,234,0.08)]'}
        `} data-title={chat.title.toLowerCase()}>
            {editingChatId === chat.id ? (
                <form onSubmit={(e) => { e.preventDefault(); handleRenameChat(chat.id); }} className="flex items-center gap-1.5 flex-1 min-w-0">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs flex-shrink-0 bg-gradient-to-r from-[#667eea] to-[#764ba2]`}>
                        {chat.title.charAt(0).toUpperCase()}
                    </div>
                    <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Escape') setEditingChatId(null); }}
                        autoFocus
                        className={`flex-1 min-w-0 px-1.5 py-0.5 text-xs rounded-md border outline-none min-w-0 theme-bg-input theme-border theme-text-primary`}
                    />
                    <button type="submit" className="p-1 rounded-md bg-[rgba(102,126,234,0.2)] text-[#667eea] hover:bg-[rgba(102,126,234,0.3)]" title="Save">
                        <Check className="w-3 h-3" />
                    </button>
                    <button type="button" onClick={() => setEditingChatId(null)} className="p-1 rounded-md hover:bg-[rgba(231,76,60,0.2)] text-[var(--text-muted)] hover:text-[#e74c3c]" title="Cancel">
                        <X className="w-3 h-3" />
                    </button>
                </form>
            ) : (
                <>
                    <a href={`/chat/${chat.id}`} className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs flex-shrink-0 ${chat.is_pinned ? 'bg-gradient-to-r from-[#f59e0b] to-[#d97706]' : 'bg-gradient-to-r from-[#667eea] to-[#764ba2]'}`}>
                            {chat.is_pinned ? <Pin className="w-3.5 h-3.5 text-white" /> : <MessageSquare className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className={`text-xs font-medium truncate flex-1 min-w-0 theme-text-primary`}>
                                    {chat.title}
                                </span>
                                {chat.is_favourite && <Star className="w-3 h-3 text-[#f59e0b] flex-shrink-0" fill="currentColor" strokeWidth={1.5} />}
                                <span className={`text-[9px] theme-text-muted flex-shrink-0 whitespace-nowrap`}>{formatDate(chat.created_at)}</span>
                            </div>
                            {getPreviewText(chat) && (
                                <p className={`text-[10px] truncate mt-0.5 theme-text-muted`}>{getPreviewText(chat)}</p>
                            )}
                        </div>
                    </a>
                    <div className="relative flex-shrink-0">
                        <button
                            data-chat-menu={chat.id}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (activeMenuChatId === chat.id) {
                                    setActiveMenuChatId(null);
                                    setMenuPosition(null);
                                    return;
                                }
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                // Position dropdown so its right edge aligns with the button's right edge,
                                // and its top is just below the button + 4px gap.
                                setMenuPosition({
                                    x: Math.max(8, rect.right - 128), // 128 = w-32 dropdown width
                                    y: rect.bottom + 4,
                                });
                                setActiveMenuChatId(chat.id);
                            }}
                            className="p-1 rounded-md opacity-40 group-hover:opacity-100 hover:!opacity-100 transition-opacity hover:bg-[rgba(102,126,234,0.15)] text-[var(--text-muted)]"
                            aria-label="Chat options"
                        >
                            <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                        {activeMenuChatId === chat.id && menuPosition && createPortal(
                            <div
                                data-chat-dropdown={chat.id}
                                style={{ position: 'fixed', left: menuPosition.x, top: menuPosition.y, width: '128px' }}
                                className={`rounded-lg overflow-hidden shadow-xl z-[100] border theme-bg-card theme-border`}
                            >
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleToggleFavourite(e, chat.id, !!chat.is_favourite);
                                        setActiveMenuChatId(null);
                                        setMenuPosition(null);
                                    }}
                                    className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] transition-colors ${theme === 'light' ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-[rgba(102,126,234,0.1)] text-[var(--text-secondary)]'}`}
                                >
                                    {chat.is_favourite ? <StarOff className="w-3 h-3" /> : <Star className="w-3 h-3" />}
                                    {chat.is_favourite ? 'Unfavourite' : 'Favourite'}
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleTogglePin(e, chat.id, chat.is_pinned);
                                        setActiveMenuChatId(null);
                                        setMenuPosition(null);
                                    }}
                                    className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] transition-colors ${theme === 'light' ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-[rgba(102,126,234,0.1)] text-[var(--text-secondary)]'}`}
                                >
                                    {chat.is_pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                                    {chat.is_pinned ? 'Unpin' : 'Pin'}
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        startRename(e, chat.id, chat.title);
                                        setActiveMenuChatId(null);
                                        setMenuPosition(null);
                                    }}
                                    className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] transition-colors ${theme === 'light' ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-[rgba(102,126,234,0.1)] text-[var(--text-secondary)]'}`}
                                >
                                    <Edit3 className="w-3 h-3" />
                                    Rename
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setDeletingChatId(chat.id);
                                        setActiveMenuChatId(null);
                                        setMenuPosition(null);
                                    }}
                                    className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] transition-colors hover:bg-[rgba(231,76,60,0.15)] text-[#e74c3c]`}
                                >
                                    <Trash2 className="w-3 h-3" />
                                    Delete
                                </button>
                            </div>,
                            document.body
                        )}
                    </div>
                </>
            )}
        </div>
    );

    return (
        <div className={`flex h-screen overflow-hidden ${themeClasses}`}>
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => { setSidebarOpen(false); closeMenu(); }}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:relative z-50 lg:z-auto left-0 top-0
                w-[280px] sm:w-[300px] h-full min-h-0
                theme-bg-sidebar
                transform transition-transform duration-300 ease-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                ${sidebarMinimized ? 'lg:w-0 lg:overflow-hidden' : ''}
                flex flex-col
            `}>
                {/* Sidebar Header */}
                <div className={`flex flex-col ${theme === 'light' ? 'border-gray-200' : 'border-[rgba(102,126,234,0.1)]'}`}>
                    {/* Brand */}
                    <div className="flex items-center gap-2 px-3 py-2.5">
                        <a href="/chat" className="flex items-center gap-2 min-w-0 flex-1 rounded-lg hover:opacity-80 transition-opacity" title="Start a new chat">
                            <span className="theme-logo-stack flex-shrink-0">
                                <img src={logoDark} alt="ThinkChat" className="logo-img logo-dark w-8 h-8 rounded-lg object-cover shadow-md shadow-[rgba(102,126,234,0.3)]" />
                                <img src={logoLight} alt="" aria-hidden="true" className="logo-img logo-light w-8 h-8 rounded-lg object-cover shadow-md shadow-[rgba(102,126,234,0.3)]" />
                            </span>
                            <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-sm font-bold theme-text-primary">ThinkChat</span>
                                <span className="text-[9px] theme-text-muted truncate">Where ideas meet instant answers</span>
                            </div>
                        </a>
                        {/* Sidebar Minimize Toggle */}
                        <button
                            onClick={() => setSidebarMinimized(!sidebarMinimized)}
                            className={`flex flex-col justify-center items-center w-7 h-7 rounded-lg transition-all duration-200 gap-[2px]
                                ${theme === 'light' ? 'bg-gray-100 hover:bg-gray-200' : 'bg-[rgba(102,126,234,0.15)] hover:bg-[rgba(102,126,234,0.25)]'}`}
                            title="Minimize sidebar"
                        >
                            <span className={`w-3.5 h-[2px] rounded-full ${theme === 'light' ? 'bg-gray-600' : 'bg-white'}`}></span>
                            <span className={`w-3.5 h-[2px] rounded-full ${theme === 'light' ? 'bg-gray-600' : 'bg-white'}`}></span>
                            <span className={`w-3.5 h-[2px] rounded-full ${theme === 'light' ? 'bg-gray-600' : 'bg-white'}`}></span>
                        </button>
                    </div>

                    {/* Divider */}
                    <div className={`mx-2 border-t ${theme === 'light' ? 'border-gray-200' : 'border-[rgba(102,126,234,0.1)]'}`}></div>

                    {/* Actions */}
                    <div className="p-2 space-y-1.5">
                    {safeAgents.length > 0 || adminDefaultProvider?.has_api_key ? (
                        <a href="/chat" className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-medium text-xs shadow-md shadow-[rgba(102,126,234,0.3)] hover:shadow-lg hover:-translate-y-0.5 transition-all">
                            <Plus className="w-3.5 h-3.5" /> New Chat
                        </a>
                    ) : (
                        <div className="relative group">
                            <div className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-medium text-xs shadow-md shadow-[rgba(102,126,234,0.3)] opacity-60 cursor-not-allowed">
                                <Plus className="w-3.5 h-3.5" /> New Chat
                            </div>
                            {/* Tooltip */}
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl">
                                ⚠️ Add an AI agent first
                                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-[#2d2d4a]"></div>
                            </div>
                        </div>
                    )}
                    {/* Search Bar */}
                    <input
                        type="text"
                        id="chatSearch"
                        placeholder="🔍 Search chats..."
                        onKeyUp={(e) => {
                            const filter = (e.target as HTMLInputElement).value.toLowerCase();
                            const chatItems = document.querySelectorAll('.chat-item');
                            chatItems.forEach((item) => {
                                const title = (item as HTMLElement).dataset.title || '';
                                (item as HTMLElement).style.display = title.includes(filter) ? '' : 'none';
                            });
                        }}
                        className={`w-full mt-1.5 px-2.5 py-1 text-[11px] rounded-md border outline-none transition-colors ${
                            theme === 'light'
                                ? 'bg-white border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-[#667eea]'
                                : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#667eea]'
                        }`}
                    />
                    </div>
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                    {safeChats.length === 0 ? (
                        <div className={`text-center py-8 px-3 theme-text-muted`}>
                            <div className="text-2xl mb-2 opacity-50">💬</div>
                            <p className="text-[11px] opacity-70">No conversations yet</p>
                        </div>
                    ) : (
                        <>
                            {/* ⭐ Favourites section — collapsible chevron (Design C) */}
                            <button
                                type="button"
                                onClick={() => setFavouritesCollapsed(!favouritesCollapsed)}
                                aria-expanded={!favouritesCollapsed}
                                className={`w-full flex items-center justify-between gap-1.5 px-1.5 pt-1 pb-1 rounded-md transition-colors ${theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-[rgba(102,126,234,0.06)]'}`}
                            >
                                <div className="flex items-center gap-1.5">
                                    <Star className="w-3 h-3 text-[#f59e0b]" fill="currentColor" />
                                    <span className="text-[10px] font-semibold uppercase tracking-wide theme-text-muted">
                                        Favourites{favouriteChats.length > 0 ? ` (${favouriteChats.length})` : ''}
                                    </span>
                                </div>
                                <ChevronDown className={`w-3 h-3 theme-text-muted transition-transform duration-200 ${favouritesCollapsed ? '-rotate-90' : ''}`} />
                            </button>
                            <div className={`overflow-hidden transition-all duration-200 ease-out ${favouritesCollapsed ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'}`}>
                                {favouriteChats.length === 0 ? (
                                    <div className="px-2.5 py-1.5 text-[10px] theme-text-muted italic">
                                        ⭐ Star any chat to add it here
                                    </div>
                                ) : (
                                    favouriteChats.map((chat) => renderChatItem(chat))
                                )}
                            </div>

                            {/* 💬 All Chats section — collapsible chevron, only shown when there are non-favourited chats */}
                            {otherChats.length > 0 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setAllChatsCollapsed(!allChatsCollapsed)}
                                        aria-expanded={!allChatsCollapsed}
                                        className={`w-full flex items-center justify-between gap-1.5 px-1.5 pt-2.5 pb-1 rounded-md transition-colors ${theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-[rgba(102,126,234,0.06)]'}`}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <MessageSquare className="w-3 h-3 theme-text-muted" />
                                            <span className="text-[10px] font-semibold uppercase tracking-wide theme-text-muted">
                                                All Chats ({otherChats.length})
                                            </span>
                                        </div>
                                        <ChevronDown className={`w-3 h-3 theme-text-muted transition-transform duration-200 ${allChatsCollapsed ? '-rotate-90' : ''}`} />
                                    </button>
                                    <div className={`overflow-hidden transition-all duration-200 ease-out ${allChatsCollapsed ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'}`}>
                                        {otherChats.map((chat) => renderChatItem(chat))}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Sidebar Footer */}
                <div className={`p-2 sm:p-3 md:p-4 border-t ${theme === 'light' ? 'border-gray-200' : 'border-[rgba(102,126,234,0.1)]'}`}>
                    <div className={`flex items-center gap-1.5 p-1.5 rounded-lg ${theme === 'light' ? 'bg-gray-100' : 'bg-[rgba(102,126,234,0.08)]'}`}>
                        <a href="/profile" className="flex items-center gap-1.5 flex-1 min-w-0 rounded-md hover:opacity-80 transition-opacity" title="Open profile">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0">{user?.name?.charAt(0) || 'U'}</div>
                            <div className="flex-1 min-w-0">
                                <div className={`text-[11px] font-medium truncate theme-text-primary`}>{user?.name || 'User'}</div>
                                <div className={`text-[9px] truncate ${theme === 'light' ? 'text-gray-500' : 'text-[var(--text-muted)]'}`}>{user?.email || 'user@email.com'}</div>
                            </div>
                        </a>
                        <form action="/logout" method="POST" onSubmit={handleLogout}>
                            <button
                                type="submit"
                                title="Logout"
                                className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors flex-shrink-0 ${
                                    theme === 'light'
                                        ? 'text-gray-500 hover:text-[#e74c3c] hover:bg-[rgba(231,76,60,0.12)]'
                                        : 'text-[var(--text-muted)] hover:text-[#e74c3c] hover:bg-[rgba(231,76,60,0.15)]'
                                }`}
                            >
                                <LogOut className="w-3.5 h-3.5" />
                            </button>
                        </form>
                    </div>
                </div>
            </aside>



            {/* Floating Expand Button - only visible when sidebar is minimized */}
            {sidebarMinimized && (
                <button
                    onClick={() => setSidebarMinimized(false)}
                    className={`fixed left-0 top-1/2 -translate-y-1/2 flex flex-col justify-center items-center w-10 h-10 rounded-r-lg transition-all duration-200 gap-[3px]
                        ${theme === 'light' ? 'bg-gray-100 hover:bg-gray-200 shadow-md border border-l-0' : 'bg-[var(--bg-input)] hover:bg-[var(--border-color)] shadow-lg border border-[var(--border-color)]'}
                        z-50 lg:!left-0`}
                    title="Expand sidebar"
                >
                    <span className={`w-4 h-[2px] rounded-full ${theme === 'light' ? 'bg-gray-600' : 'bg-white'}`}></span>
                    <span className={`w-4 h-[2px] rounded-full ${theme === 'light' ? 'bg-gray-600' : 'bg-white'}`}></span>
                    <span className={`w-4 h-[2px] rounded-full ${theme === 'light' ? 'bg-gray-600' : 'bg-white'}`}></span>
                </button>
            )}

            {/* Main Content */}
            <main className={`flex-1 flex flex-col min-w-0 theme-bg-app`}>
                {/* Header */}
                <header className={`flex flex-wrap items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-3 border-b border-[rgba(102,126,234,0.12)] sm:rounded-t-3xl theme-bg-header`}>
                    <div className="flex items-center gap-2 sm:gap-3">

                        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-[rgba(102,126,234,0.15)] transition-colors lg:hidden">
                            <Menu className="w-5 h-5" />
                        </button>

                        {/* Back button — shown only when on a specific chat (not the chat list / new-chat) */}
                        {currentChat?.id && (
                            <button
                                onClick={() => router.get('/chat')}
                                title="Back to chats"
                                aria-label="Back to chats"
                                className="p-2 rounded-lg hover:bg-[rgba(102,126,234,0.15)] transition-colors theme-text-secondary flex-shrink-0"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}

                        {/* Favourite button — toggles is_favourite on the current chat */}
                        {currentChat?.id && (
                            <button
                                onClick={(e) => handleToggleFavourite(e, currentChat.id, !!currentChat.is_favourite)}
                                title={currentChat.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
                                aria-label={currentChat.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
                                className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                                    currentChat.is_favourite
                                        ? 'text-[#f59e0b] hover:bg-[rgba(245,158,11,0.15)]'
                                        : 'theme-text-secondary hover:bg-[rgba(102,126,234,0.15)]'
                                }`}
                            >
                                {currentChat.is_favourite ? <Star className="w-4 h-4" fill="currentColor" /> : <Star className="w-4 h-4" />}
                            </button>
                        )}

                        <div className="flex flex-col min-w-0">
                            <h1 className={`text-sm sm:text-base font-semibold theme-text-primary leading-tight truncate max-w-[150px] sm:max-w-[300px]`}>{currentChat?.title || 'ThinkChat'}</h1>
                            <p className={`text-[9px] sm:text-[10px] theme-text-muted hidden xs:block`}>{currentChat ? 'Ready to assist' : 'Where ideas meet instant answers'}</p>
                        </div>
                    </div>
                    
                    {/* Navigation */}
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                        {/* Theme Selector */}
                        <div className="relative" ref={themeDropdownRef}>
                            <button
                                onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs hover:bg-[rgba(102,126,234,0.12)] transition-colors theme-text-secondary`}
                            >
                                {theme === 'dark' ? <Moon className="w-4 h-4" /> : theme === 'light' ? <Sun className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                                <span className="hidden sm:inline capitalize">{theme || 'System'}</span>
                            </button>
                            {themeDropdownOpen && (
                                <div className={`absolute right-0 top-full mt-1 w-36 rounded-xl py-1 z-50 shadow-xl border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#1a1a2e] border-[rgba(102,126,234,0.2)]'}`}>
                                    <button
                                        onClick={() => handleThemeChange('light')}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${theme === 'light' ? 'bg-[rgba(102,126,234,0.15)] text-[#667eea]' : 'text-gray-400 hover:bg-[rgba(102,126,234,0.08)]'}`}
                                    >
                                        <Sun className="w-3.5 h-3.5" /> Light
                                    </button>
                                    <button
                                        onClick={() => handleThemeChange('dark')}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${theme === 'dark' ? 'bg-[rgba(102,126,234,0.15)] text-[#667eea]' : 'text-gray-400 hover:bg-[rgba(102,126,234,0.08)]'}`}
                                    >
                                        <Moon className="w-3.5 h-3.5" /> Dark
                                    </button>
                                    <button
                                        onClick={() => handleThemeChange('system')}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${theme === 'system' || !theme ? 'bg-[rgba(102,126,234,0.15)] text-[#667eea]' : 'text-gray-400 hover:bg-[rgba(102,126,234,0.08)]'}`}
                                    >
                                        <Monitor className="w-3.5 h-3.5" /> System
                                    </button>
                                </div>
                            )}
                        </div>

                        <a href="/profile" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs hover:bg-[rgba(102,126,234,0.12)] transition-colors">
                            <Settings className="w-4 h-4" /> <span className="hidden sm:inline">Account</span>
                        </a>
                        <a href="/ai-agents" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs hover:bg-[rgba(102,126,234,0.12)] transition-colors">
                            <Bot className="w-4 h-4" /> <span className="hidden sm:inline">Agents</span>
                        </a>
                        {user?.is_admin && (
                            <a href="/admin" className="px-3 py-1.5 rounded-lg text-xs bg-[rgba(231,76,60,0.2)] text-[#e74c3c] hover:bg-[rgba(231,76,60,0.3)] transition-colors">Admin</a>
                        )}
                    </div>
                </header>

                {/* Chat Content */}
                <div className="flex-1 flex flex-col min-h-0">
                    {children}
                </div>
            </main>

            {/* Delete Confirmation Modal */}
            {deletingChatId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center">
                    <div className={`p-6 rounded-2xl max-w-sm w-full mx-4 shadow-2xl ${theme === 'light' ? 'bg-white' : 'bg-[var(--bg-secondary)] border border-[var(--border-color)]'}`}>
                        <h3 className={`text-lg font-semibold mb-2 theme-text-primary`}>Delete Chat?</h3>
                        <p className={`text-sm mb-5 ${theme === 'light' ? 'text-gray-500' : 'text-[var(--text-muted)]'}`}>This action cannot be undone. The chat and all its messages will be permanently deleted.</p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeletingChatId(null)}
                                className={`px-4 py-2 rounded-lg text-sm transition-colors ${theme === 'light' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[#3d3d5a]'}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteChat(deletingChatId)}
                                className="px-4 py-2 rounded-lg text-sm bg-[#e74c3c] text-white hover:bg-[#c0392b] transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Agent Selector Component
interface AgentSelectorProps {
    agents: Agent[];
    selectedAgent: Agent | null;
    onSelectAgent: (agent: Agent) => void;
    isOpen: boolean;
    onToggle: () => void;
    theme?: 'light' | 'dark' | 'system';
    adminDefaultProvider?: {
        provider: string;
        name: string;
        has_api_key: boolean;
    } | null;
    userHasAgents?: boolean;
}

export function AgentSelector({
    agents,
    selectedAgent,
    onSelectAgent,
    isOpen,
    onToggle,
    theme: selectorTheme,
    adminDefaultProvider,
    userHasAgents,
}: AgentSelectorProps) {
    const safeAgents = agents ?? [];
    
    // Container ref for click-outside detection
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Handle clicks outside the dropdown
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (!isOpen) return;
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                onToggle();
            }
        }
        if (isOpen) {
            // Use mousedown to close before any click event fires
            document.addEventListener('mousedown', handleClick);
        }
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen, onToggle]);
    const themeVal = selectorTheme ?? 'system';

    // Build the admin default agent object from provider data
    const adminDefaultAgent: Agent | null = adminDefaultProvider ? {
        id: -1,
        name: adminDefaultProvider.name,
        provider: adminDefaultProvider.provider,
        is_default: false,
        has_api_key: adminDefaultProvider.has_api_key,
        is_admin_default: true,
    } : null;

    // User's own agents (exclude the virtual admin default agent, id=-1)
    const userAgents = safeAgents.filter(a => a.id !== -1);
    // Show admin default as a separate group when:
    // 1. User has agents AND admin default exists (always show it as second option)
    // 2. User has no agents (it appears in the first/only group via safeAgents)
    const showAdminDefaultAsSecondGroup = adminDefaultAgent && userHasAgents && userAgents.length > 0;

    const renderAgentButton = (agent: Agent) => (
        <button
            key={agent.id}
            onClick={() => onSelectAgent(agent)}
            className={`
                flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg
                text-xs transition-all duration-150
                ${selectedAgent?.id === agent.id
                    ? themeVal === 'light' ? 'bg-[rgba(102,126,234,0.2)] text-gray-700 font-semibold' : 'bg-[rgba(102,126,234,0.15)] text-[var(--text-primary)] font-semibold'
                    : themeVal === 'light' ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-800' : 'text-[var(--text-secondary)] hover:bg-[var(--border-color)] hover:text-[var(--text-primary)]'}
            `}
        >
            <div className={`w-6 h-6 rounded-md bg-gradient-to-r ${getProviderGradient(agent.provider)} flex items-center justify-center flex-shrink-0`}>
                <ProviderIcon provider={agent.provider} size={14} color="#ffffff" />
            </div>
            <span className="flex-1 truncate text-left">{agent.name}</span>
            {selectedAgent?.id === agent.id && <Check className="w-3.5 h-3.5 text-[#667eea] flex-shrink-0" />}
        </button>
    );

    const renderGroupLabel = (text: string) => (
        <div className={`px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider ${themeVal === 'light' ? 'text-gray-400' : 'text-[var(--text-muted)]'}`}>
            {text}
        </div>
    );

    return (
        <div ref={containerRef} className="relative flex-shrink-0">
            <button
               
                onClick={onToggle}
                className={`
                    flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2
                    text-sm cursor-pointer
                    transition-all duration-200
                    ${isOpen ? 'border-[#667eea] shadow-lg shadow-[rgba(102,126,234,0.2)]' : ''}
                    ${themeVal === 'light' ? 'theme-bg-glass border-[var(--border-color)] hover:border-[#667eea] shadow-sm' : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] hover:border-[#667eea] shadow-sm'}
                `}
                style={{ width: '100%', maxWidth: '220px', height: '44px', boxSizing: 'border-box' }}
            >
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-r ${getProviderGradient(selectedAgent?.provider ?? 'openai')} flex items-center justify-center flex-shrink-0`}>
                    <ProviderIcon provider={selectedAgent?.provider ?? 'openai'} size={16} color="#ffffff" />
                </div>
                <span className={`flex-1 truncate text-left font-medium text-xs ${themeVal === 'light' ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)]'}`} title={selectedAgent?.name}>
                    {selectedAgent?.name ?? 'Select agent'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''} ${themeVal === 'light' ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`} />
            </button>

            {/* Dropdown - opens ABOVE the button */}
            <div className={`
                absolute bottom-full left-0 mb-2 w-72
                ${themeVal === 'light' ? 'theme-bg-glass backdrop-blur-md border-[var(--border-color)] rounded-xl shadow-xl' : 'bg-[var(--bg-secondary)] backdrop-blur-md border-[var(--border-color)] rounded-xl shadow-xl'}
                rounded-xl border shadow-xl
                transition-all duration-200 origin-bottom
                ${isOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95 pointer-events-none'}
            `}>
                <div className="p-1.5">
                    {/* User's own agents */}
                    {userAgents.length > 0 && (
                        <>
                            {renderGroupLabel('Your AI Agents')}
                            {userAgents.map(renderAgentButton)}
                        </>
                    )}

                    {/* Admin default — separate section */}
                    {showAdminDefaultAsSecondGroup && (
                        <>
                            {userAgents.length > 0 && renderGroupLabel("ThinkChat's Default")}
                            {renderAgentButton({
                                id: -1,
                                name: adminDefaultProvider!.name,
                                provider: adminDefaultProvider!.provider,
                                is_default: false,
                                has_api_key: adminDefaultProvider!.has_api_key,
                                is_admin_default: true,
                            })}
                        </>
                    )}

                    {/* Admin default when user has no agents — single option, no group label (just clutter when alone) */}
                    {userAgents.length === 0 && adminDefaultAgent && (
                        <>{renderAgentButton(adminDefaultAgent)}</>
                    )}

                    {/* No agents at all */}
                    {userAgents.length === 0 && !adminDefaultAgent && (
                        <div className={`px-2.5 py-4 text-xs text-center ${themeVal === 'light' ? 'text-gray-400' : 'text-[var(--text-muted)]'}`}>
                            No agents configured
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Model Selector Component
// Runtime-only model picker. Fetches live model list (or hardcoded fallback) from
// /api/agents/{id}/live-models whenever the selected agent changes. Auto-selects
// the "preferred" model returned by the server (provider-specific heuristic).
// Selection is NEVER persisted — parent owns selectedModel state.
interface ModelSelectorProps {
    selectedAgent: Agent | null;
    selectedModel: string;
    onSelectModel: (model: string) => void;
    theme?: 'light' | 'dark' | 'system';
}

export function ModelSelector({
    selectedAgent,
    selectedModel,
    onSelectModel,
    theme: selectorTheme,
}: ModelSelectorProps) {
    const [models, setModels] = useState<string[]>([]);
    const [preferred, setPreferred] = useState<string | null>(null);
    const [source, setSource] = useState<string>('');
    const [warning, setWarning] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const lastFetchedAgentRef = useRef<string | null>(null);

    const themeVal = selectorTheme ?? 'system';

    // Fetch models whenever selectedAgent changes.
    // Cancellable: if agent changes mid-flight, drop the stale response.
    useEffect(() => {
        if (!selectedAgent) {
            setModels([]);
            setPreferred(null);
            setSource('');
            setWarning(null);
            setIsError(null);
            setIsLoading(false);
            lastFetchedAgentRef.current = null;
            return;
        }

        const agentKey = `${selectedAgent.is_admin_default ? -1 : selectedAgent.id}`;

        // No API key for this agent — show error state, skip fetch.
        if (selectedAgent.has_api_key === false) {
            setIsLoading(false);
            setIsError('No API key configured for this agent.');
            setModels([]);
            setPreferred(null);
            onSelectModel('');
            return;
        }

        lastFetchedAgentRef.current = agentKey;

        let cancelled = false;
        setIsLoading(true);
        setIsError(null);

        fetch(`/api/agents/${agentKey}/live-models`, {
            headers: { 'Accept': 'application/json' },
            credentials: 'same-origin',
        })
            .then(async (r) => {
                const data = await r.json().catch(() => ({}));
                if (cancelled) return;
                if (!r.ok || !data.success) {
                    setIsError(data.error || `Request failed (${r.status})`);
                    setModels([]);
                    setPreferred(null);
                    onSelectModel('');
                    return;
                }
                const ms = Array.isArray(data.models) ? data.models : [];
                setModels(ms);
                setPreferred(data.preferred ?? null);
                setSource(data.source ?? '');
                setWarning(data.warning ?? null);

                // Auto-select the server-preferred model (or first available).
                const pick = data.preferred || ms[0] || '';
                onSelectModel(pick);
            })
            .catch((err) => {
                if (cancelled) return;
                setIsError('Network error: ' + (err?.message || 'unknown'));
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        selectedAgent?.id ?? null,
        selectedAgent?.is_admin_default ?? null,
        selectedAgent?.has_api_key ?? null,
    ]);

    // Click-outside to close
    useEffect(() => {
        if (!isOpen) return;
        function handle(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [isOpen]);

    const disabled = !selectedAgent || (isLoading && models.length === 0);

    const buttonLabel = (() => {
        if (!selectedAgent) return 'Pick agent first';
        if (isLoading) return 'Loading…';
        if (isError) return 'Model error';
        if (selectedModel) {
            return selectedModel.length > 22 ? selectedModel.slice(0, 22) + '…' : selectedModel;
        }
        if (models.length === 0) return 'No models';
        return 'Pick model';
    })();

    const sourceLabel = (() => {
        switch (source) {
            case 'live_api': return 'live API';
            case 'hardcoded': return 'built-in list';
            case 'no_api_key': return 'no API key';
            case 'unsupported': return 'unsupported';
            default: return source || '';
        }
    })();

    return (
        <div ref={containerRef} className="relative flex-shrink-0">
            {/* Inline scoped styles for the dropdown scrollbar. Webkit-only;
                Firefox falls back to its native thin scrollbar via scrollbarWidth. */}
            <style>{`
                .model-dropdown-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
                .model-dropdown-scroll::-webkit-scrollbar-track { background: transparent; }
                .model-dropdown-scroll::-webkit-scrollbar-thumb {
                    background-color: rgba(102, 126, 234, 0.35);
                    border-radius: 3px;
                }
                .model-dropdown-scroll::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(102, 126, 234, 0.6);
                }
            `}</style>

            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                aria-label="Model selector"
                title={selectedModel || 'No model selected'}
                className={`
                    flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2
                    text-sm cursor-pointer
                    transition-all duration-200
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    ${isOpen ? 'border-[#667eea] shadow-lg shadow-[rgba(102,126,234,0.2)]' : ''}
                    ${themeVal === 'light'
                        ? 'theme-bg-glass border-[var(--border-color)] hover:border-[#667eea] shadow-sm'
                        : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] hover:border-[#667eea] shadow-sm'}
                `}
                style={{ width: '100%', maxWidth: '180px', height: '44px', boxSizing: 'border-box' }}
            >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isError
                        ? 'bg-gradient-to-r from-red-500 to-red-700'
                        : 'bg-gradient-to-r from-[#667eea] to-[#764ba2]'
                }`}>
                    {isError
                        ? <AlertTriangle className="w-4 h-4 text-white" />
                        : <Cpu className="w-4 h-4 text-white" />}
                </div>
                <span className={`flex-1 truncate text-left font-medium text-xs ${themeVal === 'light' ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)]'}`}>
                    {buttonLabel}
                </span>
                {isLoading ? (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-[var(--text-muted)] border-t-transparent animate-spin flex-shrink-0" />
                ) : (
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''} ${themeVal === 'light' ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`} />
                )}
            </button>

            {/* Dropdown opens ABOVE the button (same UX as AgentSelector).
                The list area is height-capped (max-h-72 = 18rem) and scrollable
                so long model lists (OpenAI typically 50+, Bedrock 40+) stay usable.
                Header + footer are pinned outside the scroll area. */}
            <div className={`
                absolute bottom-full left-0 mb-2 w-80
                ${themeVal === 'light'
                    ? 'theme-bg-glass backdrop-blur-md border-[var(--border-color)] rounded-xl shadow-xl'
                    : 'bg-[var(--bg-secondary)] backdrop-blur-md border-[var(--border-color)] rounded-xl shadow-xl'}
                rounded-xl border shadow-xl
                transition-all duration-200 origin-bottom
                ${isOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95 pointer-events-none'}
            `}>
                <div className="p-1.5 flex flex-col">
                    {/* Error: pinned above the scroll area (short, fits naturally) */}
                    {isError && (
                        <div className="px-2.5 py-3 text-xs text-red-500 flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <span className="flex-1">{isError}</span>
                        </div>
                    )}

                    {/* Scrollable list area. max-h-72 ≈ 288px (~8 buttons visible).
                        We also clamp to 60vh of viewport for very small screens. */}
                    {!isError && (
                        <div
                            className="max-h-72 overflow-y-auto model-dropdown-scroll"
                            style={{
                                maxHeight: 'min(18rem, 60vh)',
                                scrollbarWidth: 'thin',
                                scrollbarColor: 'rgba(102,126,234,0.4) transparent',
                            }}
                        >
                            {/* Models list */}
                            {models.length > 0 && (
                                <>
                                    <div className={`px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider sticky top-0 z-[1] ${
                                        themeVal === 'light'
                                            ? 'text-gray-400 bg-[var(--bg-glass,rgba(255,255,255,0.85))]'
                                            : 'text-[var(--text-muted)] bg-[var(--bg-secondary,rgba(26,26,46,0.95))]'
                                    } backdrop-blur-sm`}>
                                        Models ({models.length})
                                    </div>
                                    {models.map((model) => {
                                        const isPreferred = model === preferred;
                                        const isSelected = model === selectedModel;
                                        return (
                                            <button
                                                key={model}
                                                onClick={() => {
                                                    onSelectModel(model);
                                                    setIsOpen(false);
                                                }}
                                                className={`
                                                    flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg
                                                    text-xs transition-all duration-150
                                                    ${isSelected
                                                        ? themeVal === 'light'
                                                            ? 'bg-[rgba(102,126,234,0.2)] text-gray-700 font-semibold'
                                                            : 'bg-[rgba(102,126,234,0.15)] text-[var(--text-primary)] font-semibold'
                                                        : themeVal === 'light'
                                                            ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                                                            : 'text-[var(--text-secondary)] hover:bg-[var(--border-color)] hover:text-[var(--text-primary)]'}
                                                `}
                                            >
                                                <Cpu className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-[#667eea]' : 'opacity-60'}`} />
                                                <span className="flex-1 truncate text-left font-mono">{model}</span>
                                                {isPreferred && (
                                                    <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                                                        themeVal === 'light'
                                                            ? 'bg-[rgba(102,126,234,0.15)] text-[#667eea]'
                                                            : 'bg-[rgba(102,126,234,0.25)] text-[#a5b4fc]'
                                                    }`}>
                                                        default
                                                    </span>
                                                )}
                                                {isSelected && <Check className="w-3.5 h-3.5 text-[#667eea] flex-shrink-0" />}
                                            </button>
                                        );
                                    })}
                                </>
                            )}

                            {/* Empty state (no error, not loading, no models) */}
                            {!isLoading && models.length === 0 && (
                                <div className={`px-2.5 py-4 text-xs text-center ${themeVal === 'light' ? 'text-gray-400' : 'text-[var(--text-muted)]'}`}>
                                    No models available for this agent.
                                </div>
                            )}

                            {/* Loading state (no models yet) */}
                            {isLoading && models.length === 0 && (
                                <div className={`px-2.5 py-4 text-xs text-center ${themeVal === 'light' ? 'text-gray-400' : 'text-[var(--text-muted)]'}`}>
                                    <span className="inline-block w-3 h-3 mr-2 rounded-full border-2 border-[var(--text-muted)] border-t-transparent animate-spin align-middle" />
                                    Fetching models from provider…
                                </div>
                            )}
                        </div>
                    )}

                    {/* Source + warning footer — pinned below the scroll area */}
                    {(sourceLabel || warning) && !isError && (
                        <div className={`px-2.5 pt-1.5 pb-1 mt-1 border-t flex-shrink-0 ${themeVal === 'light' ? 'border-gray-200' : 'border-[var(--border-color)]'}`}>
                            {sourceLabel && (
                                <div className={`text-[10px] ${themeVal === 'light' ? 'text-gray-400' : 'text-[var(--text-muted)]'}`}>
                                    Source: {sourceLabel}
                                </div>
                            )}
                            {warning && (
                                <div className="text-[10px] text-amber-500 mt-0.5">⚠️ {warning}</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Chat Input Component
export function ChatInput({
    value,
    onChange,
    onSubmit,
    onStop,
    isStreaming = false,
    placeholder = "Type your message here...",
    disabled = false,
    theme = 'system',
    attachments = [],
    onAttach = () => {},
    onRemoveAttachment = () => {}
}: {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onStop?: () => void;
    isStreaming?: boolean;
    placeholder?: string;
    disabled?: boolean;
    theme?: 'light' | 'dark' | 'system';
    attachments?: File[];
    onAttach?: (files: File[]) => void;
    onRemoveAttachment?: (index: number) => void;
}) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewSrc, setPreviewSrc] = useState<string | null>(null);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (isStreaming) return; // ignore Enter while streaming (Stop button takes over)
            if (!disabled && (value.trim() || attachments.length > 0)) onSubmit();
        }
    };

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
        }
    }, [value]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            onAttach(Array.from(e.target.files));
            e.target.value = '';
        }
    };

    const getFileIcon = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const icons: Record<string, string> = {
            'pdf': '📄', 'doc': '📝', 'docx': '📝', 'txt': '📃',
            'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️', 'webp': '🖼️',
            'csv': '📊', 'json': '📋', 'xml': '📋',
            'md': '📝', 'html': '🌐', 'css': '🎨', 'js': '📜',
            'py': '🐍', 'php': '🐘', 'rb': '💎', 'java': '☕', 'c': '⚙️', 'cpp': '⚙️'
        };
        return icons[ext] || '📎';
    };

    return (
        <div className="flex flex-col gap-2 flex-1">
            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 rounded-xl theme-bg-glass border border-white/30 backdrop-blur-sm">
                    {attachments.map((file, index) => {
                        const isImage = file.type && file.type.startsWith('image/');
                        const url = URL.createObjectURL(file);
                        return (
                            <div key={index} className={`relative flex items-center gap-1.5 px-2 py-1 rounded-md theme-bg-sidebar text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-200'} ${isImage ? 'flex-col !px-1 !py-1' : ''}`}>
                                {isImage ? (
                                    <>
                                        <div className="relative cursor-pointer" onClick={() => setPreviewSrc(url)}>
                                            <img src={url} alt={file.name} className="w-14 h-12 object-cover rounded" />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30 rounded">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                                            </div>
                                        </div>
                                        <span className="max-w-[56px] truncate text-[10px]" title={file.name}>{file.name.length > 10 ? file.name.substring(0, 7) + '...' : file.name}</span>
                                    </>
                                ) : (
                                    <>
                                        <span>{getFileIcon(file.name)}</span>
                                        <span className="max-w-[100px] truncate" title={file.name}>{file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name}</span>
                                    </>
                                )}
                                <button
                                    type="button"
                                    onClick={() => onRemoveAttachment(index)}
                                    className={`${isImage ? '!absolute !top-0.5 !right-0.5 !bg-red-500/80 !rounded-full !w-4 !h-4 !flex !items-center !justify-center' : 'ml-1'} text-white hover:!bg-red-500 cursor-pointer flex-shrink-0`}
                                    style={isImage ? { fontSize: '0.5rem', lineHeight: 1, padding: '2px' } : {}}
                                    title="Remove"
                                >
                                    ✕
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
            <div className="flex gap-2.5 items-end flex-1">
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".txt,.pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.csv,.json,.xml,.md,.html,.css,.js,.py,.php,.rb,.java,.c,.cpp,.h"
                    onChange={handleFileChange}
                    className="hidden"
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-[44px] h-[44px] rounded-xl border-2 flex items-center justify-center cursor-pointer transition-all duration-200 flex-shrink-0 ${
                        theme === 'light' ? 'theme-bg-glass border-white/40 text-gray-500 hover:border-[#667eea] hover:text-[#667eea] shadow-sm' : 'bg-[var(--bg-tertiary)] border-white/10 text-gray-400 hover:border-[#667eea] hover:text-[#667eea] shadow-sm'
                    } ${attachments.length > 0 ? 'border-[#667eea] text-[#667eea]' : ''}`}
                >
                    <Paperclip className="w-4 h-4" />
                </button>
                <textarea
                    ref={textareaRef}
                    id="chatMessage"
                    name="message"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    rows={1}
                    className={`
                        flex-1 px-4 py-3 min-h-[48px] max-h-[160px] rounded-xl border-2 resize-none font-inherit leading-relaxed transition-all duration-200 focus:outline-none focus:border-[#667eea]
                        ${theme === 'light' ? 'theme-bg-glass border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] shadow-sm' : 'theme-bg-input border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] shadow-sm'}
                    `}
                    style={{ boxSizing: 'border-box', height: '48px' }}
                />
                {isStreaming ? (
                    // Stop generating — aborts the active SSE stream in-flight.
                    // Replacing the Send button in the same slot keeps the input
                    // row width identical (no layout jump when streaming starts/ends).
                    <div className="relative group flex-shrink-0">
                        <button
                            type="button"
                            onClick={onStop}
                            aria-label="Stop generating"
                            className="w-[44px] h-[44px] rounded-2xl border-none cursor-pointer text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 flex-shrink-0 bg-gradient-to-r from-red-500 to-red-600 shadow-[rgba(239,68,68,0.4)] hover:shadow-xl"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="6" width="12" height="12" rx="1.5" />
                            </svg>
                        </button>
                        {/* Tooltip — appears above the button on hover/focus */}
                        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2.5 py-1.5 rounded-lg bg-[#1f1f3a] text-white text-xs font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-150 z-50 shadow-xl">
                            Stop generating
                            {/* Arrow pointing down at the button */}
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-[#1f1f3a]"></div>
                        </div>
                    </div>
                ) : (
                    <div className="relative group flex-shrink-0">
                        <button
                            type="button"
                            disabled={disabled || (!value.trim() && attachments.length === 0)}
                            onClick={onSubmit}
                            aria-label="Send message"
                            className="w-[44px] h-[44px] rounded-2xl bg-gradient-to-r from-[#667eea] to-[#764ba2] border-none cursor-pointer text-white flex items-center justify-center shadow-lg shadow-[rgba(102,126,234,0.4)] hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex-shrink-0"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                        {/* Tooltip — only show when button is enabled (avoids tooltip on disabled state) */}
                        {!(disabled || (!value.trim() && attachments.length === 0)) && (
                            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2.5 py-1.5 rounded-lg bg-[#1f1f3a] text-white text-xs font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-150 z-50 shadow-xl">
                                Send message
                                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-[#1f1f3a]"></div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Image preview lightbox */}
            {previewSrc && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
                    onClick={() => setPreviewSrc(null)}
                >
                    <div className="relative max-w-[90vw] max-h-[90vh]">
                        <button
                            onClick={() => setPreviewSrc(null)}
                            className="absolute -top-10 right-0 text-[var(--text-primary)] hover:text-[var(--text-secondary)] transition-colors flex items-center gap-1 text-sm cursor-pointer"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            Close
                        </button>
                        <img
                            src={previewSrc}
                            alt="Preview"
                            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// Message Bubble Component
function getFileTypeIcon(mime: string): string {
    const icons: Record<string, string> = {
        'text/x-php': '🐘',
        'text/html': '🌐',
        'text/css': '🎨',
        'text/javascript': '📜',
        'application/javascript': '📜',
        'application/json': '📋',
        'text/plain': '📃',
        'text/markdown': '📝',
        'text/x-python': '🐍',
        'text/x-java': '☕',
        'text/x-c': '⚙️',
        'text/x-cpp': '⚙️',
        'application/pdf': '📄',
        'application/zip': '🗜️',
        'application/x-rar': '🗜️',
        'application/vnd.ms-word': '📝',
        'application/msword': '📝',
    };
    return icons[mime] || '📎';
}

function formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}

function getAttachmentUrl(path: string, userId: number): string {
    // If it's a blob URL (local preview), use it directly
    if (path.startsWith('blob:')) {
        return path;
    }
    // Otherwise construct server URL from storage path
    const filename = path.split('/').pop() || '';
    return `/attachment/${userId}/${encodeURIComponent(filename)}`;
}

export const MessageBubble = memo(function MessageBubble({ message, userId, onImageClick }: { message: Message; userId?: number; onImageClick?: (src: string) => void }) {
    const isUser = message.role === 'user';
    const themeVal = 'system'; // Default theme for MessageBubble

    // While tokens are actively streaming in, render the text in plain
    // whitespace-pre-wrap mode instead of running it through formatMessage().
    // The markdown parser re-parses incomplete lines every render — bullets,
    // numbered lists, paragraph boundaries — causing visible reflow / "jump"
    // on each chunk. Plain rendering keeps the bubble rock-stable during
    // the stream; the formatted version is applied only after streaming ends.
    const isStreaming = message.streaming === true;

    const formattedContent = useMemo(() => {
        // Skip expensive parse while streaming — return raw text in a token array.
        if (isStreaming) return null;
        return formatMessage(message.message);
    }, [message.message, isStreaming]);

    // Normalize attachments to a typed array. The DB column is cast to
    // 'array' but legacy rows may be double-encoded JSON strings (e.g.
    // attachments = '[{"name":...}]' as a string instead of an array).
    // Without this guard, message.attachments?.filter() would crash because
    // strings don't have a .filter() method.
    const normalizedAttachments: Attachment[] = useMemo(() => {
        let atts: any = message.attachments;
        // Double-encoded JSON: cast returned a string instead of an array.
        if (typeof atts === 'string') {
            try {
                atts = JSON.parse(atts);
                // Second decode if it's still a string after first parse.
                if (typeof atts === 'string') {
                    atts = JSON.parse(atts);
                }
            } catch {
                return [];
            }
        }
        // Single object (legacy generated-image shape or malformed data):
        // wrap in an array if it has any expected attachment keys.
        if (atts && !Array.isArray(atts) && typeof atts === 'object') {
            // Generated-image payload shape: {type:'image', images:[...]}.
            // Leave as-is; the generatedImages IIFE below handles it.
            if (atts.type === 'image') return [];
            atts = [atts];
        }
        return Array.isArray(atts) ? atts : [];
    }, [message.attachments]);

    // Filter image attachments (uploaded files)
    const imageAttachments = normalizedAttachments.filter(
        (att) => att.mime && att.mime.startsWith('image/')
    );

    // Filter generated images (stored in attachments with type='image')
    const generatedImages = (() => {
        const atts: any = message.attachments;
        if (!atts) return [];
        // Unwrap double-encoded JSON so the type check below works.
        let candidate: any = atts;
        if (typeof candidate === 'string') {
            try {
                candidate = JSON.parse(candidate);
                if (typeof candidate === 'string') candidate = JSON.parse(candidate);
            } catch {
                return [];
            }
        }
        if (candidate && !Array.isArray(candidate) && typeof candidate === 'object'
            && (candidate as AttachmentWithType).type === 'image'
            && (candidate as AttachmentWithType).images) {
            return (candidate as AttachmentWithType).images || [];
        }
        return [];
    })();

    const fileAttachments = normalizedAttachments.filter(
        (att) => att.mime && !att.mime.startsWith('image/')
    );

    const hasText = message.message.trim().length > 0;
    const hasImages = imageAttachments.length > 0;
    const hasGeneratedImages = generatedImages.length > 0;
    const hasFiles = fileAttachments.length > 0;

    if (!hasText && !hasImages && !hasGeneratedImages && !hasFiles) return null;

    return (
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mx-3 sm:mx-5 md:mx-8`}>
            {/* Render image attachments */}
            {hasImages && (
                <div className={`flex flex-wrap gap-2 ${hasText ? 'mb-2' : ''}`}>
                    {imageAttachments.map((att, idx) => (
                        <div key={idx} className="relative group cursor-pointer" onClick={() => onImageClick?.(getAttachmentUrl(att.path, userId || 0))}>
                            <img
                                src={getAttachmentUrl(att.path, userId || 0)}
                                alt={att.name}
                                className="max-w-[250px] max-h-[200px] rounded-lg object-cover border border-[rgba(102,126,234,0.2)] group-hover:opacity-80 transition-opacity"
                                style={{ display: 'block' }}
                                onClick={(e) => { e.stopPropagation(); onImageClick?.(getAttachmentUrl(att.path, userId || 0)); }}
                            />
                            <span className="absolute bottom-1 left-1 right-1 text-[10px] text-white bg-black/50 rounded px-1 py-0.5 truncate text-center pointer-events-none">
                                {att.name}
                            </span>
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <div className="bg-black/50 rounded-lg p-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {/* Render generated images */}
            {hasGeneratedImages && (
                <div className={`flex flex-wrap gap-2 ${hasText ? 'mb-2' : ''}`}>
                    {generatedImages.map((img, idx) => (
                        <div key={`gen-${idx}`} className="relative group cursor-pointer" onClick={() => onImageClick?.(img.path)}>
                            <img
                                src={img.path}
                                alt={img.prompt}
                                className="max-w-[350px] max-h-[300px] rounded-lg object-cover border border-[rgba(102,126,234,0.3)] group-hover:opacity-80 transition-opacity"
                                style={{ display: 'block' }}
                                onClick={(e) => { e.stopPropagation(); onImageClick?.(img.path); }}
                            />
                            <div className="absolute bottom-1 left-1 right-1">
                                <div className="text-[10px] text-white bg-black/50 rounded px-1.5 py-1 truncate text-center">
                                    <span className="font-medium">{img.model}</span>
                                    <span className="text-white/70 ml-1">• {img.provider}</span>
                                </div>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <div className="bg-black/50 rounded-lg p-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Render non-image file attachments */}
            {hasFiles && (
                <div className={`flex flex-wrap gap-2 ${hasText ? 'mb-2' : ''}`}>
                    {fileAttachments.map((att, idx) => (
                        <a
                            key={idx}
                            href={getAttachmentUrl(att.path, userId || 0)}
                            download={att.name}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--border-color)] border border-[#3d3d5a] hover:border-[#667eea] transition-colors max-w-[250px] no-underline"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <span className="text-lg flex-shrink-0">{getFileTypeIcon(att.mime)}</span>
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs text-[var(--text-primary)] truncate" title={att.name}>{att.name}</span>
                                <span className="text-[10px] text-[var(--text-muted)]">{formatFileSize(att.size)}</span>
                            </div>
                        </a>
                    ))}
                </div>
            )}
            {/* Only show message bubble if there's actual text */}
            {hasText && (
                <div className={`
                    px-3 py-1.5 rounded-xl text-sm leading-relaxed break-words overflow-wrap-anywhere max-w-[85vw] sm:max-w-[75%]
                    ${isUser ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-br-md shadow-lg shadow-[rgba(102,126,234,0.2)]' : (themeVal === 'light' ? 'bg-white text-gray-800 border border-gray-200 rounded-bl-md' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)] rounded-bl-md')}
                `}>
                    {isStreaming ? (
                        // Streaming view: plain whitespace-preserving text. No
                        // markdown parsing. Token-by-token changes don't trigger
                        // paragraph / bullet reflow. The trailing .streaming-cursor
                        // span blinks on/off like ChatGPT/Gemini while tokens arrive.
                        <div className="whitespace-pre-wrap font-sans">{message.message}<span className="streaming-cursor" aria-hidden="true" /></div>
                    ) : (
                        formattedContent
                    )}
                </div>
            )}
            <span className="text-[10px] text-[var(--text-muted)] mt-1.5 px-1" title={message.created_at ? new Date(message.created_at).toLocaleString() : ''}>
                {message.created_at ? (() => {
                    const _d = new Date(message.created_at);
                    const _now = new Date();
                    const _t = _d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                    const _isSame = (a: Date, b: Date) =>
                        a.getFullYear() === b.getFullYear() &&
                        a.getMonth() === b.getMonth() &&
                        a.getDate() === b.getDate();
                    const _y = new Date(_now);
                    _y.setDate(_now.getDate() - 1);
                    if (_isSame(_d, _now)) return `Today, ${_t}`;
                    if (_isSame(_d, _y)) return `Yesterday, ${_t}`;
                    const _md = _d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    if (_d.getFullYear() === _now.getFullYear()) return `${_md}, ${_t}`;
                    return `${_md} ${_d.getFullYear()}, ${_t}`;
                })() : ''}
            </span>
        </div>
    );
});

// Typing Indicator
export function TypingIndicator() {
    return (
        <div className="flex items-start self-start max-w-[75vw] sm:max-w-[75%]">
            <div className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        </div>
    );
}

// Lightbox Component
export function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
            onClick={onClose}
        >
            <div className="relative max-w-[90vw] max-h-[90vh]">
                <button
                    onClick={onClose}
                    className="absolute -top-10 right-0 text-[var(--text-primary)] hover:text-[var(--text-secondary)] transition-colors flex items-center gap-1 text-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Close
                </button>
                <img
                    src={src}
                    alt="Full size"
                    className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        </div>
    );
}