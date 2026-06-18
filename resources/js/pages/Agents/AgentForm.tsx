import { useState, useEffect } from 'react';
import { Bot, ArrowLeft, Loader2, XCircle, X, CheckCircle2 } from 'lucide-react';
import ChatLayout from '@/components/ChatLayout';
import ProviderIcon, { getProviderGradient, PROVIDER_LABELS } from '@/components/ProviderIcon';
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

interface AgentFormProps {
    agent?: Agent;
    agents: Agent[];
    chats: Chat[];
    user: User;
    isEdit?: boolean;
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

export default function AgentForm({ agent, agents, chats, user, isEdit = false }: AgentFormProps) {

    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(user.theme ?? 'system');
    const [name, setName] = useState(agent?.name ?? '');
    const [provider, setProvider] = useState(agent?.provider ?? 'openai');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState(agent?.model ?? '');
    const [isDefault, setIsDefault] = useState(agent?.is_default ?? false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
        const root = document.documentElement;
        if (newTheme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.classList.toggle('light', !prefersDark);
            root.classList.toggle('dark', prefersDark);
        } else {
            root.classList.toggle('light', newTheme === 'light');
            root.classList.toggle('dark', newTheme === 'dark');
        }
        root.setAttribute('data-theme', newTheme);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Guard: in edit mode we need the agent id, otherwise the URL becomes
        // /ai-agents/undefined and Laravel returns 404/405.
        if (isEdit && !agent?.id) {
            setErrors({ general: 'Missing agent id. Please refresh the page and try again.' });
            return;
        }

        setSaving(true);
        setErrors({});
        setSuccessMessage('');

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        const url = isEdit ? `/ai-agents/${agent!.id}` : '/ai-agents';

        // Use a plain fetch + form-encoded body. We avoid Inertia's router.post
        // because:
        //   1. router.post sends JSON which Laravel Inertia handles differently
        //   2. Inertia::location() returns 409 which triggers a hard navigation
        //      that unmounts the form before onSuccess fires (so no banner)
        //   3. redirect() (302) followed by XHR also races with the flash
        //
        // The reliable path is: POST with form-encoded body + _method=PUT,
        // let the server set Inertia::flash() and return a normal redirect
        // to /ai-agents. The browser follows it, the list page loads, and
        // FlashBanner reads the flash from page.props.flash.
        const body = new URLSearchParams();
        body.set('_token', csrfToken);
        body.set('_method', isEdit ? 'PUT' : 'POST');
        body.set('name', name);
        body.set('provider', provider);
        if (apiKey) body.set('api_key', apiKey);
        if (model) body.set('model', model);
        body.set('is_default', isDefault ? '1' : '0');

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'text/html, application/xhtml+xml, application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: body.toString(),
                redirect: 'follow',
            });

            // 422 = validation error (Laravel returns JSON for XHR with errors)
            if (response.status === 422) {
                try {
                    const data = await response.json();
                    setErrors(data.errors || { general: data.message || 'Validation failed.' });
                } catch {
                    setErrors({ general: 'Validation failed. Please check the form.' });
                }
                setSaving(false);
                return;
            }

