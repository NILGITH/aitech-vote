const COLORS = ["var(--av-accent)", "var(--av-primary)", "#FFFFFF", "#5FD3A4", "#FF7A59"];

export function Confetti({ count = 28 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="absolute top-0 block h-3 rounded-sm"
          style={{
            left: `${(i * 37) % 100}%`,
            width: 6 + (i % 3) * 3,
            background: COLORS[i % COLORS.length],
            animation: `av-confetti ${2.6 + (i % 5) * 0.4}s ease-in ${(i % 8) * 0.18}s 2 both`,
          }}
        />
      ))}
    </div>
  );
}
