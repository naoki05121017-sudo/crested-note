import { PageSkeleton } from "@/app/components/page-skeleton";

export default function AnimalDetailLoading() {
  return (
    <div className="flex min-w-0 max-w-full flex-col gap-10" aria-hidden>
      <section className="min-w-0">
        <div className="nc-skel h-[min(48dvh,26rem)] min-h-[15rem] w-full rounded-[1.25rem]" />
        <div className="pt-5">
          <div className="nc-skel h-8 w-40 rounded-full" />
          <div className="nc-skel mt-3 h-4 w-52 rounded-full" />
          <div className="nc-skel mt-4 h-10 w-24 rounded-full" />
        </div>
      </section>
      <PageSkeleton />
    </div>
  );
}
