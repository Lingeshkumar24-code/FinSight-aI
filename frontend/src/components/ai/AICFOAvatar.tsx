import { useEffect, useRef, useState } from "react";

export type AssistantExpression = "neutral" | "happy" | "thinking" | "alert" | "explaining";

interface AICFOAvatarProps {
  size?: number;
  expression?: AssistantExpression;
  coveringEyes?: boolean;
  onClick?: () => void;
  label?: string;
  compact?: boolean;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function AICFOAvatar({
  size = 64,
  expression = "neutral",
  coveringEyes = false,
  onClick,
  label = "FinSight AI assistant",
  compact = false,
}: AICFOAvatarProps) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const [blinking, setBlinking] = useState(false);
  const [activeExpression, setActiveExpression] = useState<AssistantExpression>(expression);

  useEffect(() => {
    setActiveExpression(expression);
  }, [expression]);

  // ── Mouse tracking for the eyes ───────────────────────────────────────────
  useEffect(() => {
    if (prefersReducedMotion() || coveringEyes) return;
    function onMove(event: MouseEvent) {
      const node = hostRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const rawDx = event.clientX - centerX;
      const rawDy = event.clientY - centerY;
      const dist = Math.hypot(rawDx, rawDy) || 1;

      // Max pupil displacement inside eye socket
      const maxOffset = 5.2;
      const normalizedDist = Math.min(1, dist / 320);

      setGaze({
        x: (rawDx / dist) * normalizedDist * maxOffset,
        y: (rawDy / dist) * normalizedDist * (maxOffset * 0.75),
      });
    }
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [coveringEyes]);

  // ── Natural periodic blinking ─────────────────────────────────────────────
  useEffect(() => {
    if (prefersReducedMotion() || coveringEyes) return;
    let timer: number;
    const schedule = () => {
      timer = window.setTimeout(() => {
        setBlinking(true);
        window.setTimeout(() => setBlinking(false), 140);
        schedule();
      }, 2400 + Math.random() * 3200);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [coveringEyes]);

  const svgId = useRef(`bot-${Math.random().toString(36).slice(2, 8)}`).current;

  const content = (
    <svg
      className="finsight-avatar"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={label}
      data-testid="finsight-avatar"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        {/* Helmet / Head Shell 3D Gradient */}
        <linearGradient id={`head-shell-${svgId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#F1F5F9" />
          <stop offset="100%" stopColor="#D9E2EE" />
        </linearGradient>

        {/* Visor / Face Screen Dark Glossy Gradient */}
        <linearGradient id={`visor-${svgId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0B0F2A" />
          <stop offset="60%" stopColor="#141838" />
          <stop offset="100%" stopColor="#090C1F" />
        </linearGradient>

        {/* Eye Outer Iris Cyan Glow Gradient */}
        <radialGradient id={`iris-glow-${svgId}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="55%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0369A1" />
        </radialGradient>

        {/* Eye Inner Pupil Cyan/Electric Gradient */}
        <radialGradient id={`pupil-${svgId}`} cx="40%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="40%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </radialGradient>

        {/* Ear Cups Pink/Purple Gradient */}
        <linearGradient id={`ear-${svgId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F472B6" />
          <stop offset="100%" stopColor="#DB2777" />
        </linearGradient>

        {/* Antenna Orb Cyan Gradient */}
        <radialGradient id={`antenna-ball-${svgId}`} cx="35%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#BAE6FD" />
          <stop offset="50%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0369A1" />
        </radialGradient>

        {/* Soft Drop Shadow for Head */}
        <filter id={`shadow-${svgId}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0F172A" floodOpacity="0.18" />
        </filter>
      </defs>

      <g filter={`url(#shadow-${svgId})`}>
        {/* ── Antenna ──────────────────────────────────────────────── */}
        <rect x="48" y="4" width="4" height="12" rx="2" fill="#94A3B8" />
        <circle cx="50" cy="5" r="5.5" fill={`url(#antenna-ball-${svgId})`} stroke="#38BDF8" strokeWidth="1" />
        <circle cx="48.5" cy="3.5" r="1.5" fill="#FFFFFF" opacity="0.8" />

        {/* ── Ear Cups / Headphones ─────────────────────────────────── */}
        {/* Left Ear */}
        <rect x="5" y="40" width="8" height="20" rx="4" fill={`url(#ear-${svgId})`} />
        <circle cx="9" cy="50" r="3" fill="#FDF2F8" opacity="0.75" />
        {/* Right Ear */}
        <rect x="87" y="40" width="8" height="20" rx="4" fill={`url(#ear-${svgId})`} />
        <circle cx="91" cy="50" r="3" fill="#FDF2F8" opacity="0.75" />

        {/* ── Main Helmet / Head Shell ──────────────────────────────── */}
        <rect
          x="10"
          y="14"
          width="80"
          height="68"
          rx="34"
          fill={`url(#head-shell-${svgId})`}
          stroke="#CBD5E1"
          strokeWidth="1.5"
        />

        {/* Head Specular Highlight (top shine) */}
        <path d="M 28 20 Q 50 16 72 20" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.75" />

        {/* ── Visor / Face Screen ───────────────────────────────────── */}
        <rect
          x="18"
          y="24"
          width="64"
          height="48"
          rx="22"
          fill={`url(#visor-${svgId})`}
          stroke="#1E293B"
          strokeWidth="1.2"
        />

        {/* ── Eyes ─────────────────────────────────────────────────── */}
        {[34, 66].map((eyeCenterX) => (
          <g key={eyeCenterX}>
            {blinking || coveringEyes ? (
              /* Cute curved closed eye arc */
              <path
                d={`M ${eyeCenterX - 9} 47 Q ${eyeCenterX} 54 ${eyeCenterX + 9} 47`}
                stroke="#38BDF8"
                strokeWidth="3.2"
                fill="none"
                strokeLinecap="round"
              />
            ) : (
              /* Full tracking animated open eye */
              <>
                {/* Outer Sclera Glow Circle */}
                <ellipse cx={eyeCenterX} cy="46" rx="10" ry="12.5" fill="#040819" stroke="#1E293B" strokeWidth="0.8" />
                {/* Moving Iris & Pupil (Tracks Cursor) */}
                <ellipse
                  cx={eyeCenterX + gaze.x}
                  cy={46 + gaze.y}
                  rx="8.5"
                  ry="11"
                  fill={`url(#pupil-${svgId})`}
                />
                {/* Inner Deep Pupil */}
                <circle cx={eyeCenterX + gaze.x} cy={46 + gaze.y} r="5" fill="#0369A1" />
                {/* Primary Specular Shine (Top-Left) */}
                <circle cx={eyeCenterX + gaze.x - 3} cy={46 + gaze.y - 4} r="3" fill="#FFFFFF" />
                {/* Secondary Specular Shine (Bottom-Right) */}
                <circle cx={eyeCenterX + gaze.x + 2.5} cy={46 + gaze.y + 3.5} r="1.5" fill="#FFFFFF" opacity="0.9" />
              </>
            )}
          </g>
        ))}

        {/* ── Cute Smiling Mouth ────────────────────────────────────── */}
        <path
          d={
            activeExpression === "happy"
              ? "M 42 61 Q 50 67 58 61"
              : activeExpression === "alert"
              ? "M 45 63 Q 50 59 55 63"
              : "M 43 62 Q 50 66 57 62"
          }
          stroke="#38BDF8"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />

        {/* ── Cute Rosy Cheeks ──────────────────────────────────────── */}
        <ellipse cx="26" cy="58" rx="3.5" ry="2" fill="#F472B6" opacity="0.45" />
        <ellipse cx="74" cy="58" rx="3.5" ry="2" fill="#F472B6" opacity="0.45" />

        {/* ── Small Neck & Body Collar ──────────────────────────────── */}
        {!compact && (
          <g>
            <rect x="42" y="82" width="16" height="6" rx="2" fill="#94A3B8" />
            <path d="M 32 88 L 68 88 L 62 96 L 38 96 Z" fill={`url(#head-shell-${svgId})`} stroke="#CBD5E1" strokeWidth="1" />
            <circle cx="50" cy="91" r="2" fill="#38BDF8" />
          </g>
        )}
      </g>
    </svg>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="avatar-button"
        onClick={onClick}
        aria-label={`Open ${label}`}
        data-testid="avatar-button"
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span ref={hostRef} className="avatar-host" style={{ display: "inline-block" }}>
          {content}
        </span>
      </button>
    );
  }

  return (
    <span ref={hostRef} className="avatar-host" style={{ display: "inline-block" }}>
      {content}
    </span>
  );
}
