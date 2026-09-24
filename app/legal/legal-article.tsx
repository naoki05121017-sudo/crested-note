import { Card, PageHeader } from "@/app/components/ui";
import { LegalNav } from "@/app/components/legal-nav";

export function LegalArticle({
  kicker,
  title,
  description,
  children,
}: {
  kicker: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader kicker={kicker} title={title} description={description} />
      <Card className="max-w-3xl">
        <div className="flex flex-col gap-8 text-sm leading-7 text-ink sm:text-[0.95rem]">
          {children}
        </div>
      </Card>
      <LegalNav className="text-muted" />
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-muted">{children}</div>
    </section>
  );
}
