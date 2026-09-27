import Link from "next/link";
import { BrandMark } from "@/app/components/icons";

const cardBase = "nc-lift rounded-[2rem] p-5 sm:p-6";

const cardTones = {
  white:
    "bg-gradient-to-br from-[#fff8fb] via-[#f7f2f8] to-[#eef6fb] text-ink",
  ink: "bg-gradient-to-br from-[#f3eadc] to-[#f7f2f8] text-ink",
  blush: "bg-gradient-to-br from-[#fde8ef] to-[#f7f2f8] text-ink",
  mist: "bg-gradient-to-br from-[#e7f3fb] to-[#f4eef8] text-ink",
  sage: "bg-gradient-to-br from-[#eef6f1] to-[#e7f3fb] text-ink",
  lilac: "bg-gradient-to-br from-[#ece6fb] to-[#fde8ef] text-ink",
  glass:
    "border-white/12 bg-[#1c1822]/78 text-[#f4eee8] shadow-[0_22px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl",
};

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
          <p className="text-[11px] tracking-[0.22em] text-white/40 uppercase">
            {kicker}
          </p>
        ) : null}
        <h1 className="mt-2 text-[1.95rem] font-semibold leading-tight tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 text-sm leading-7 text-white/60 sm:text-[0.95rem]">
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
  tone = "white",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: keyof typeof cardTones;
}) {
  return (
    <section className={`${cardBase} ${cardTones[tone]} ${className}`}>
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
      {hint ? <p className="text-xs opacity-60">{hint}</p> : null}
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
  tone = "white",
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  tone?: keyof typeof cardTones;
}) {
  const muted = "text-muted";
  const inner = (
    <>
      <p className={`text-sm ${muted}`}>{label}</p>
      <p className="mt-3 text-[1.7rem] font-semibold tracking-tight tabular-nums sm:text-5xl">
        {value}
      </p>
      {hint ? <p className={`mt-2 text-sm ${muted}`}>{hint}</p> : null}
    </>
  );
  const className = `${cardBase} ${cardTones[tone]}`;
  if (href) {
    return (
      <Link href={href} className={`${className} block`}>
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
    <Card tone="blush" className="py-14 text-center">
      <div className="mx-auto mb-4 flex justify-center">
        <BrandMark size={48} />
      </div>
      <p className="text-lg font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/55">{body}</p>
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
    <p className={`rounded-[1.25rem] border px-4 py-3 text-sm leading-6 ${tones[tone]}`}>
      {children}
    </p>
  );
}
