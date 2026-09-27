import { animalPhotoAppSrc } from "@/lib/db/animal-photo";

export function AnimalPhoto({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={animalPhotoAppSrc(src)} alt={alt} className={className} />
  );
}
