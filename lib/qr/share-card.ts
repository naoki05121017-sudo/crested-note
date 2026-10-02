import { displayAnimalId } from "@/lib/db/animal-code";
import { animalPhotoAppSrc } from "@/lib/db/animal-photo";
import { publicAnimalPageUrl } from "@/lib/qr/public-animal-url";

export const SHARE_CARD_BRAND = "クレスノート";
export const SHARE_CARD_BYLINE = "by N.crest";
export const SHARE_CARD_CTA = "この個体をクレスノートで見る";

export type PublicShareCard = {
  url: string;
  name: string;
  morph: string;
  code: string;
  photoSrc: string | null;
};

export type PublicShareAnimal = {
  isPublic: boolean;
  shareSlug: string;
  name: string;
  morphLabel: string;
  code: string;
  photoUrl: string;
};

export function buildPublicShareCard(
  origin: string,
  animal: PublicShareAnimal,
): PublicShareCard | null {
  const url = publicAnimalPageUrl(origin, {
    isPublic: animal.isPublic,
    shareSlug: animal.shareSlug,
  });
  if (!url) return null;
  const photo = animal.photoUrl.trim();
  return {
    url,
    name: animal.name.trim() || "名前未設定",
    morph: animal.morphLabel.trim() || "モルフ未設定",
    code: displayAnimalId(animal.code),
    photoSrc: photo ? animalPhotoAppSrc(photo) : null,
  };
}

export function animalSharePayload(card: Pick<PublicShareCard, "name" | "url">): {
  title: string;
  text: string;
  url: string;
} {
  const title = `${card.name}｜${SHARE_CARD_BRAND}`;
  return { title, text: title, url: card.url };
}

export function shareCardFilename(code: string): string {
  const id = displayAnimalId(code).replace(/[^A-Za-z0-9.-]+/g, "-");
  return `crest-note-${id}.png`;
}

export function webShareSupported(nav: { share?: unknown } | null | undefined): boolean {
  return typeof nav?.share === "function";
}

export function webShareFilesSupported(
  nav: { canShare?: (data: { files: File[] }) => boolean } | null | undefined,
  file: File,
): boolean {
  try {
    return typeof nav?.canShare === "function" && nav.canShare({ files: [file] });
  } catch {
    return false;
  }
}