            // 2xx success
            if (response.ok) {
                // Show inline success on the form first (guaranteed visible),
                // then follow the redirect. The flash is in session and will
                // be consumed by the list page's Inertia response.
                setSuccessMessage(
                    isEdit
                        ? `Agent "${name}" updated successfully.`
                        : `Agent "${name}" created successfully.`
                );
                setSaving(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                // Follow the redirect after 1.5s so the user can read the message
                setTimeout(() => {
                    window.location.href = '/ai-agents';
                }, 1500);
                return;
            }

            // 4xx / 5xx other than 422
            let msg = `Server error (${response.status}). Please try again.`;
            try {
                const data = await response.json();
                if (data?.message) msg = data.message;
            } catch { /* not JSON, keep default msg */ }
            setErrors({ general: msg });
            setSaving(false);
        } catch (err) {
            setErrors({ general: 'Network error. Please check your connection and try again.' });
            setSaving(false);
        }
    };

    useEffect(() => {
        applyTheme(theme);
    }, []);

    const selectedProvider = providers.find(p => p.value === provider) || providers[0];

    return (
        <ChatLayout agents={agents} chats={chats} user={user} theme={theme}>
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-xl mx-auto px-2 sm:px-0">
                    {/* Back Link */}
                    <a
                        href="/ai-agents"
                        className={`inline-flex items-center gap-2 mb-6 text-sm ${theme === 'light' ? 'text-gray-600 hover:text-gray-800' : 'text-[#888] hover:text-white'}`}
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to AI Agents
                    </a>

                    {/* Form Card */}
                    <div className={`rounded-2xl p-6 ${theme === 'light' ? 'bg-white border border-gray-200' : 'bg-[#1a1a2e] border border-[#2d2d4a]'}`}>
                        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center">
                                <Bot className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className={`text-xl font-bold theme-text-primary`}>
                                    {isEdit ? 'Edit AI Agent' : 'Add New AI Agent'}
                                </h1>
                                <p className={`text-sm theme-text-muted`}>
                                    {isEdit ? 'Update agent configuration' : 'Configure a new AI provider'}
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Inline success message (shown after save, before redirect) */}
                            {successMessage && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 text-xs font-medium">
                                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                    <span className="flex-1">{successMessage}</span>
                                </div>
                            )}

                            {/* Server-side flash (e.g. error from previous failed submit) */}
                            <FlashBanner />

                            {/* General client error (network, 500, etc.) */}
                            {errors.general && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/15 text-red-400 text-xs font-medium">
                                    <XCircle className="w-4 h-4 flex-shrink-0" />
                                    <span className="flex-1">{errors.general}</span>
                                    <button type="button" onClick={() => setErrors(e => ({ ...e, general: '' }))} className="opacity-70 hover:opacity-100">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            {/* Agent Name */}
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-[#b0b0b0]'}`}>
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
                                            : 'bg-[#1e1e32] border-[#2d2d4a] text-white placeholder:text-[#555]'
                                    } ${errors.name ? 'border-red-500' : ''}`}
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>

                            {/* Provider */}
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-[#b0b0b0]'}`}>
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
                                                        : 'border-[#2d2d4a] hover:border-[#3d3d5a]'
                                            }`}
                                        >
                                            <ProviderIcon provider={p.value} variant="solid" size={18} className="flex-shrink-0" />
                                            <span className={`text-xs font-medium ${theme === 'light' ? 'text-gray-700' : 'text-[#b0b0b0]'}`}>{p.label}</span>
                                        </button>
                                    ))}
                                </div>
                                {errors.provider && <p className="text-red-500 text-xs mt-1">{errors.provider}</p>}
                            </div>

                            {/* API Key */}
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-[#b0b0b0]'}`}>
                                    API Key <span className="text-red-500">*</span> {isEdit && <span className={`text-xs ${theme === 'light' ? 'text-gray-400' : 'text-[#666]'}`}>(leave blank to keep current)</span>}
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
                                            : 'bg-[#1e1e32] border-[#2d2d4a] text-white placeholder:text-[#555]'
                                    } ${errors.api_key ? 'border-red-500' : ''}`}
                                />
                                {errors.api_key && <p className="text-red-500 text-xs mt-1">{errors.api_key}</p>}
                            </div>

                            {/* Model */}
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-[#b0b0b0]'}`}>
                                    Model
                                </label>
                                <input
                                    type="text"
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    placeholder={getModelPlaceholder(provider)}
                                    className={`w-full px-4 py-2.5 rounded-xl border-2 transition-colors focus:outline-none focus:border-[#667eea] ${
                                        theme === 'light'
                                            ? 'bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400'
                                            : 'bg-[#1e1e32] border-[#2d2d4a] text-white placeholder:text-[#555]'
                                    } ${errors.model ? 'border-red-500' : ''}`}
                                />
                                <p className={`text-xs mt-1 ${theme === 'light' ? 'text-gray-400' : 'text-[#666]'}`}>
                                    {getModelHint(provider)}
                                </p>
                                {errors.model && <p className="text-red-500 text-xs mt-1">{errors.model}</p>}
                            </div>

                            {/* Default Checkbox */}
                            <div className={`flex items-center gap-3 p-3 rounded-xl ${theme === 'light' ? 'bg-gray-50' : 'bg-[#1e1e32]'}`}>
                                <input
                                    type="checkbox"
                                    id="is_default"
                                    checked={isDefault}
                                    onChange={(e) => setIsDefault(e.target.checked)}
                                    className="w-4 h-4 rounded border-2 border-[#667eea] text-[#667eea] focus:ring-[#667eea] focus:ring-offset-0"
                                />
                                <label htmlFor="is_default" className={`text-sm cursor-pointer ${theme === 'light' ? 'text-gray-700' : 'text-[#b0b0b0]'}`}>
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
                                            : 'bg-[#252542] text-[#b0b0b0] hover:bg-[#2d2d4a]'
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

function getModelPlaceholder(provider: string): string {
    const placeholders: Record<string, string> = {
        openai: 'e.g., gpt-4o, gpt-4o-mini, gpt-3.5-turbo',
        anthropic: 'e.g., claude-sonnet-4-20250514, claude-3-5-sonnet-latest',
        google: 'e.g., gemini-2.0-flash, gemini-pro',
        gemini: 'e.g., gemini-2.0-flash, gemini-pro',
        groq: 'e.g., llama-3.3-70b-versatile, mixtral-8x7b-32768',
        xai: 'e.g., grok-2, grok-2-mini',
        deepseek: 'e.g., deepseek-chat, deepseek-coder',
        mistral: 'e.g., mistral-large-latest, mistral-small-latest',
        azure: 'e.g., gpt-4o, gpt-4o-mini',
        bedrock: 'e.g., anthropic.claude-3-5-sonnet-20241022-v2:0',
        ollama: 'e.g., llama3.2, mistral, codellama',
        openrouter: 'e.g., openai/gpt-4o, anthropic/claude-3.5-sonnet',
    };
    return placeholders[provider] || 'Provider-specific model identifier';
}

function getModelHint(provider: string): string {
    const hints: Record<string, string> = {
        openai: 'Specify the OpenAI model to use. Defaults vary by provider.',
        anthropic: 'Claude models available through Anthropic API.',
        openrouter: 'Format: provider/model-name (e.g., openai/gpt-4o)',
    };
    return hints[provider] || '';
}
