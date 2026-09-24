import Image from "next/image";
import crestPhoto from "@/app/brand/home-crest.png";

export function CrestPhoto() {
  return (
    <div className="nc-crest-photo" aria-hidden="true">
      <Image
        src={crestPhoto}
        alt=""
        fill
        sizes="(max-width: 640px) 80vw, 50vw"
        priority
        className="nc-crest-photo-img"
      />
    </div>
  );
}

export function TitleCrown() {
  return (
    <svg
      className="nc-home-title-crown"
      viewBox="0 0 48 28"
      aria-hidden="true"
    >
      <path
        d="M7.2 20.6 12.4 8.4c.35-.82 1.5-.86 1.92-.06L18.8 17l4.15-11.2c.38-.98 1.74-.98 2.12 0L29.2 17l4.48-8.66c.42-.8 1.57-.76 1.92.06l5.2 12.2c.22.52-.16 1.1-.72 1.1H7.92c-.56 0-.94-.58-.72-1.1Z"
        fill="#3d5f86"
      />
      <path
        d="M8.4 22.2h31.2"
        stroke="#3d5f86"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="12.6" cy="7.2" r="1.55" fill="#4a6d96" />
      <circle cx="24" cy="4.4" r="1.7" fill="#4a6d96" />
      <circle cx="35.4" cy="7.2" r="1.55" fill="#4a6d96" />
    </svg>
  );
}
