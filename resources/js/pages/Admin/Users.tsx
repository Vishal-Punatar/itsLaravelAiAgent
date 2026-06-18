import { Users, Trash2, Edit, ChevronRight, Shield, User, ArrowLeft } from 'lucide-react';

interface UserData {
    id: number;
    name: string;
    email: string;
    is_admin: boolean;
    chats_count: number;
    messages_count: number;
    created_at: string;
}

interface AdminUsersProps {
    users: UserData[];
}

export default function AdminUsers({ users }: AdminUsersProps) {
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
                        <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Users</h1>
                        <p className="text-xs text-[#666]">{users.length} total users</p>
                    </div>
                </div>
                <a href="/admin" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#888] hover:text-white hover:bg-[rgba(102,126,234,0.1)] transition-all">
                    ← Back to Dashboard
                </a>
            </div>

            {/* Users Table */}
            <div className="rounded-xl bg-[#1a1a2e] border border-[#2d2d4a] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[#2d2d4a]">
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">User</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Role</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Chats</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Messages</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Joined</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-[#888] uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2d2d4a]">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-[rgba(102,126,234,0.05)] transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center text-xs text-white">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-white">{user.name}</div>
                                                <div className="text-xs text-[#666]">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {user.is_admin ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-[rgba(231,76,60,0.2)] text-[#e74c3c]">
                                                <Shield className="w-3 h-3" /> Admin
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-[rgba(102,126,234,0.2)] text-[#667eea]">
                                                <User className="w-3 h-3" /> User
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-[#b0b0b0]">{user.chats_count}</td>
                                    <td className="px-4 py-3 text-sm text-[#b0b0b0]">{user.messages_count}</td>
                                    <td className="px-4 py-3 text-sm text-[#888]">{formatDate(user.created_at)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-2">
                                            <a href={`/admin/users/${user.id}/edit`} className="p-1.5 rounded-lg hover:bg-[rgba(102,126,234,0.15)] text-[#888] hover:text-white transition-colors">
                                                <Edit className="w-4 h-4" />
                                            </a>
                                            {user.id !== 1 && (
                                                <form action={`/admin/users/${user.id}`} method="POST" className="inline" onSubmit={(e) => {
                                                    if (!confirm('Are you sure you want to delete this user? This will delete all their chats and agents.')) {
                                                        e.preventDefault();
                                                    }
                                                }}>
                                                    <input type="hidden" name="_token" id="csrf_token" value="" />
                                                    <input type="hidden" name="_method" value="DELETE" />
                                                    <button type="submit" className="p-1.5 rounded-lg hover:bg-[rgba(231,76,60,0.15)] text-[#888] hover:text-[#e74c3c] transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </form>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}