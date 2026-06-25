import { Bot, ArrowLeft, AlertCircle, CheckCircle2, Key, XCircle } from 'lucide-react';
import ProviderIcon, { getProviderGradient } from '@/components/ProviderIcon';

interface ModelInfo {
    label: string;
    status: 'active' | 'deprecated' | 'new';
}

interface ProviderData {
    label: string;
    models: Record<string, ModelInfo>;
    has_api_key: boolean;
}

interface AdminModelsProps {
    models: Record<string, ProviderData>;
}

export default function AdminModels({ models }: AdminModelsProps) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/15 text-green-400">Active</span>;
            case 'deprecated':
                return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/15 text-red-400">Deprecated</span>;
            case 'new':
                return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/15 text-blue-400">New</span>;
            default:
                return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-500/15 text-gray-400">{status}</span>;
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
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">AI Models</h1>
                        <p className="text-xs text-[#666]">Synced models from database</p>
                    </div>
                </div>
                <a href="/admin" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#888] hover:text-white hover:bg-[rgba(102,126,234,0.1)] transition-all">
                    ← Back to Dashboard
                </a>
            </div>

            {/* Info Banner */}
            <div className="rounded-xl p-4 border border-blue-500/20 bg-blue-500/10">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-sm font-semibold text-blue-400">About Model List</h3>
                        <p className="text-xs text-[#888] mt-1 leading-relaxed">
                            This page shows all AI models that are currently synced in ThinkChat.
                            Deprecated models (marked in red) are no longer available for use.
                            If a provider's API key is not connected, the model list may not show the latest models.
                        </p>
                    </div>
                </div>
            </div>

            {/* Models Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(models).map(([key, provider]) => {
                    const gradient = getProviderGradient(key);
                    const totalModels = Object.keys(provider.models).length;
                    const activeModels = Object.values(provider.models).filter(m => m.status === 'active').length;
                    const deprecatedModels = Object.values(provider.models).filter(m => m.status === 'deprecated').length;
                    const newModels = Object.values(provider.models).filter(m => m.status === 'new').length;

                    return (
                        <div key={key} className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] overflow-hidden">
                            {/* Provider Header */}
                            <div className="p-4 border-b border-[var(--border-color)]">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${gradient} flex items-center justify-center`}>
                                            <ProviderIcon provider={key} size={22} color="#ffffff" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-white">{provider.label}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="px-2 py-1 rounded-lg text-xs font-medium bg-green-500/10 text-green-400">
                                                    {activeModels} Active
                                                </span>
                                                {deprecatedModels > 0 && (
                                                    <span className="px-2 py-1 rounded-lg text-xs font-medium bg-red-500/10 text-red-400">
                                                        {deprecatedModels} Deprecated
                                                    </span>
                                                )}
                                                {newModels > 0 && (
                                                    <span className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400">
                                                        {newModels} New
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* API Key Status - Top Right */}
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

                            {/* Models List */}
                            <div className="p-2 max-h-[200px] overflow-y-auto">
                                {Object.entries(provider.models).map(([modelKey, modelInfo]) => (
                                    <div key={modelKey} className="px-3 py-2 rounded-lg hover:bg-[rgba(102,126,234,0.08)] transition-colors flex items-center justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-medium text-white truncate">{modelInfo.label}</div>
                                            <div className="text-[10px] text-[#555] truncate">{modelKey}</div>
                                        </div>
                                        {getStatusBadge(modelInfo.status)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {Object.keys(models).length === 0 && (
                <div className="text-center py-12">
                    <Bot className="w-12 h-12 mx-auto mb-3 text-[#555]" />
                    <p className="text-white font-medium">No models synced yet</p>
                    <p className="text-xs text-[#666] mt-1">Go to Model Sync to sync your provider models</p>
                </div>
            )}
        </div>
    );
}
