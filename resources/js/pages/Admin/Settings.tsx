import { Bot, Key, User, ArrowLeft } from 'lucide-react';

interface AgentData {
    id: number;
    name: string;
    provider: string;
    user: {
        id: number;
        name: string;
        email: string;
    };
    created_at: string;
}

interface AdminSettingsProps {
    agents: AgentData[];
}

export default function AdminSettings({ agents }: AdminSettingsProps) {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
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
                        <Key className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">AI Agent Settings</h1>
                        <p className="text-xs text-[#666]">View all AI agent configurations</p>
                    </div>
                </div>
                <a href="/admin" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#888] hover:text-white hover:bg-[rgba(102,126,234,0.1)] transition-all">
                    ← Back to Dashboard
                </a>
            </div>

            {/* Agents Table */}
            <div className="rounded-xl bg-[#1a1a2e] border border-[#2d2d4a] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[#2d2d4a]">
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Agent</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Provider</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Owner</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2d2d4a]">
                            {agents.map((agent) => (
                                <tr key={agent.id} className="hover:bg-[rgba(102,126,234,0.05)] transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center">
                                                <Bot className="w-4 h-4 text-white" />
                                            </div>
                                            <span className="text-sm font-medium text-white">{agent.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-[rgba(102,126,234,0.2)] text-[#667eea] capitalize">
                                            {agent.provider}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <User className="w-3.5 h-3.5 text-[#555]" />
                                            <span className="text-sm text-[#b0b0b0]">{agent.user.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-[#888]">{formatDate(agent.created_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}