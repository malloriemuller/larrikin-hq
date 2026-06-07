export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width="22"
        height="16"
        viewBox="0 0 22 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M1 14L11 2L21 14"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        style={{
          fontFamily: "var(--font-fraunces), Georgia, serif",
          letterSpacing: "-0.02em",
          fontWeight: 500,
          fontSize: "1.125rem",
          color: "var(--foreground)",
        }}
      >
        Camber
      </span>
    </span>
  );
}
