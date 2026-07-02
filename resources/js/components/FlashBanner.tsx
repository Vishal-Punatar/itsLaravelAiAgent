import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { usePage } from '@inertiajs/react';

type FlashKind = 'success' | 'error' | 'warning' | 'info';

interface TypedFlash {
    _id?: string;
    type: FlashKind;
    message: string;
}

interface FlashBannerProps {
    /** Override the flash from the page (e.g. for an in-form success after a no-redirect submit). */
    override?: TypedFlash | null;
    /**
     * Visual variant:
     *   'inline' (default) — subtle outlined banner, embedded in page flow.
     *                       Matches the existing soft style used in AgentForm/Agents.
     *   'toast'           — solid/gradient high-contrast banner, fixed top-right.
     *                       Use for transient notifications on top of page content.
     */
    variant?: 'inline' | 'toast';
    /** Auto-dismiss after this many ms. 0 = never. Defaults: 4000 (toast) / 5000 (inline). */
    autoDismissMs?: number;
    /** Extra classes for the outer container. */
    className?: string;
}

const INLINE_STYLES: Record<FlashKind, { bg: string; border: string; text: string; Icon: typeof CheckCircle2 }> = {
    success: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400', Icon: CheckCircle2 },
    error:   { bg: 'bg-red-500/15',     border: 'border-red-500/30',     text: 'text-red-400',     Icon: XCircle },
    warning: { bg: 'bg-amber-500/15',   border: 'border-amber-500/30',   text: 'text-amber-400',   Icon: AlertTriangle },
    info:    { bg: 'bg-blue-500/15',    border: 'border-blue-500/30',    text: 'text-blue-400',    Icon: Info },
};

const TOAST_PALETTE: Record<FlashKind, { bg: string; solid: string; border: string; shadow: string; text: string; Icon: typeof CheckCircle2 }> = {
    success: { bg: 'linear-gradient(to right, #667eea, #764ba2)', solid: 'transparent', border: '#5a5ec7', shadow: 'rgba(102,126,234,0.3)', text: '#ffffff', Icon: CheckCircle2 },
    error:   { bg: 'linear-gradient(to right, #f87171, #dc2626)', solid: 'transparent', border: '#dc2626', shadow: 'rgba(239,68,68,0.3)',   text: '#ffffff', Icon: XCircle },
    warning: { bg: 'none', solid: '#d97706', border: '#b45309', shadow: 'rgba(217,119,6,0.3)', text: '#ffffff', Icon: AlertTriangle },
    info:    { bg: 'none', solid: '#2563eb', border: '#1d4ed8', shadow: 'rgba(37,99,235,0.3)', text: '#ffffff', Icon: Info },
};

/**
 * Application-wide flash banner. Reads `$page.props.flash` (set by the
 * HandleInertiaRequests middleware, wrapped with a unique `_id` token so
 * the same operation twice in a row still produces a fresh banner).
 *
 * Backward compatible: also reads the legacy per-key flash
 * (`page.props.flash.success` etc.) so any controller not yet migrated
 * to the typed pattern still works.
 *
 * Hover-pauses auto-dismiss; manual close button always available.
 */
