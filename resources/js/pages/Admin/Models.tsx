import { Bot, ArrowLeft } from 'lucide-react';
import ProviderIcon, { getProviderGradient } from '@/components/ProviderIcon';

interface Model {
    label: string;
    models: Record<string, string>;
}

interface AdminModelsProps {
    models: Record<string, Model>;
}

export default function AdminModels({ models }: AdminModelsProps) {
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
                        <p className="text-xs text-[#666]">Available AI providers and models</p>
                    </div>
                </div>
                <a href="/admin" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#888] hover:text-white hover:bg-[rgba(102,126,234,0.1)] transition-all">
                    ← Back to Dashboard
                </a>
            </div>

            {/* Models Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(models).map(([key, provider]) => {
                    const gradient = getProviderGradient(key);
                    return (
                        <div key={key} className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] overflow-hidden">
                            {/* Provider Header */}
                            <div className="p-4 border-b border-[var(--border-color)]">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${gradient} flex items-center justify-center`}>
                                        <ProviderIcon provider={key} size={22} color="#ffffff" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-white">{provider.label}</h3>
                                        <p className="text-xs text-[#666]">{Object.keys(provider.models).length} models</p>
                                    </div>
                                </div>
                            </div>

                            {/* Models List */}
                            <div className="p-2 max-h-[200px] overflow-y-auto">
                                {Object.entries(provider.models).map(([modelKey, modelName]) => (
                                    <div key={modelKey} className="px-3 py-2 rounded-lg hover:bg-[rgba(102,126,234,0.08)] transition-colors">
                                        <div className="text-xs font-medium text-white truncate">{modelName}</div>
                                        <div className="text-[10px] text-[#555] truncate">{modelKey}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
