import { useState, useEffect } from 'react';
import { Bot, ArrowLeft, Loader2 } from 'lucide-react';
import ChatLayout from '@/components/ChatLayout';
import ProviderIcon, { getProviderGradient, PROVIDER_LABELS } from '@/components/ProviderIcon';
import FlashBanner from '@/components/FlashBanner';
import { router } from '@inertiajs/react';

interface Agent {
    id: number;
    name: string;
    provider: string;
    is_default: boolean;
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

interface AgentFormProps {
    agent?: Agent;
    agents: Agent[];
    favouriteChats?: Chat[];
    allChatsPage?: PaginatedChats;
    recentChats?: Chat[];
    user: User;
    isEdit?: boolean;
    adminDefaultProvider?: AdminDefaultProvider | null;
}

const providers = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'gemini', label: 'Gemini' },
    { value: 'groq', label: 'Groq' },
    { value: 'xai', label: 'xAI' },
    { value: 'deepseek', label: 'DeepSeek' },
    { value: 'mistral', label: 'Mistral' },
    { value: 'azure', label: 'Azure' },
    { value: 'bedrock', label: 'AWS Bedrock' },
    { value: 'ollama', label: 'Ollama' },
    { value: 'openrouter', label: 'OpenRouter' },
];

export default function AgentForm({ agent, agents, favouriteChats, allChatsPage, recentChats, user, isEdit = false, adminDefaultProvider }: AgentFormProps) {

    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(
        (() => {
            try {
                const ls = localStorage.getItem('app_theme');
                if (ls === 'light' || ls === 'dark' || ls === 'system') return ls;
            } catch (e) {}
            return user.theme ?? 'system';
        })()
    );
    const [name, setName] = useState(agent?.name ?? '');
    const [provider, setProvider] = useState(agent?.provider ?? 'openai');
    const [apiKey, setApiKey] = useState('');
    const [isDefault, setIsDefault] = useState(agent?.is_default ?? false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    // Toast override for non-validation response messages (success, network
    // error, 5xx). Validation errors flow through `errors` and render as
    // field-level only — never as a toast. Rendered by <FlashBanner /> below.
    const [overrideFlash, setOverrideFlash] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Guard: in edit mode we need the agent id, otherwise the URL becomes
        // /ai-agents/undefined and Laravel returns 404/405.
        if (isEdit && !agent?.id) {
            setOverrideFlash({ type: 'error', message: 'Missing agent id. Please refresh the page and try again.' });
            return;
        }

        setSaving(true);
        setErrors({});
        setOverrideFlash(null);

        const url = isEdit ? `/ai-agents/${agent!.id}` : '/ai-agents';

        // Build payload — router.post() sends JSON which Laravel handles
        // transparently via $request->validate(). For PUT updates we use
        // router.put() so we don't need the form-encoded _method spoof.
        const data: Record<string, string> = {
            name,
            provider,
            is_default: isDefault ? '1' : '0',
        };
        if (apiKey) data.api_key = apiKey;

        // Use Inertia's router so the controller's 302 redirect to /ai-agents
        // is handled client-side: Inertia follows the redirect and the list
        // page's <FlashBanner /> reads the Inertia::flash() message set by
        // the controller. Plain fetch() would follow the 302 transparently
        // and consume the flash in its own response — the subsequent
        // window.location.href would land on the list page WITHOUT the flash,
        // causing the success toast to never appear.
        //
        // NOTE: We CAN'T do `const submit = router.put` here — Inertia's router
        // methods internally call `this.visit(...)`, so extracting them loses
        // the `this` binding and crashes with "Cannot read properties of
        // undefined (reading 'visit')". Always call them via `router.put(...)`
        // or `router.post(...)` directly.
        const visitOptions = {
            preserveScroll: true,
            onSuccess: () => {
                // Inertia auto-navigates to the controller's redirect target
                // (/ai-agents). Form unmounts, list page mounts, FlashBanner
                // renders the success toast from page.props.flash.
            },
            onError: (errors: Record<string, string | string[]>) => {
                // Validation errors (422) land here with field-level shape.
                // Render inline below each input; never as a toast.
                if (errors && Object.keys(errors).length > 0) {
                    const arr: Record<string, string> = {};
                    for (const [k, v] of Object.entries(errors)) {
                        arr[k] = Array.isArray(v) ? String(v[0]) : String(v);
                    }
                    setErrors(arr);
                } else {
                    setOverrideFlash({ type: 'error', message: 'Something went wrong. Please try again.' });
                }
                setSaving(false);
            },
            onFinish: () => setSaving(false),
        };

        if (isEdit) {
            router.put(url, data, visitOptions);
        } else {
            router.post(url, data, visitOptions);
        }
    };

    // NOTE: We intentionally do NOT observe data-theme here. data-theme on <html>
    // is the RESOLVED 'light'/'dark' (set by the blade script and ChatLayout's
    // applyTheme), so an observer would overwrite the user's literal 'system'
    // selection with the resolved value. setTheme(newTheme) inside
    // handleThemeChange is the single source of truth for the picked value.

    const selectedProvider = providers.find(p => p.value === provider) || providers[0];

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
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-xl mx-auto px-2 sm:px-0">
                    {/* Back Link */}
                    <a
                        href="/ai-agents"
                        className={`inline-flex items-center gap-2 mb-6 text-sm ${theme === 'light' ? 'text-gray-600 hover:text-gray-800' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to AI Agents
                    </a>

                    {/* Form Card */}
                    <div className={`rounded-2xl p-6 ${theme === 'light' ? 'bg-white border border-gray-200' : 'bg-[var(--bg-secondary)] border border-[var(--border-color)]'}`}>
                        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center">
                                <Bot className="w-6 h-6 text-[var(--text-primary)]" />
                            </div>
                            <div>
                                <h1 className={`text-xl font-bold theme-text-primary`}>
                                    {isEdit ? 'Update AI Agent' : 'Add New AI Agent'}
                                </h1>
                                <p className={`text-sm theme-text-muted`}>
                                    {isEdit ? 'Update agent configuration' : 'Configure a new AI provider'}
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Toast for non-validation errors only (network failures,
                                5xx). Success is shown on the list page after redirect
                                via Inertia::flash() from the controller. Validation
                                errors render as field-level only, below each input. */}
                            <FlashBanner variant="toast" override={overrideFlash} />

                            {/* Agent Name */}
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-[var(--text-secondary)]'}`}>
                                    Agent Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Gemini for Images"
                                    required
                                    className={`w-full px-4 py-2.5 rounded-xl border-2 transition-colors focus:outline-none focus:border-[#667eea] ${
                                        theme === 'light'
                                            ? 'bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400'
                                            : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]'
                                    } ${errors.name ? 'border-red-500' : ''}`}
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>

                            {/* Provider */}
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-[var(--text-secondary)]'}`}>
                                    AI Provider <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {providers.map((p) => (
                                        <button
                                            key={p.value}
                                            type="button"
                                            onClick={() => setProvider(p.value)}
                                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all ${
                                                provider === p.value
                                                    ? 'border-[#667eea] bg-[rgba(102,126,234,0.1)]'
                                                    : theme === 'light'
                                                        ? 'border-gray-200 hover:border-gray-300'
                                                        : 'border-[var(--border-color)] hover:border-[#3d3d5a]'
                                            }`}
                                        >
                                            <ProviderIcon provider={p.value} variant="solid" size={18} className="flex-shrink-0" />
                                            <span className={`text-xs font-medium ${theme === 'light' ? 'text-gray-700' : 'text-[var(--text-secondary)]'}`}>{p.label}</span>
                                        </button>
                                    ))}
                                </div>
                                {errors.provider && <p className="text-red-500 text-xs mt-1">{errors.provider}</p>}
                            </div>

                            {/* API Key */}
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-[var(--text-secondary)]'}`}>
                                    API Key <span className="text-red-500">*</span> {isEdit && <span className={`text-xs ${theme === 'light' ? 'text-gray-400' : 'text-[var(--text-muted)]'}`}>(leave blank to keep current)</span>}
                                </label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder={isEdit ? '••••••••••••••••' : 'Enter your API key'}
                                    required={!isEdit}
                                    className={`w-full px-4 py-2.5 rounded-xl border-2 transition-colors focus:outline-none focus:border-[#667eea] ${
                                        theme === 'light'
                                            ? 'bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400'
                                            : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]'
                                    } ${errors.api_key ? 'border-red-500' : ''}`}
                                />
                                {errors.api_key && <p className="text-red-500 text-xs mt-1">{errors.api_key}</p>}
                            </div>

                            {/* Default Checkbox */}
                            <div className={`flex items-center gap-3 p-3 rounded-xl ${theme === 'light' ? 'bg-gray-50' : 'bg-[var(--bg-tertiary)]'}`}>
                                <input
                                    type="checkbox"
                                    id="is_default"
                                    checked={isDefault}
                                    onChange={(e) => setIsDefault(e.target.checked)}
                                    className="w-4 h-4 rounded border-2 border-[#667eea] text-[#667eea] focus:ring-[#667eea] focus:ring-offset-0"
                                />
                                <label htmlFor="is_default" className={`text-sm cursor-pointer ${theme === 'light' ? 'text-gray-700' : 'text-[var(--text-secondary)]'}`}>
                                    Set as default agent for new chats
                                </label>
                            </div>

                            {/* Error message also shown at the top of the form */}

                            {/* Submit */}
                            <div className="flex items-center justify-end gap-3 pt-4">
                                <a
                                    href="/ai-agents"
                                    className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                        theme === 'light'
                                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            : 'bg-[#252542] text-[var(--text-secondary)] hover:bg-[#2d2d4a]'
                                    }`}
                                >
                                    Cancel
                                </a>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-medium text-sm shadow-lg shadow-[rgba(102,126,234,0.3)] hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {saving ? 'Saving...' : (isEdit ? 'Update Agent' : 'Create Agent')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </ChatLayout>
    );
}
