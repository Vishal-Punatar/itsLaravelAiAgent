import { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, Zap, MessageSquare, ChevronDown, Check, Send, Menu, Plus, Settings, LogOut, Pin, PinOff, Sun, Moon, Monitor, Edit3, X, Trash2, MoreVertical, Paperclip } from 'lucide-react';
import { useMemo } from 'react';
import ProviderIcon, { getProviderGradient } from '@/components/ProviderIcon';

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
    is_pinned?: boolean;
    pinned_order?: number | null;
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
}

export default function ChatLayout({
    agents,
    chats,
    currentChat,
    user,
    children,
    theme: themeProp
}: ChatLayoutProps) {
    // Safety check - ensure user has a default structure
       const safeUser = user ?? { is_admin: false, theme: 'system' };
    // Use passed theme prop, falling back to user's saved theme or system preference
    const [theme, setTheme] = useState(themeProp ?? safeUser?.theme ?? 'system');
    // Ensure agents and chats are always arrays to prevent undefined errors
    const safeAgents = agents ?? [];
    const safeChats = chats ?? [];
    
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarMinimized, setSidebarMinimized] = useState(false);
    const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
    const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
    const [editingChatId, setEditingChatId] = useState<number | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [deletingChatId, setDeletingChatId] = useState<number | null>(null);
    const [activeMenuChatId, setActiveMenuChatId] = useState<number | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const themeDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Apply theme on initial load
        applyTheme(theme || 'system');
    }, [theme]);

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
                }
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeMenuChatId]);

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
        const form = e.currentTarget;
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = '_token';
        input.value = csrfToken;
        form.appendChild(input);
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

    const closeMenu = () => setActiveMenuChatId(null);

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
        // Save to localStorage immediately so theme persists across page loads
        try {
            localStorage.setItem('app_theme', newTheme);
        } catch (e) {}
        
        // Apply theme immediately for smooth transition
        applyTheme(newTheme);
        setTheme(newTheme);
        setThemeDropdownOpen(false);
        
        // Persist to server in background
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
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

    const applyTheme = (theme: 'light' | 'dark' | 'system') => {
        const root = document.documentElement;
        const effectiveTheme = theme === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : theme;

        // Check if theme actually changed
        const currentDataTheme = root.getAttribute('data-theme');
        const currentEffective = currentDataTheme === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : currentDataTheme;

        if (currentEffective === effectiveTheme) return;

        // Step 1: Add .transitioning class to <html> — this activates CSS transitions
        root.classList.add('transitioning');

        // Step 2: Wait 2 frames (requestAnimationFrame x2) so browser paints the
        //         transition state BEFORE we change the actual theme values.
        //         This makes ALL components transition as ONE unified surface.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                root.classList.toggle('light', effectiveTheme === 'light');
                root.classList.toggle('dark', effectiveTheme === 'dark');
                root.setAttribute('data-theme', effectiveTheme);
                // Apply to <body> too so footer and fixed/sticky elements get the class
                document.body.classList.toggle('light', effectiveTheme === 'light');
                document.body.classList.toggle('dark', effectiveTheme === 'dark');

                // Step 3: After transition completes, remove .transitioning class
                setTimeout(() => root.classList.remove('transitioning'), 300);
            });
        });
    };

    // Listen for system theme changes when theme is 'system'
    useEffect(() => {
        if (theme !== 'system') return;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemThemeChange = () => applyTheme('system');
        mediaQuery.addEventListener('change', handleSystemThemeChange);
        return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }, [theme]);

    // Use CSS variable-based classes for smooth atomic transitions
    // The .light/.dark class on <html> drives the actual color change
    const themeClasses = 'theme-bg-app theme-text-primary';

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
                relative
                fixed lg:relative z-50 lg:z-auto
                w-[280px] h-full
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
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center flex-shrink-0 shadow-md shadow-[rgba(102,126,234,0.3)]">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-sm font-bold theme-text-primary">ThinkChat</span>
                            <span className="text-[9px] theme-text-muted truncate">Where ideas meet instant answers</span>
                        </div>
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
                    {safeAgents.length > 0 ? (
                        <a href="/chat" className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-medium text-xs shadow-md shadow-[rgba(102,126,234,0.3)] hover:shadow-lg hover:-translate-y-0.5 transition-all">
                            <Plus className="w-3.5 h-3.5" /> New Chat
                        </a>
                    ) : (
                        <div className="relative group">
                            <div className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-medium text-xs shadow-md shadow-[rgba(102,126,234,0.3)] opacity-60 cursor-not-allowed">
                                <Plus className="w-3.5 h-3.5" /> New Chat
                            </div>
                            {/* Tooltip */}
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 rounded-lg bg-[#1a1a2e] border border-[#2d2d4a] text-white text-xs whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl">
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
                                : 'bg-[#1e1e32] border-[#2d2d4a] text-white placeholder:text-[#555] focus:border-[#667eea]'
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
                        safeChats.map((chat) => (
                            <div key={chat.id} className={`
                                flex items-center gap-1.5 p-1.5 rounded-lg transition-all duration-200 group chat-item
                                ${currentChat?.id === chat.id ? 'bg-[rgba(102,126,234,0.15)] border border-[rgba(102,126,234,0.25)]' : 'border border-transparent hover:bg-[rgba(102,126,234,0.08)]'}
                            `} data-title={chat.title.toLowerCase()}>
                                {editingChatId === chat.id ? (
                                    <form onSubmit={(e) => { e.preventDefault(); handleRenameChat(chat.id); }} className="flex items-center gap-1.5 flex-1 min-w-0">
                                        <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs flex-shrink-0 bg-gradient-to-r from-[#667eea] to-[#764ba2]`}>
                                            ✏️
                                        </div>
                                        <input
                                            type="text"
                                            value={editingTitle}
                                            onChange={(e) => setEditingTitle(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Escape') setEditingChatId(null);
                                            }}
                                            autoFocus
                                            className={`flex-1 px-1.5 py-0.5 text-xs rounded-md border outline-none min-w-0 theme-bg-input theme-border theme-text-primary`}
                                        />
                                        <button type="submit" className="p-1 rounded-md bg-[rgba(102,126,234,0.2)] text-[#667eea] hover:bg-[rgba(102,126,234,0.3)]" title="Save">
                                            <Check className="w-3 h-3" />
                                        </button>
                                        <button type="button" onClick={() => setEditingChatId(null)} className="p-1 rounded-md hover:bg-[rgba(231,76,60,0.2)] text-[#888] hover:text-[#e74c3c]" title="Cancel">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </form>
                                ) : (
                                    <>
                                        <a href={`/chat/${chat.id}`} className="flex items-center gap-2 flex-1 min-w-0">
                                            <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs flex-shrink-0 ${chat.is_pinned ? 'bg-gradient-to-r from-[#f59e0b] to-[#d97706]' : 'bg-gradient-to-r from-[#667eea] to-[#764ba2]'}`}>
                                                {chat.is_pinned ? '📌' : '💬'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-xs font-medium truncate theme-text-primary`}>{chat.title}</span>
                                                    <span className={`text-[9px] ml-1.5 flex-shrink-0 theme-text-muted`}>{formatDate(chat.created_at)}</span>
                                                </div>
                                                {getPreviewText(chat) && (
                                                    <p className={`text-[10px] truncate mt-0.5 theme-text-muted`}>{getPreviewText(chat)}</p>
                                                )}
                                            </div>
                                        </a>
                                        <div className="relative">
                                            <button
                                                data-chat-menu={chat.id}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setActiveMenuChatId(activeMenuChatId === chat.id ? null : chat.id);
                                                }}
                                                className="p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-[rgba(102,126,234,0.15)] text-[#888]"
                                            >
                                                <MoreVertical className="w-3.5 h-3.5" />
                                            </button>
                                            {activeMenuChatId === chat.id && (
                                                <div data-chat-dropdown={chat.id} className={`absolute right-0 top-full mt-1 w-32 rounded-lg overflow-hidden shadow-xl z-50 border theme-bg-card theme-border`}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handleTogglePin(e, chat.id, chat.is_pinned);
                                                            setActiveMenuChatId(null);
                                                        }}
                                                        className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] transition-colors ${theme === 'light' ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-[rgba(102,126,234,0.1)] text-[#b0b0b0]'}`}
                                                    >
                                                        {chat.is_pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                                                        {chat.is_pinned ? 'Unpin' : 'Pin'}
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            startRename(e, chat.id, chat.title);
                                                            setActiveMenuChatId(null);
                                                        }}
                                                        className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] transition-colors ${theme === 'light' ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-[rgba(102,126,234,0.1)] text-[#b0b0b0]'}`}
                                                    >
                                                        <Edit3 className="w-3 h-3" />
                                                        Rename
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setDeletingChatId(chat.id);
                                                            setActiveMenuChatId(null);
                                                        }}
                                                        className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] transition-colors hover:bg-[rgba(231,76,60,0.15)] text-[#e74c3c]`}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Sidebar Footer */}
                <div className={`p-2 sm:p-3 md:p-4 border-t ${theme === 'light' ? 'border-gray-200' : 'border-[rgba(102,126,234,0.1)]'}`}>
                    <div className={`flex items-center gap-1.5 p-1.5 rounded-lg ${theme === 'light' ? 'bg-gray-100' : 'bg-[rgba(102,126,234,0.08)]'}`}>
                        <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0">{user?.name?.charAt(0) || 'U'}</div>
                        <div className="flex-1 min-w-0">
                            <div className={`text-[11px] font-medium truncate theme-text-primary`}>{user?.name || 'User'}</div>
                            <div className={`text-[9px] truncate ${theme === 'light' ? 'text-gray-500' : 'text-[#555]'}`}>{user?.email || 'user@email.com'}</div>
                        </div>
                    </div>
                </div>
            </aside>



            {/* Floating Expand Button - only visible when sidebar is minimized */}
            {sidebarMinimized && (
                <button
                    onClick={() => setSidebarMinimized(false)}
                    className={`fixed left-0 top-1/2 -translate-y-1/2 flex flex-col justify-center items-center w-10 h-10 rounded-r-lg transition-all duration-200 gap-[3px]
                        ${theme === 'light' ? 'bg-gray-100 hover:bg-gray-200 shadow-md border border-l-0' : 'bg-[#252542] hover:bg-[#2d2d4a] shadow-lg border border-[#2d2d4a]'}
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
                <header className={`flex flex-wrap items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-3 border-b border-[rgba(102,126,234,0.12)] theme-bg-header`}>
                    <div className="flex items-center gap-2 sm:gap-3">

                        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-[rgba(102,126,234,0.15)] transition-colors lg:hidden">
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center shadow-md shadow-[rgba(102,126,234,0.3)]">
                            <Bot className="w-5 h-5 text-white" />
                        </div>

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
                                <div className="absolute right-0 top-full mt-1 w-36 rounded-xl bg-[#1a1a2e] border border-[#2d2d4a] shadow-xl py-1 z-50">
                                    <button
                                        onClick={() => handleThemeChange('light')}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[rgba(102,126,234,0.12)] transition-colors ${theme === 'light' ? 'text-[#667eea]' : 'text-[#b0b0b0]'}`}
                                    >
                                        <Sun className="w-3.5 h-3.5" /> Light
                                    </button>
                                    <button
                                        onClick={() => handleThemeChange('dark')}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[rgba(102,126,234,0.12)] transition-colors ${theme === 'dark' ? 'text-[#667eea]' : 'text-[#b0b0b0]'}`}
                                    >
                                        <Moon className="w-3.5 h-3.5" /> Dark
                                    </button>
                                    <button
                                        onClick={() => handleThemeChange('system')}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[rgba(102,126,234,0.12)] transition-colors ${theme === 'system' || !theme ? 'text-[#667eea]' : 'text-[#b0b0b0]'}`}
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
                        <form action="/logout" method="POST" onSubmit={handleLogout} className="inline">
                            <button type="submit" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#e74c3c] hover:bg-[rgba(231,76,60,0.15)] transition-colors">
                                <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Logout</span>
                            </button>
                        </form>
                    </div>
                </header>

                {/* Chat Content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {children}
                </div>
            </main>

            {/* Delete Confirmation Modal */}
            {deletingChatId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center">
                    <div className={`p-6 rounded-2xl max-w-sm w-full mx-4 shadow-2xl ${theme === 'light' ? 'bg-white' : 'bg-[#1a1a2e] border border-[#2d2d4a]'}`}>
                        <h3 className={`text-lg font-semibold mb-2 theme-text-primary`}>Delete Chat?</h3>
                        <p className={`text-sm mb-5 ${theme === 'light' ? 'text-gray-500' : 'text-[#888]'}`}>This action cannot be undone. The chat and all its messages will be permanently deleted.</p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeletingChatId(null)}
                                className={`px-4 py-2 rounded-lg text-sm transition-colors ${theme === 'light' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-[#2d2d4a] text-[#b0b0b0] hover:bg-[#3d3d5a]'}`}
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
export function AgentSelector({
    agents,
    selectedAgent,
    onSelectAgent,
    isOpen,
    onToggle,
    theme: selectorTheme
}: {
    agents: Agent[];
    selectedAgent: Agent;
    onSelectAgent: (agent: Agent) => void;
    isOpen: boolean;
    onToggle: () => void;
    theme?: 'light' | 'dark' | 'system';
}) {
    const safeAgents = agents ?? [];
    const themeVal = selectorTheme ?? 'system';
    return (
        <div className="relative flex-shrink-0" ref={undefined}>
            <button
                onClick={onToggle}
                className={`
                    flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2
                    text-sm cursor-pointer
                    transition-all duration-200
                    hover:border-[#667eea]
                    ${isOpen ? 'border-[#667eea] shadow-lg shadow-[rgba(102,126,234,0.2)]' : ''}
                    'bg-white/90 border border-white/50 hover:border-[#667eea] shadow-sm'
                `}
                style={{ width: '180px', height: '44px', boxSizing: 'border-box' }}
            >
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-r ${getProviderGradient(selectedAgent.provider)} flex items-center justify-center flex-shrink-0`}>
                    <ProviderIcon provider={selectedAgent.provider} size={16} color="#ffffff" />
                </div>
                <span className={`flex-1 truncate text-left font-medium text-xs text-gray-700`} title={selectedAgent.name}>
                    {selectedAgent.name}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''} text-gray-400`} />
            </button>

            {/* Dropdown */}
            <div className={`
                absolute bottom-full left-0 mb-2 w-full
                bg-white/95 backdrop-blur-md border border-white/60 rounded-xl shadow-xl
                overflow-hidden z-50 shadow-xl
                transition-all duration-200 origin-bottom
                ${isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2 pointer-events-none'}
            `}>
                <div className="p-1.5">
                    {safeAgents.map((agent) => (
                        <button
                            key={agent.id}
                            onClick={() => onSelectAgent(agent)}
                            className={`
                                flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg
                                text-xs transition-all duration-150
                                ${selectedAgent.id === agent.id 
    ? 'bg-[rgba(102,126,234,0.15)] text-gray-800 font-semibold' 
    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}
                            `}
                        >
                            <div className={`w-6 h-6 rounded-md bg-gradient-to-r ${getProviderGradient(agent.provider)} flex items-center justify-center flex-shrink-0`}>
                                <ProviderIcon provider={agent.provider} size={14} color="#ffffff" />
                            </div>
                            <span className="flex-1 truncate text-left">{agent.name}</span>
                            {selectedAgent.id === agent.id && <Check className="w-3.5 h-3.5 text-[#667eea] flex-shrink-0" />}
                        </button>
                    ))}
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
            if (!disabled && (value.trim() || attachments.length > 0)) onSubmit();
        }
    };

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
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
                <div className="flex flex-wrap gap-2 p-2 rounded-xl bg-white/80 border border-white/50 backdrop-blur-sm">
                    {attachments.map((file, index) => {
                        const isImage = file.type && file.type.startsWith('image/');
                        const url = URL.createObjectURL(file);
                        return (
                            <div key={index} className={`relative flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/80 text-xs text-gray-700 ${isImage ? 'flex-col !px-1 !py-1' : ''}`}>
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
                        'bg-white/90 border border-white/50 text-gray-500 hover:border-[#667eea] hover:text-[#667eea] shadow-sm'
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
                        flex-1 px-4 py-2.5 min-h-[44px] max-h-[120px] rounded-xl border-2 resize-none font-inherit leading-relaxed transition-all duration-200 focus:outline-none focus:border-[#667eea]
                        'bg-white/90 border border-white/50 text-gray-800 placeholder:text-gray-400 shadow-sm'
                    `}
                    style={{ boxSizing: 'border-box', height: '44px' }}
                />
                <button
                    type="button"
                    disabled={disabled || (!value.trim() && attachments.length === 0)}
                    onClick={onSubmit}
                    className="w-[44px] h-[44px] rounded-2xl bg-gradient-to-r from-[#667eea] to-[#764ba2] border-none cursor-pointer text-white flex items-center justify-center shadow-lg shadow-[rgba(102,126,234,0.4)] hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex-shrink-0"
                >
                    <Send className="w-4 h-4" />
                </button>
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
                            className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors flex items-center gap-1 text-sm cursor-pointer"
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

export function MessageBubble({ message, userId, onImageClick }: { message: Message; userId?: number; onImageClick?: (src: string) => void }) {
    const isUser = message.role === 'user';
    const themeVal = 'system'; // Default theme for MessageBubble

    const formattedContent = useMemo(() => {
        return formatMessage(message.message);
    }, [message.message]);

    // Filter image attachments
    const imageAttachments = message.attachments?.filter(
        (att) => att.mime && att.mime.startsWith('image/')
    ) || [];
    const fileAttachments = message.attachments?.filter(
        (att) => att.mime && !att.mime.startsWith('image/')
    ) || [];

    const hasText = message.message.trim().length > 0;
    const hasImages = imageAttachments.length > 0;
    const hasFiles = fileAttachments.length > 0;

    if (!hasText && !hasImages && !hasFiles) return null;

    return (
        <div className={`flex flex-col ${isUser ? 'items-end self-end' : 'items-start self-start'}`}>
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
            {/* Render non-image file attachments */}
            {hasFiles && (
                <div className={`flex flex-wrap gap-2 ${hasText ? 'mb-2' : ''}`}>
                    {fileAttachments.map((att, idx) => (
                        <a
                            key={idx}
                            href={getAttachmentUrl(att.path, userId || 0)}
                            download={att.name}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#2d2d4a] border border-[#3d3d5a] hover:border-[#667eea] transition-colors max-w-[250px] no-underline"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <span className="text-lg flex-shrink-0">{getFileTypeIcon(att.mime)}</span>
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs text-[#e0e0e0] truncate" title={att.name}>{att.name}</span>
                                <span className="text-[10px] text-[#888]">{formatFileSize(att.size)}</span>
                            </div>
                        </a>
                    ))}
                </div>
            )}
            {/* Only show message bubble if there's actual text */}
            {hasText && (
                <div className={`
                    px-3 py-1.5 rounded-xl text-sm leading-relaxed
                    ${isUser ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-br-md shadow-lg shadow-[rgba(102,126,234,0.2)]' : (themeVal === 'light' ? 'bg-white text-gray-800 border border-gray-200 rounded-bl-md' : 'bg-[#1a1a2e] text-[#d0d0d0] border border-[#2d2d4a] rounded-bl-md')}
                `}>
                    {formattedContent}
                </div>
            )}
            <span className="text-[10px] text-[#444] mt-1.5 px-1" title={message.created_at ? new Date(message.created_at).toLocaleString() : ''}>
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
}

// Typing Indicator
export function TypingIndicator() {
    return (
        <div className="flex items-start self-start max-w-[75%]">
            <div className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-[#1a1a2e] border border-[#2d2d4a]">
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
                    className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors flex items-center gap-1 text-sm"
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