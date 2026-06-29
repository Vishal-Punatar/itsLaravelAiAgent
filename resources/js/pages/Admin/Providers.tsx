import { useState } from 'react';
import { Bot, ArrowLeft, CheckCircle2, XCircle, Save, Star, Eye, EyeOff, Settings, X, Trash2, Power } from 'lucide-react';
import ProviderIcon, { getProviderGradient } from '@/components/ProviderIcon';

interface Provider {
    id: number | null;
    provider: string;
    name: string;
    api_key: string | null;
    is_default: boolean;
    is_active: boolean;
    is_configured: boolean;
}

interface AdminProvidersProps {
    providers: Provider[];
}

export default function AdminProviders({ providers: initialProviders }: AdminProvidersProps) {
    const [providers, setProviders] = useState<Provider[]>(initialProviders);
    const [editProvider, setEditProvider] = useState<Provider | null>(null);
    const [saving, setSaving] = useState(false);
    const [settingDefault, setSettingDefault] = useState(false);
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [showApiKey, setShowApiKey] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const csrf = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3500);
    };

    const saveProvider = () => {
        if (!editProvider) return;
        const isNew = !editProvider.id;
        const url = isNew ? '/admin/providers' : `/admin/providers/${editProvider.id}`;

        setSaving(true);
        const method = isNew ? 'POST' : 'PUT';
        fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrf(),
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                provider: editProvider.provider,
                name: editProvider.name,
                api_key: editProvider.api_key || null,
                is_active: editProvider.is_active ?? true,
            }),
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast('success', `${editProvider.name} saved successfully.`);
                    if (isNew && data.provider) {
                        setProviders(prev => prev.map(p => p.provider === editProvider.provider ? { ...editProvider, ...data.provider, is_configured: true } : p));
                    } else {
                        setProviders(prev => prev.map(p => p.id === editProvider.id ? { ...editProvider } : p));
                    }
                    setEditProvider(null);
                } else {
                    showToast('error', data.message || 'Failed to save.');
                }
            })
            .catch(() => showToast('error', 'Something went wrong.'))
            .finally(() => setSaving(false));
    };

    const handleSetDefault = (provider: Provider) => {
        if (!provider.is_active) {
            showToast('error', 'Activate this provider first before setting it as default.');
            return;
        }
        setSettingDefault(true);
        fetch(`/admin/providers/${provider.id}/set-default`, {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': csrf(), 'Accept': 'application/json' },
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast('success', `${provider.name} is now the default.`);
                    setProviders(prev => prev.map(p => ({
                        ...p,
                        is_default: p.id === provider.id,
                    })));
                } else {
                    showToast('error', data.message || 'Failed.');
                }
            })
            .catch(() => showToast('error', 'Something went wrong.'))
            .finally(() => setSettingDefault(false));
    };

    const handleRemoveDefault = () => {
        const defaultProvider = providers.find(p => p.is_default);
        if (!defaultProvider) return;
        setSettingDefault(true);
        fetch('/admin/providers/default/remove', {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': csrf(), 'Accept': 'application/json' },
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast('success', `${defaultProvider.name} is no longer the default.`);
                    setProviders(prev => prev.map(p => ({ ...p, is_default: false })));
                } else {
                    showToast('error', data.message || 'Failed.');
                }
            })
            .catch(() => showToast('error', 'Something went wrong.'))
            .finally(() => setSettingDefault(false));
    };

    const handleToggleActive = (provider: Provider) => {
        if (!provider.id) return;
        setTogglingId(provider.id);
        fetch(`/admin/providers/${provider.id}/toggle-active`, {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': csrf(), 'Accept': 'application/json' },
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setProviders(prev => prev.map(p =>
                        p.id === provider.id ? { ...p, is_active: data.is_active } : p
                    ));
                    showToast('success', data.message);
                } else {
                    showToast('error', data.message || 'Failed to toggle.');
                }
            })
            .catch(() => showToast('error', 'Something went wrong.'))
            .finally(() => setTogglingId(null));
    };

    const activeCount = providers.filter(p => p.is_active).length;

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium max-w-sm ${
                    toast.type === 'success' ? 'bg-green-500/15 border-green-500/30 text-green-400'
                        : 'bg-red-500/15 border-red-500/30 text-red-400'
                }`}>
                    {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <a href="/admin" className="p-2 rounded-lg hover:bg-[rgba(102,126,234,0.15)] transition-colors">
                        <ArrowLeft className="w-5 h-5 text-[#888]" />
                    </a>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">AI Providers</h1>
                        <p className="text-xs text-[#666]">Configure provider API keys and defaults</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-[#666]">{providers.length} providers</span>
                    <a href="/admin" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#888] hover:text-white hover:bg-[rgba(102,126,234,0.1)] transition-all">
                        ← Back
                    </a>
                </div>
            </div>

            {/* Default Banner */}
            {providers.find(p => p.is_default) && (
                <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-[rgba(102,126,234,0.2)] to-[rgba(118,75,162,0.2)] border border-[rgba(102,126,234,0.3)]">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center flex-shrink-0">
                        <Star className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-white">Default Provider</p>
                        <p className="text-xs text-[#888]">
                            {providers.find(p => p.is_default)?.name} — new users without an API key will use this provider
                        </p>
                    </div>
                    <button
                        onClick={handleRemoveDefault}
                        disabled={settingDefault}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#ff6b6b] border border-[rgba(255,107,107,0.3)] hover:bg-[rgba(255,107,107,0.1)] transition-all disabled:opacity-50"
                    >
                        Remove Default
                    </button>
                </div>
            )}

            {/* Providers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {providers.map((provider) => {
                    const gradient = getProviderGradient(provider.provider);
                    return (
                        <div
                            key={provider.id ?? provider.provider}
                            className={`relative rounded-2xl border overflow-hidden transition-all ${
                                provider.is_default
                                    ? 'border-[rgba(102,126,234,0.5)] bg-[rgba(102,126,234,0.05)]'
                                    : 'border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[rgba(102,126,234,0.3)]'
                            }`}
                        >
                            {/* Card Header */}
                            <div className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-r ${gradient} flex items-center justify-center shadow-lg`}>
                                            <ProviderIcon provider={provider.provider} size={24} color="#ffffff" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-semibold text-white">{provider.name}</h3>
                                                {provider.is_default && (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white">
                                                        DEFAULT
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-[#555] capitalize">{provider.provider}</p>
                                        </div>
                                    </div>

                                </div>

                                {/* Status */}
                                <div className="mb-3">
                                    <span className="text-[10px] text-[#555] italic">
                                        {provider.is_configured ? 'API key configured' : 'No API key configured'}
                                    </span>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setEditProvider({ ...provider })}
                                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                                            provider.is_configured
                                                ? 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white hover:border-[rgba(102,126,234,0.4)]'
                                                : 'bg-[rgba(102,126,234,0.15)] border-[rgba(102,126,234,0.4)] text-[#667eea] hover:bg-[rgba(102,126,234,0.25)]'
                                        }`}
                                    >
                                        <Settings className="w-3.5 h-3.5" />
                                        {provider.is_configured ? 'Configure' : 'Setup'}
                                    </button>

                                    {provider.is_configured && !provider.is_default && (
                                        <button
                                            onClick={() => handleSetDefault(provider)}
                                            disabled={settingDefault}
                                            title="Set as default provider"
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-[rgba(102,126,234,0.3)] text-[#667eea] hover:bg-[rgba(102,126,234,0.1)] transition-all disabled:opacity-50"
                                        >
                                            <Star className="w-3.5 h-3.5" />
                                        </button>
                                    )}

                                    {/* Active/Inactive toggle */}
                                    <button
                                        onClick={() => handleToggleActive(provider)}
                                        disabled={togglingId === provider.id || (provider.is_default && provider.is_active)}
                                        title={
                                            provider.is_default && provider.is_active
                                                ? 'Default providers must stay active — unset as default first to deactivate'
                                                : provider.is_active
                                                    ? 'Deactivate provider'
                                                    : 'Activate provider'
                                        }
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                            provider.is_active
                                                ? 'border-[rgba(34,197,94,0.4)] text-emerald-400 hover:bg-[rgba(34,197,94,0.1)]'
                                                : 'border-[rgba(156,163,175,0.3)] text-[var(--text-muted)] hover:bg-[rgba(156,163,175,0.1)]'
                                        }`}
                                    >
                                        <Power className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Edit Modal */}
            {editProvider && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setEditProvider(null)}
                    />

                    {/* Modal */}
                    <div className="relative w-full max-w-lg rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl overflow-hidden">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${getProviderGradient(editProvider.provider)} flex items-center justify-center`}>
                                        <ProviderIcon provider={editProvider.provider} size={20} color="#ffffff" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-semibold text-white">{editProvider.is_configured ? 'Configure' : 'Setup'} {editProvider.name}</h2>
                                        <p className="text-xs text-[#666]">Update API key</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setEditProvider(null)}
                                    className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors text-[#666] hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="px-6 py-5 space-y-5">
                                {/* API Key */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--text-secondary)]">API Key</label>
                                    <div className="relative">
                                        <input
                                            type={showApiKey ? 'text' : 'password'}
                                            value={editProvider.api_key ?? ''}
                                            onChange={(e) => setEditProvider({ ...editProvider, api_key: e.target.value })}
                                            placeholder="Enter API key..."
                                            className="w-full px-4 py-3 pr-20 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-white text-sm placeholder:text-[#555] focus:outline-none focus:border-[#667eea] transition-colors"
                                            autoComplete="off"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setShowApiKey(!showApiKey)}
                                                className="p-1.5 rounded-lg text-[#666] hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                                                title={showApiKey ? 'Hide key' : 'Show key'}
                                            >
                                                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                            {(editProvider.api_key ?? '') !== '' && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEditProvider({ ...editProvider, api_key: '' })}
                                                    className="p-1.5 rounded-lg text-[#666] hover:text-red-400 hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                                                    title="Remove API key"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs text-[#555]">Stored encrypted. Leave blank or click remove to clear.</p>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center gap-3 px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-tertiary)]">
                                <button
                                    onClick={saveProvider}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button
                                    onClick={() => setEditProvider(null)}
                                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#888] hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                    </div>
                </div>
            )}

            {/* Active count footer */}
            <div className="text-center text-xs text-[#555] pt-2">
                {activeCount} of {providers.length} providers active
            </div>
        </div>
    );
}