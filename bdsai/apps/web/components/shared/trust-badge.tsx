// TrustBadge — 2 sub-state theo EXPERIENCE.md:
// - "Chưa đủ dữ liệu" (neutral, không điểm số) — tránh buyer hiểu nhầm điểm thấp = lừa đảo
// - Điểm số thật (emerald background) — kèm icon shield
// Emerald CHỈ làm background/border (DESIGN.md contrast CRITICAL — không làm foreground text).

interface TrustBadgeProps {
  trustScore: number | null | undefined;
  className?: string;
}

export function TrustBadge({ trustScore, className = '' }: TrustBadgeProps) {
  // Sub-state 1: chưa đủ dữ liệu — neutral, không hiển thị điểm
  if (trustScore == null) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-sm bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground ${className}`}
      >
        <svg
          className="h-3 w-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
        Chưa đủ dữ liệu
      </span>
    );
  }

  // Sub-state 2: điểm số thật — emerald background, text accent-foreground (dark trên emerald = AA pass)
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground ${className}`}
    >
      <svg
        className="h-3 w-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z" />
      </svg>
      Tin cậy: {trustScore}
    </span>
  );
}
