export function Logo({ size = 40 }: { size?: number }) {
  return (
    <span className="inline-grid place-items-center rounded-[30%] bg-board text-accent" style={{ width: size, height: size }}>
      <svg viewBox="0 0 32 32" width={size * 0.62} height={size * 0.62} fill="none" aria-hidden>
        <path d="M6 18c0-6.6 4.6-12 12-12h8v8c0 7.4-5.4 12-12 12H6v-8Z" fill="currentColor" />
        <path d="M8 24 19 13" stroke="var(--brand)" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}
