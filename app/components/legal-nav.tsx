import Link from "next/link";
import { LEGAL_LINKS } from "@/lib/legal/operator";

export function LegalNav({ className = "" }: { className?: string }) {
  return (
    <nav
      className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs leading-5 ${className}`}
      aria-label="法務情報"
    >
      {LEGAL_LINKS.map((link) => (
        <Link key={link.href} href={link.href} className="underline-offset-2 hover:underline">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
