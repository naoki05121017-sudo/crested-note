import { animalPhotoAppSrc } from "@/lib/db/animal-photo";

export function AnimalPhoto({
  src,
  alt,
  className,
  loading,
}: {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={animalPhotoAppSrc(src)}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
    />
  );
}
