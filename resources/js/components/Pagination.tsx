import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Laravel paginator-style numeric pagination.
 *
 * Pass the `links` array from a Laravel `LengthAwarePaginator` (Inertia
 * re-exposes it on the prop as-is). Each link is `{ url: string|null,
 * label: string, active: bool }`. We render all of them in order, plus
 * "Prev/Next" arrows based on adjacent links.
 *
 * Theme-aware: uses the same `theme-bg-card`, `theme-border`,
 * `theme-text-primary` tokens that the rest of the app uses, so it
 * picks up light/dark automatically.
 */
export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginationProps {
    links: PaginationLink[];
    /** Optional className for the outer container. */
    className?: string;
}

/**
 * Strip the surrounding `&laquo;` / `&raquo;` (or « / ») arrow glyphs
 * Laravel puts in the Prev / Next link labels. We render our own
 * lucide icons instead.
 */
function cleanLabel(label: string): string {
    return label
        .replace(/&laquo;|&raquo;/g, '')
        .replace(/«|»/g, '')
        .trim();
}

function isPrevLink(label: string): boolean {
    const l = label.toLowerCase();
    return l.includes('previous') || l.includes('&laquo') || l.includes('«');
}

function isNextLink(label: string): boolean {
    const l = label.toLowerCase();
    return l.includes('next') || l.includes('&raquo') || l.includes('»');
}

export default function Pagination({ links, className = '' }: PaginationProps) {
    if (!links || links.length <= 1) return null;

    return (
        <nav
            role="navigation"
            aria-label="Pagination"
            className={`flex flex-wrap items-center justify-end gap-1 mt-4 ${className}`}
        >
            {links.map((link, i) => {
                const prev = isPrevLink(link.label);
                const next = isNextLink(link.label);

                // Active page
                if (link.active) {
                    return (
                        <span
                            key={i}
                            aria-current="page"
                            className="inline-flex items-center justify-center min-w-[2.25rem] h-9 px-3 rounded-md text-xs font-semibold bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-sm"
                        >
                            {cleanLabel(link.label) || '1'}
                        </span>
                    );
                }

                // Disabled (no URL — usually first when already on page 1, or last when on last page)
                if (!link.url) {
                    return (
                        <span
                            key={i}
                            aria-disabled="true"
                            className="inline-flex items-center justify-center min-w-[2.25rem] h-9 px-3 rounded-md text-xs font-medium theme-text-muted opacity-40 cursor-not-allowed theme-bg-card theme-border"
                        >
                            {prev ? (
                                <ChevronLeft className="w-3.5 h-3.5" />
                            ) : next ? (
                                <ChevronRight className="w-3.5 h-3.5" />
                            ) : (
                                cleanLabel(link.label)
                            )}
                        </span>
                    );
                }

                // Regular link
                return (
                    <Link
                        key={i}
                        href={link.url}
                        preserveState
                        preserveScroll
                        className="inline-flex items-center justify-center min-w-[2.25rem] h-9 px-3 rounded-md text-xs font-medium theme-text-secondary theme-bg-card theme-border hover:theme-bg-hover transition-colors"
                    >
                        {prev ? (
                            <ChevronLeft className="w-3.5 h-3.5" />
                        ) : next ? (
                            <ChevronRight className="w-3.5 h-3.5" />
                        ) : (
                            cleanLabel(link.label)
                        )}
                    </Link>
                );
            })}
        </nav>
    );
}
