import { useState } from 'react';
import { Users, Trash2, Edit, ChevronRight, Shield, User, ArrowLeft } from 'lucide-react';
import UserEditForm from './UserEdit';
import FlashBanner from '@/components/FlashBanner';

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
    const [userList, setUserList] = useState(users);
    // Manual toast override for non-validation messages from fetch() responses.
    // Inertia flash messages (from back()->with('flash', ...)) flow through
    // <FlashBanner /> automatically via the Inertia middleware.
    const [overrideFlash, setOverrideFlash] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);

    const handleDelete = async (userId: number, userName: string) => {
        if (!confirm(`Are you sure you want to delete "${userName}"? This will delete all their chats and agents.`)) {
            return;
        }

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

        try {
            const response = await fetch(`/admin/users/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ _method: 'DELETE' }),
            });

            if (response.ok || response.redirected) {
                setUserList(prev => prev.filter(u => u.id !== userId));
                setOverrideFlash({ type: 'success', message: `"${userName}" has been deleted.` });
            } else {
                const data = await response.json().catch(() => ({}));
                setOverrideFlash({ type: 'error', message: data.error || 'Failed to delete user.' });
            }
        } catch {
            setOverrideFlash({ type: 'error', message: 'Network error. Please try again.' });
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="p-6 space-y-6">
            <FlashBanner variant="toast" override={overrideFlash} />

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
                        <p className="text-xs text-[#666]">{userList.length} total users</p>
                    </div>
                </div>
                <a href="/admin" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#888] hover:text-white hover:bg-[rgba(102,126,234,0.1)] transition-all">
                    ← Back to Dashboard
                </a>
            </div>

            {/* Users Table */}
            <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[var(--border-color)]">
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">User</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Role</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Chats</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Messages</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#888] uppercase tracking-wider">Joined</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-[#888] uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2d2d4a]">
                            {userList.map((user) => (
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
                                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{user.chats_count}</td>
                                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{user.messages_count}</td>
                                    <td className="px-4 py-3 text-sm text-[#888]">{formatDate(user.created_at)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-2">
                                                                    <button
                                                onClick={() => setEditingUser(user)}
                                                className="p-1.5 rounded-lg hover:bg-[rgba(102,126,234,0.15)] text-[#888] hover:text-white transition-colors"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            {!user.is_admin && (
                                                <button
                                                    onClick={() => handleDelete(user.id, user.name)}
                                                    className="p-1.5 rounded-lg hover:bg-[rgba(231,76,60,0.15)] text-[#888] hover:text-[#e74c3c] transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setEditingUser(null)}
                    />

                    <UserEditForm
                        user={editingUser}
                        onSave={(updated) => {
                            setUserList(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u));
                            setEditingUser(null);
                            setOverrideFlash({ type: 'success', message: `"${updated.name}" updated successfully.` });
                        }}
                        onCancel={() => setEditingUser(null)}
                    />
                </div>
            )}
        </div>
    );
}
