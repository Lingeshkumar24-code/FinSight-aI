import { useEffect, useRef, useState } from "react";

export type AssistantExpression = "neutral" | "happy" | "thinking" | "alert" | "explaining";

interface AICFOAvatarProps {
  size?: number;
  expression?: AssistantExpression;
  onClick?: () => void;
  label?: string;
  compact?: boolean;
}

const MOUTH: Record<AssistantExpression, string> = {
  neutral: "M30 40 Q36 43 42 40",
  happy: "M28 38 Q36 48 44 38",
  thinking: "M31 41 Q36 38 41 41",
  alert: "M29 43 Q36 37 43 43",
  explaining: "M30 40 Q36 46 42 40",
};

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function AICFOAvatar({
  size = 64,
  expression = "neutral",
  onClick,
  label = "FinSight AI assistant",
  compact = false,
}: AICFOAvatarProps) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const [blinking, setBlinking] = useState(false);
  const [activeExpression, setActiveExpression] = useState<AssistantExpression>(expression);
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    setActiveExpression(expression);
  }, [expression]);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    function onMove(event: MouseEvent) {
      const node = hostRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const dx = (event.clientX - (rect.left + rect.width / 2)) / 260;
      const dy = (event.clientY - (rect.top + rect.height / 2)) / 260;
      const magnitude = Math.hypot(dx, dy) || 1;
      const limit = Math.min(1, magnitude);
      setGaze({
        x: Math.max(-1, Math.min(1, (dx / magnitude) * limit)) * 2.6,
        y: Math.max(-1, Math.min(1, (dy / magnitude) * limit)) * 2.0,
      });
    }
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let timer: number;
    const schedule = () => {
      timer = window.setTimeout(() => {
        setBlinking(true);
        window.setTimeout(() => setBlinking(false), 130);
        schedule();
      }, 2600 + Math.random() * 3600);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timer = window.setInterval(() => setThinking((value) => !value), 2400);
    return () => window.clearInterval(timer);
  }, []);

  const content = (
    <svg
      className={`finsight-avatar ${thinking ? "is-thinking" : ""}`}
      width={size}
      height={size}
      viewBox="0 0 72 72"
      role="img"
      aria-label={label}
      data-testid="finsight-avatar"
    >
      <defs>
        <linearGradient id="avatar-shell" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E8F5EF" />
        </linearGradient>
        <linearGradient id="avatar-halo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#047857" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#0F172A" stopOpacity="0.08" />
        </linearGradient>
        <radialGradient id="avatar-core" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ECFDF5" />
          <stop offset="100%" stopColor="#D1FAE5" />
        </radialGradient>
      </defs>

      {!compact && <circle cx="36" cy="36" r="34" fill="url(#avatar-halo)" opacity="0.22" />}
      <circle cx="36" cy="36" r="30" fill="url(#avatar-shell)" stroke="#0F172A" strokeWidth="1.4" />
      <circle cx="36" cy="36" r="25" fill="url(#avatar-core)" stroke="#A7F3D0" strokeWidth="1" />

      <rect x="34" y="7" width="4" height="7" rx="2" fill="#0F172A" />
      <circle cx="36" cy="7" r="3" fill={thinking ? "#047857" : "#0F172A"} className="avatar-antenna" />

      <g className="avatar-eyes">
        {[26, 46].map((cx) => (
          <g key={cx}>
            {blinking ? (
              <path d={`M${cx - 6} 26 Q${cx} 29 ${cx + 6} 26`} stroke="#0F172A" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            ) : (
              <>
                <ellipse cx={cx} cy="26" rx="6.2" ry="6.8" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.3" />
                <circle cx={cx + gaze.x} cy={26 + gaze.y} r="2.9" fill="#0F172A" />
                <circle cx={cx + gaze.x - 0.9} cy={25.1 + gaze.y} r="0.9" fill="#FFFFFF" />
              </>
            )}
          </g>
        ))}
      </g>

      <path d={MOUTH[activeExpression]} stroke="#0F172A" strokeWidth="2" fill="none" strokeLinecap="round" />
      {activeExpression === "explaining" && <circle cx="57" cy="45" r="2" fill="#047857" className="avatar-spark" />}
      {activeExpression === "alert" && <path d="M54 16 l3 5 h-6 z" fill="#B45309" />}
      {thinking && !compact && (
        <g className="avatar-orbit">
          <circle cx="60" cy="17" r="1.6" fill="#047857" />
          <circle cx="65" cy="21" r="1.1" fill="#047857" opacity="0.6" />
        </g>
      )}
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
      >
        <span ref={hostRef} className="avatar-host">
          {content}
        </span>
      </button>
    );
  }

  return (
    <span ref={hostRef} className="avatar-host">
      {content}
    </span>
  );
}
