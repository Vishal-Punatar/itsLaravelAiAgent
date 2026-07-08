import { router } from '@inertiajs/react';
import { useCallback } from 'react';

/**
 * Per-page dropdown. Re-navigates to the same page with `?per_page=`
 * appended (or replaced). The server is expected to whitelist the values
 * and fall back to the default if a tampered value is sent in.
 *
 * Persists the user's pick in localStorage so consecutive page loads
 * (including Inertia client-side navigations across pages) keep the same
 * density without the user having to re-select. The localStorage value is
 * only a hint — it's always overridden by a fresh URL query, which is
 * what the server reads.
 */

export const PER_PAGE_OPTIONS = [10, 15, 25, 50, 100] as const;
export const PER_PAGE_DEFAULT = 10;

interface PerPageSelectorProps {
    /** Current per-page value as known by the server (from query string or fallback). */
    value: number;
    /** URL to navigate to when the value changes. Pass the current page URL. */
    currentUrl: string;
    /** Optional extra query params to preserve when navigating (e.g. `?q=` for search). */
    extraParams?: Record<string, string | number | undefined | null>;
    /** localStorage key. Defaults to a single shared key 'app_per_page'. */
    storageKey?: string;
    /** Optional className for the outer wrapper. */
    className?: string;
}

export default function PerPageSelector({
    value,
    currentUrl,
    extraParams = {},
    storageKey = 'app_per_page',
    className = '',
}: PerPageSelectorProps) {
    const handleChange = useCallback(
        (newPerPage: number) => {
            try {
                localStorage.setItem(storageKey, String(newPerPage));
            } catch {
                /* localStorage unavailable (e.g. SSR / privacy mode) — silently ignore */
            }

            // Build clean params — drop undefined/null, then merge per_page on top.
            const params: Record<string, string | number> = {};
            for (const [k, v] of Object.entries(extraParams)) {
                if (v !== undefined && v !== null && v !== '') {
                    params[k] = v as string | number;
                }
            }
            params.per_page = newPerPage;

            router.get(currentUrl, params, {
                preserveState: true,
                preserveScroll: false, // top of page on per_page change
                replace: true,
            });
        },
        [currentUrl, extraParams, storageKey]
    );

    return (
        <label className={`inline-flex items-center gap-1.5 text-xs theme-text-muted ${className}`}>
            <span>Show</span>
            <select
                value={value}
                onChange={(e) => handleChange(Number(e.target.value))}
                className="h-8 px-2 rounded-md text-xs font-medium theme-bg-card theme-border theme-text-secondary focus:outline-none focus:ring-2 focus:ring-[#667eea]/40 cursor-pointer"
            >
                {PER_PAGE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                        {n}
                    </option>
                ))}
            </select>
            <span>per page</span>
        </label>
    );
}
