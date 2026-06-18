import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { usePage } from '@inertiajs/react';

type FlashKind = 'success' | 'error' | 'warning' | 'info';

interface FlashBannerProps {
    /** Override the flash from the page (e.g. for in-form success after a no-redirect submit). */
    override?: { kind: FlashKind; message: string } | null;
    /** Auto-dismiss after this many ms. 0 = never. Default 5000. */
    autoDismissMs?: number;
    className?: string;
}

const STYLES: Record<FlashKind, { bg: string; border: string; text: string; Icon: typeof CheckCircle2 }> = {
    success: {
        bg: 'bg-emerald-500/15',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        Icon: CheckCircle2,
    },
    error: {
        bg: 'bg-red-500/15',
        border: 'border-red-500/30',
        text: 'text-red-400',
        Icon: XCircle,
    },
    warning: {
        bg: 'bg-amber-500/15',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        Icon: AlertTriangle,
    },
    info: {
        bg: 'bg-blue-500/15',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        Icon: Info,
    },
};

/**
 * Renders a dismissible flash message.
 *
 * Source priority:
 *  1. `override` prop (e.g. an in-form success message after a no-redirect submit)
 *  2. `page.props.flash.<kind>` from Inertia (set via `Inertia::flash('success', ...)`)
 *
 * The banner auto-dismisses after `autoDismissMs` (default 5 s) but can also be
 * dismissed manually with the X button.
 */
export default function FlashBanner({ override, autoDismissMs = 5000, className = '' }: FlashBannerProps) {
    const page = usePage() as any;
    const flash: Record<string, string> = (page?.props?.flash as Record<string, string>) || {};

    let active: { kind: FlashKind; message: string } | null = override ?? null;
    if (!active) {
        for (const kind of ['success', 'error', 'warning', 'info'] as FlashKind[]) {
            if (flash[kind]) { active = { kind, message: flash[kind] }; break; }
        }
    }

    const [visible, setVisible] = useState<boolean>(!!active);
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        if (active) {
            setVisible(true);
            setClosing(false);
            if (autoDismissMs > 0) {
                const t = setTimeout(() => {
                    setClosing(true);
                    setTimeout(() => setVisible(false), 200);
                }, autoDismissMs);
                return () => clearTimeout(t);
            }
        } else {
            setVisible(false);
        }
    }, [active?.message, autoDismissMs]);

    if (!active || !visible) return null;

    const s = STYLES[active.kind];
    const Icon = s.Icon;

    return (
        <div
            role="alert"
            aria-live="polite"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all duration-200 ${
                closing ? 'opacity-0 -translate-y-1' : 'opacity-100 translate-y-0'
            } ${s.bg} ${s.border} ${s.text} ${className}`}
        >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{active.message}</span>
            <button
                type="button"
                onClick={() => { setClosing(true); setTimeout(() => setVisible(false), 200); }}
                className="opacity-70 hover:opacity-100 transition-opacity"
                aria-label="Dismiss"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}
