import { useState } from 'react';
import { Bot, ArrowLeft, RefreshCw, Eye, CheckCircle2, XCircle, AlertCircle, X, Database, Key } from 'lucide-react';
import ProviderIcon, { getProviderGradient } from '@/components/ProviderIcon';

interface ProviderStatus {
    provider_key: string;
    label: string;
    current_count: number;
    db_count: number;
    status: 'synced' | 'not_synced' | 'out_of_sync';
    last_checked: string | null;
    has_api_key: boolean;
}

interface ModelChange {
    model_id: string;
    label: string;
}

interface PreviewData {
    provider_key: string;
    source: 'code' | 'api';
    added: ModelChange[];
    removed: ModelChange[];
    unchanged: ModelChange[];
}

interface AiModelsProps {
    providers: ProviderStatus[];
}

export default function AiModels({ providers: initialProviders }: AiModelsProps) {
    const [providers, setProviders] = useState<ProviderStatus[]>(initialProviders);
    const [preview, setPreview] = useState<PreviewData | null>(null);
    const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
    const [syncingProvider, setSyncingProvider] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const csrf = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4000);
    };

    const handlePreview = async (provider: string) => {
        setLoadingProvider(provider);
        try {
            const res = await fetch(`/admin/ai-models/api/${provider}/preview`, {
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrf(),
                },
            });
            const data = await res.json();
            setPreview(data);
        } catch {
            showToast('error', 'Failed to fetch preview.');
        } finally {
            setLoadingProvider(null);
        }
    };

    const handleSync = async (provider: string) => {
        setSyncingProvider(provider);
        try {
            const res = await fetch(`/admin/ai-models/api/${provider}/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf(),
                    'Accept': 'application/json',
                },
            });
            const data = await res.json();
            if (data.success) {
                showToast('success', data.message);
                setProviders(prev => prev.map(p => 
                    p.provider_key === provider 
                        ? { ...p, status: 'synced', last_checked: new Date().toISOString() }
                        : p
                ));
                setPreview(null);
            } else {
                showToast('error', data.message || 'Sync failed.');
            }
        } catch {
            showToast('error', 'Something went wrong.');
        } finally {
            setSyncingProvider(null);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'synced':
                return <CheckCircle2 className="w-4 h-4 text-green-400" />;
            case 'out_of_sync':
                return <AlertCircle className="w-4 h-4 text-yellow-400" />;
            default:
                return <XCircle className="w-4 h-4 text-gray-500" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'synced':
                return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-400">Synced</span>;
            case 'out_of_sync':
                return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-400">Out of Sync</span>;
            default:
                return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/15 text-gray-400">Not Synced</span>;
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <a href="/admin" className="p-2 rounded-lg hover:bg-[rgba(102,126,234,0.15)] transition-colors">
                        <ArrowLeft className="w-5 h-5 text-[#888]" />
                    </a>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center">
                        <Database className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Model Sync</h1>
                        <p className="text-xs text-[#666]">Sync AI provider models with ThinkChat</p>
                    </div>
                </div>
                <a href="/admin" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#888] hover:text-white hover:bg-[rgba(102,126,234,0.1)] transition-all">
                    ← Back to Dashboard
                </a>
            </div>

            {/* Simple Info Banner */}
            <div className="rounded-xl p-4 border border-blue-500/20 bg-blue-500/10">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-sm font-semibold text-blue-400">How Model Sync Works</h3>
                        <p className="text-xs text-[#888] mt-1 leading-relaxed">
                            This page shows all AI providers and their model lists. 
                            Some providers may show older models if their API key is not connected. 
                            To see the latest available models, add the provider's API key in settings.
                        </p>
                    </div>
                </div>
            </div>

            {/* Provider Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {providers.map((provider) => {
                    const gradient = getProviderGradient(provider.provider_key);
                    const isLoading = loadingProvider === provider.provider_key;
                    
                    return (
                        <div 
                            key={provider.provider_key} 
                            className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] overflow-hidden hover:border-[#667eea]/50 transition-colors"
                        >
                            {/* Provider Header */}
                            <div className="p-4 border-b border-[var(--border-color)]">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-r ${gradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
                                            <ProviderIcon provider={provider.provider_key} size={24} color="#ffffff" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-semibold text-white truncate">{provider.label}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                {getStatusIcon(provider.status)}
                                                {getStatusBadge(provider.status)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* API Key Status Badge - Top Right */}
                                    {!provider.has_api_key ? (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 flex-shrink-0">
                                            <XCircle className="w-3.5 h-3.5 text-red-400" />
                                            <span className="text-[10px] text-red-400 font-medium whitespace-nowrap">API Configured</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 flex-shrink-0">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                                            <span className="text-[10px] text-green-400 font-medium whitespace-nowrap">API Configured</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-center flex-1">
                                        <div className="text-lg font-bold text-white">{provider.current_count}</div>
                                        <div className="text-xs text-[#666]">Code Models</div>
                                    </div>
                                    <div className="w-px h-8 bg-[var(--border-color)]"></div>
                                    <div className="text-center flex-1">
                                        <div className="text-lg font-bold text-white">{provider.db_count}</div>
                                        <div className="text-xs text-[#666]">DB Models</div>
                                    </div>
                                </div>

                                {provider.last_checked && (
                                    <div className="text-xs text-[#555] text-center mb-3">
                                        Last sync: {new Date(provider.last_checked).toLocaleString()}
                                    </div>
                                )}

                                <button
                                    onClick={() => handlePreview(provider.provider_key)}
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {isLoading ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Loading...
                                        </>
                                    ) : (
                                        <>
                                            <Eye className="w-4 h-4" />
                                            Preview & Sync
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Preview Modal */}
            {preview && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                        {/* Modal Header */}
                        <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${getProviderGradient(preview.provider_key)} flex items-center justify-center`}>
                                    <ProviderIcon provider={preview.provider_key} size={22} color="#ffffff" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">
                                        {preview.provider_key.toUpperCase()} — Model Preview
                                    </h2>
                                    <p className="text-xs text-[#666]">
                                        {preview.source === 'api' ? 'Source: Provider API' : 'Source: Code Definition'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setPreview(null)}
                                className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.1)] transition-colors text-[#888] hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
                            {preview.added.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                        New Models ({preview.added.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {preview.added.map((model) => (
                                            <div 
                                                key={model.model_id} 
                                                className="flex items-center justify-between p-3 rounded-lg"
                                                style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-white truncate">{model.label}</div>
                                                    <div className="text-xs text-[#666] truncate">{model.model_id}</div>
                                                </div>
                                                <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">New</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {preview.removed.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                                        Deprecated Models ({preview.removed.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {preview.removed.map((model) => (
                                            <div 
                                                key={model.model_id} 
                                                className="flex items-center justify-between p-3 rounded-lg"
                                                style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-white truncate">{model.label}</div>
                                                    <div className="text-xs text-[#666] truncate">{model.model_id}</div>
                                                </div>
                                                <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400">Deprecated</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {preview.unchanged.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-[#666] mb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                                        Active Models ({preview.unchanged.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {preview.unchanged.map((model) => (
                                            <div 
                                                key={model.model_id} 
                                                className="flex items-center justify-between p-3 rounded-lg"
                                                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-white truncate">{model.label}</div>
                                                    <div className="text-xs text-[#666] truncate">{model.model_id}</div>
                                                </div>
                                                <span className="px-2 py-1 rounded text-xs font-medium bg-gray-500/20 text-gray-400">Active</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {preview.added.length === 0 && preview.removed.length === 0 && (
                                <div className="text-center py-8">
                                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-400" />
                                    <p className="text-white font-medium">All models are in sync!</p>
                                    <p className="text-xs text-[#666] mt-1">No changes needed for this provider.</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-5 border-t border-[var(--border-color)] flex justify-end gap-3">
                            <button
                                onClick={() => setPreview(null)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-[#888] hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleSync(preview.provider_key)}
                                disabled={syncingProvider === preview.provider_key}
                                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {syncingProvider === preview.provider_key ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Syncing...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        Sync Models
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div 
                    className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-xl z-50 flex items-center gap-3 ${
                        toast.type === 'success' 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                            : 'bg-gradient-to-r from-red-500 to-rose-600'
                    } text-white font-medium`}
                    style={{ animation: 'slideIn 0.3s ease-out' }}
                >
                    {toast.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5" />
                    ) : (
                        <XCircle className="w-5 h-5" />
                    )}
                    {toast.message}
                </div>
            )}

            <style>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
}
