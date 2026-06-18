import { useState } from 'react';
import { Users, Bot, BarChart3, ChevronRight, Shield, ArrowLeft, MessageCircle, MessageSquare } from 'lucide-react';
import { Link } from '@inertiajs/react';

interface Stats {
    total_users: number;
    total_chats: number;
    total_messages: number;
    total_agents: number;
}

interface AdminDashboardProps {
    stats: Stats;
}

export default function AdminDashboard({ stats }: AdminDashboardProps) {
    const statCards = [
        { label: 'Total Users', value: stats.total_users, icon: Users, color: 'from-[#667eea] to-[#764ba2]' },
        { label: 'Total Chats', value: stats.total_chats, icon: MessageSquare, color: 'from-[#10a37f] to-[#0d8a6a]' },
        { label: 'Total Messages', value: stats.total_messages, icon: BarChart3, color: 'from-[#f59e0b] to-[#d97706]' },
        { label: 'Total Agents', value: stats.total_agents, icon: Bot, color: 'from-[#8b5cf6] to-[#7c3aed]' },
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <a href="/chat" className="p-2 rounded-lg hover:bg-[rgba(102,126,234,0.15)] transition-colors">
                        <ArrowLeft className="w-5 h-5 text-[#888]" />
                    </a>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
                        <p className="text-xs text-[#666]">Manage your application</p>
                    </div>
                </div>
                <a href="/chat" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#888] hover:text-white hover:bg-[rgba(102,126,234,0.1)] transition-all">
                    <MessageCircle className="w-3.5 h-3.5" /> Back to Chat
                </a>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, index) => (
                    <div key={index} className="p-4 rounded-xl bg-[#1a1a2e] border border-[#2d2d4a]">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-[#888]">{stat.label}</span>
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                                <stat.icon className="w-4 h-4 text-white" />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a href="/admin/users" className="p-5 rounded-xl bg-[#1a1a2e] border border-[#2d2d4a] hover:border-[rgba(102,126,234,0.4)] transition-all group">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-white">Manage Users</h3>
                                <p className="text-xs text-[#666]">View and edit user accounts</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-[#555] group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                </a>

                <a href="/admin/models" className="p-5 rounded-xl bg-[#1a1a2e] border border-[#2d2d4a] hover:border-[rgba(102,126,234,0.4)] transition-all group">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#10a37f] to-[#0d8a6a] flex items-center justify-center">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-white">AI Models</h3>
                                <p className="text-xs text-[#666]">View available AI models</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-[#555] group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                </a>
            </div>
        </div>
    );
}