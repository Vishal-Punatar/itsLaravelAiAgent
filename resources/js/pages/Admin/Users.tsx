import { useState, useEffect, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { Users, Trash2, Edit, ChevronRight, Shield, User, ArrowLeft, Search, X } from 'lucide-react';
import UserEditForm from './UserEdit';
import FlashBanner from '@/components/FlashBanner';
import Pagination from '@/components/Pagination';
import PerPageSelector from '@/components/PerPageSelector';

interface UserData {
    id: number;
    name: string;
    email: string;
    is_admin: boolean;
    chats_count: number;
    messages_count: number;
    created_at: string;
}

interface PaginatedUsers {
    data: UserData[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface AdminUsersProps {
    users: PaginatedUsers | UserData[];
    filters?: {
        per_page?: number;
    };
}

export default function AdminUsers({ users, filters }: AdminUsersProps) {
    // Backend may pass either a paginator (current) or a flat array (legacy /
    // hand-crafted test fixtures). Normalize both to { data, links, total, ... }.
    const isPaginated = !Array.isArray(users) && (users as PaginatedUsers)?.data !== undefined;
    const paginated = users as PaginatedUsers;
    const initialData = isPaginated ? paginated.data : (users as UserData[]);
    const initialLinks = isPaginated ? paginated.links : [];
    const initialTotal = isPaginated ? paginated.total : initialData.length;
    const initialPerPage = isPaginated
        ? paginated.per_page
        : (filters?.per_page ?? (initialData.length || 10));

    const [userList, setUserList] = useState<UserData[]>(initialData);

    /**
     * Keep the rendered table in sync with the server's `users` prop.
     *
     * useState only seeds on mount, so without this useEffect the table
     * would keep rendering the original page-1 list even after the admin
     * applied a search / role filter / pagination change. The prop updates
     * drive the displayed data; the local userList is only briefly held
     * out of sync by the optimistic-delete window (which immediately calls
     * router.reload({ only: ['users'] }), whose prop arrival re-triggers
     * this effect and converges both copies).
     */
    useEffect(() => {
        if (isPaginated) {
            setUserList((users as PaginatedUsers).data);
        }
    }, [users]);
    // Manual toast override for non-validation messages from fetch() responses.
    // Inertia flash messages (from back()->with('flash', ...)) flow through
    // <FlashBanner /> automatically via the Inertia middleware.
    const [overrideFlash, setOverrideFlash] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);

    // Search + role filter — CLIENT-SIDE ONLY.
    //
    // Both fields live solely in local component state. They are NOT seeded
    // from the `filters` prop (which would re-introduce a URL → state echo
    // that survived refresh), and they are NOT written to the URL on change.
    // Consequence: a hard refresh always resets the search input to empty
    // and the role select to "All" — exactly per Vishal's request.
    //
    // Trade-off: filtering happens against the currently-loaded page slice
    // only (server-side paginate still applies). That's fine for the
    // current 6-user dataset; for larger DBs we'd want server-side filter
    // back, but with care to clear inputs on refresh.
    const [query, setQuery] = useState<string>('');
    const [role, setRole] = useState<'admin' | 'user' | ''>('');

    // Derive the rendered list from the server-truth userList + the local
    // query/role state. Recomputes whenever any input changes.
    const filteredUserList = useMemo(() => {
        let list = userList;
        if (role === 'admin') list = list.filter((u) => u.is_admin);
        else if (role === 'user') list = list.filter((u) => !u.is_admin);
        const q = query.trim().toLowerCase();
        if (q) {
            list = list.filter(
                (u) =>
                    u.name.toLowerCase().includes(q) ||
                    u.email.toLowerCase().includes(q)
            );
        }
        return list;
    }, [userList, query, role]);

    const hasActiveFilter = query.trim().length > 0 || !!role;

    const handleSearchChange = (value: string) => setQuery(value);
    const handleRoleChange = (newRole: 'admin' | 'user' | '') => setRole(newRole);
    const clearFilters = () => {
        setQuery('');
        setRole('');
    };

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

                // Refresh the users prop from the server so the
                // "X total users" count + pagination links stay in sync.
                // Local state survives the partial reload because
                // router.reload only refreshes the specified props;
                // our optimistic delete matches the server's new truth
                // so no UI jump occurs.
                router.reload({ only: ['users'] });
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
                        <p className="text-xs text-[#666]">{initialTotal} total users</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <PerPageSelector
                        value={initialPerPage}
                        currentUrl="/admin/users"
                    />
                </div>
            </div>

            {/* Filter bar — search by name/email + role dropdown + clear.
                Lives between the header and the table so it stays in view
                even while the table is scrolled. `justify-end` pushes the
                whole controls cluster to the right side of the bar. */}
            <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] p-3 flex flex-wrap items-center justify-end gap-3">
                {/* Search — fixed compact width so it doesn't dominate the row */}
                <div className="relative w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#888] pointer-events-none" />
                    <input
                        type="text"
                        inputMode="search"
                        autoComplete="off"
                        value={query}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        // No Enter-key submit needed — every keystroke
                        // already filters the table through local state.
                        placeholder="Search by name or email…"
                        className="w-full h-9 pl-8 pr-8 rounded-lg text-xs bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#667eea] focus:ring-2 focus:ring-[#667eea]/30"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery('')}
                            aria-label="Clear search"
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[rgba(102,126,234,0.15)] text-[#888] hover:text-white"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>

                {/* Role filter */}
                <label className="inline-flex items-center gap-1.5 text-xs text-[#888]">
                    <span>Role</span>
                    <select
                        value={role}
                        onChange={(e) => handleRoleChange(e.target.value as 'admin' | 'user' | '')}
                        className="h-9 px-2 rounded-lg text-xs font-medium bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] focus:outline-none focus:border-[#667eea] cursor-pointer"
                    >
                        <option value="">All</option>
                        <option value="admin">Admin only</option>
                        <option value="user">User only</option>
                    </select>
                </label>

                {/* Active-filter summary + clear — only shown when at least
                    one filter is doing work. Right-aligned by the parent bar's
                    `justify-end` (no need for `ml-auto` here now). */}
                {hasActiveFilter && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-[#888]">
                            {filteredUserList.length} match{filteredUserList.length === 1 ? '' : 'es'}
                        </span>
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#888] hover:text-white hover:bg-[rgba(102,126,234,0.15)] transition-colors"
                        >
                            <X className="w-3 h-3" /> Clear filters
                        </button>
                    </div>
                )}
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
                            {filteredUserList.map((user) => (
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

            {/* Pagination — only show when the prop was a paginator (Laravel `LengthAwarePaginator`).
                When the page is loaded with a flat array (legacy fixtures), the paginator
                would carry empty `links`, and the component renders nothing.
                Rendered BELOW the table so it scrolls with the data, not the header. */}
            {initialLinks.length > 0 && (
                <Pagination links={initialLinks} className="mt-3" />
            )}

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
