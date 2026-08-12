interface FramePlaceholderProps {
  className?: string;
}

/**
 * Placeholder line-drawing standing in for the real product renderer /
 * photography pipeline (per design handoff — not a real product photo).
 */
export function FramePlaceholder({ className }: FramePlaceholderProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 160"
      role="img"
      aria-label="Chamberlain frame preview"
    >
      <g fill="none" stroke="#1a1a1a" strokeWidth="10">
        <path d="M40 90 Q40 45 90 45 H160 Q190 45 190 75 V95 Q190 115 160 115 H90 Q40 115 40 90 Z" />
        <path d="M210 90 Q210 45 260 45 H330 Q360 45 360 75 V95 Q360 115 330 115 H260 Q210 115 210 90 Z" />
        <path d="M190 78 H210" />
        <path d="M40 80 L15 65" />
        <path d="M360 80 L385 65" />
      </g>
    </svg>
  );
}
