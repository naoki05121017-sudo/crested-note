export function PageSkeleton() {
  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-5" aria-hidden>
      <div className="nc-skel h-36 w-full rounded-[1.25rem]" />
      <div className="nc-skel h-24 w-full rounded-[1.25rem]" />
      <div className="nc-skel h-52 w-full rounded-[1.25rem]" />
    </div>
  );
}