export default function FlashBanner({ override, variant = 'inline', autoDismissMs, className = '' }: FlashBannerProps) {
    const page = usePage() as any;
    const rawFlash = page?.props?.flash;

    // Resolve active flash: explicit override > typed shape > legacy per-key shape.
    let active: TypedFlash | null = null;
    if (override) {
        active = override;
    } else if (rawFlash && typeof rawFlash === 'object') {
        if (rawFlash.type && rawFlash.message) {
            // New typed shape from HandleInertiaRequests middleware
            active = { _id: rawFlash._id, type: rawFlash.type, message: rawFlash.message };
        } else {
            // Legacy per-key shape (page.props.flash.success = 'msg')
            for (const kind of ['success', 'error', 'warning', 'info'] as FlashKind[]) {
                if (rawFlash[kind]) {
                    active = { type: kind, message: rawFlash[kind] };
                    break;
                }
            }
        }
    }

    // Dedup using the _id token (set by the middleware) so the same
    // operation twice in a row still produces a fresh banner.
    const lastIdRef = useRef<string | null>(null);
    const [activeFlash, setActiveFlash] = useState<TypedFlash | null>(null);

    useEffect(() => {
        if (!active) {
            setActiveFlash(null);
            return;
        }
        if (active._id && active._id === lastIdRef.current) {
            return; // already shown
        }
        if (active._id) lastIdRef.current = active._id;
        setActiveFlash(active);
    }, [active]);

    // Auto-dismiss with hover-pause
    const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const startedAtRef = useRef<number>(0);
    const durationRef = useRef<number>(0);
    const defaultDuration = variant === 'toast'
        ? (activeFlash?.type === 'error' ? 6000 : activeFlash?.type === 'warning' ? 5000 : 4000)
        : 5000;
    const duration = autoDismissMs ?? defaultDuration;

    const [visible, setVisible] = useState<boolean>(false);
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        if (!activeFlash) {
            setVisible(false);
            return;
        }
        setVisible(true);
        setClosing(false);
        if (duration > 0) {
            startedAtRef.current = Date.now();
            durationRef.current = duration;
            dismissTimerRef.current = setTimeout(() => {
                setClosing(true);
                setTimeout(() => setVisible(false), 200);
            }, duration);
        }
        return () => {
            if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        };
    }, [activeFlash, duration]);

    const pause = () => {
        if (dismissTimerRef.current) {
            clearTimeout(dismissTimerRef.current);
            dismissTimerRef.current = null;
        }
    };
    const resume = () => {
        if (!dismissTimerRef.current && activeFlash && duration > 0) {
            const remaining = durationRef.current - (Date.now() - startedAtRef.current);
            if (remaining <= 0) {
                setClosing(true);
                setTimeout(() => setVisible(false), 200);
            } else {
                dismissTimerRef.current = setTimeout(() => {
                    setClosing(true);
                    setTimeout(() => setVisible(false), 200);
                }, remaining);
            }
        }
    };
    const close = () => {
        pause();
        setClosing(true);
        setTimeout(() => setVisible(false), 200);
    };

    if (!activeFlash || !visible) return null;

    const Icon = variant === 'toast' ? TOAST_PALETTE[activeFlash.type].Icon : INLINE_STYLES[activeFlash.type].Icon;

    if (variant === 'toast') {
        const p = TOAST_PALETTE[activeFlash.type];
        return (
            <div
                role="alert"
                aria-live="polite"
                className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium max-w-sm pointer-events-auto animate-slide-in ${
                    closing ? 'opacity-0 -translate-y-1' : 'opacity-100 translate-y-0'
                } transition-all duration-200 ${className}`}
                style={{
                    backgroundImage: p.bg,
                    backgroundColor: p.solid,
                    borderColor: p.border,
                    boxShadow: `0 10px 25px ${p.shadow}`,
                    color: p.text,
                }}
                onMouseEnter={pause}
                onMouseLeave={resume}
            >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{activeFlash.message}</span>
                <button
                    type="button"
                    onClick={close}
                    aria-label="Dismiss notification"
                    className="flex-shrink-0 p-0.5 rounded transition-colors hover:bg-white/20 focus:outline-none focus:ring-1 focus:ring-white/50"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        );
    }

    // 'inline' variant
    const s = INLINE_STYLES[activeFlash.type];
    return (
        <div
            role="alert"
            aria-live="polite"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all duration-200 ${
                closing ? 'opacity-0 -translate-y-1' : 'opacity-100 translate-y-0'
            } ${s.bg} ${s.border} ${s.text} ${className}`}
            onMouseEnter={pause}
            onMouseLeave={resume}
        >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{activeFlash.message}</span>
            <button
                type="button"
                onClick={close}
                aria-label="Dismiss"
                className="opacity-70 hover:opacity-100 transition-opacity"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}
