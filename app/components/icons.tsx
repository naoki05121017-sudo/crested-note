export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="24" cy="24" r="24" fill="#d9efe6" />
      <circle cx="24" cy="24" r="16" fill="#fff" />
      <path
        d="M15 28c3-8 7-12 9-12s6 4 9 12c-2.5-1.5-5.5-2.3-9-2.3S17.5 26.5 15 28Z"
        fill="#1c1917"
      />
      <circle cx="20" cy="22" r="1.6" fill="#f6dfd8" />
      <circle cx="28" cy="22" r="1.6" fill="#e3eaf7" />
    </svg>
  );
}

export function IconHome() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function IconGecko() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="8" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M11 12h8M16 12v6M19 12v-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function IconDna() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 4c6 4 2 8 8 12M16 4c-6 4-2 8-8 12" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 8h6M9 16h6" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function IconEgg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3c4 0 7 6 7 11s-3 7-7 7-7-2-7-7 3-11 7-11Z" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function IconChart() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 19h16M7 16V9M12 16V5M17 16v-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function IconGear() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M16 16.5 20 20.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4a6 6 0 0 1 6 6v3.2l1.2 2.4H4.8L6 13.2V10a6 6 0 0 1 6-6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M10 18.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
