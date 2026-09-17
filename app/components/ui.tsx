import Link from "next/link";
import { BrandMark } from "@/app/components/icons";

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl">
        {kicker ? (
          <p className="text-[11px] tracking-[0.22em] text-accent-strong uppercase">
            {kicker}
          </p>
        ) : null}
        <h1 className="mt-2 text-[1.85rem] font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 text-sm leading-7 text-muted sm:text-[0.95rem]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="nc-actions flex flex-wrap gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[1.5rem] border border-line bg-surface p-5 shadow-[0_12px_32px_rgba(28,25,23,0.04)] sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionTitle({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{children}</h2>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Badge({
  children,
  tone = "sand",
}: {
  children: React.ReactNode;
  tone?: "sand" | "sage" | "mist" | "blush" | "ink";
}) {
  const tones = {
    sand: "bg-sand text-ink",
    sage: "bg-accent text-ink",
    mist: "bg-mist text-ink",
    blush: "bg-blush text-ink",
    ink: "bg-ink text-white",
  };
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
        {value}
      </p>
      {hint ? <p className="mt-2 text-sm text-muted">{hint}</p> : null}
    </>
  );
  const className =
    "rounded-[1.5rem] border border-line bg-surface p-5 shadow-[0_12px_32px_rgba(28,25,23,0.04)]";
  if (href) {
    return (
      <Link
        href={href}
        className={`${className} block transition hover:-translate-y-0.5 hover:border-accent-strong/50`}
      >
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="py-14 text-center">
      <div className="mx-auto mb-4 flex justify-center">
        <BrandMark size={48} />
      </div>
      <p className="text-lg font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{body}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </Card>
  );
}

export function Hint({ text }: { text: string }) {
  return (
    <span
      className="ml-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sand text-[11px] text-muted"
      title={text}
    >
      ?
    </span>
  );
}

export function Notice({
  children,
  tone = "sage",
}: {
  children: React.ReactNode;
  tone?: "sage" | "warn" | "danger";
}) {
  const tones = {
    sage: "border-accent bg-accent/70 text-ink",
    warn: "border-amber-200 bg-sand text-ink",
    danger: "border-red-200 bg-blush text-ink",
  };
  return (
    <p className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${tones[tone]}`}>
      {children}
    </p>
  );
}
