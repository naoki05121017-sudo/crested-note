import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { ANIMAL_PHOTO_BUCKET } from "@/lib/db/animal-photo";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  canReadAnimalPhoto,
  parseAnimalPhotoObjectKey,
} from "@/lib/stats/photo-access";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ animalId: string; file: string }> },
) {
  const { animalId, file } = await context.params;
  const key = parseAnimalPhotoObjectKey(animalId, file);
  if (!key) {
    return new NextResponse("Not found", { status: 404 });
  }

  const admin = createAdminClient();
  const { data: animal, error } = await admin
    .from("animals")
    .select("is_public, user_id")
    .eq("id", animalId)
    .maybeSingle();
  if (error || !animal) {
    return new NextResponse("Not found", { status: 404 });
  }

  const viewer = await getSessionUser();
  if (
    !canReadAnimalPhoto({
      isPublic: Boolean(animal.is_public),
      ownerUserId: String(animal.user_id),
      viewerUserId: viewer?.id ?? null,
    })
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  const downloaded = await admin.storage.from(ANIMAL_PHOTO_BUCKET).download(key);
  if (downloaded.error || !downloaded.data) {
    return new NextResponse("Not found", { status: 404 });
  }

  const body = Buffer.from(await downloaded.data.arrayBuffer());
  const contentType = downloaded.data.type || "application/octet-stream";
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": animal.is_public
        ? "public, max-age=3600"
        : "private, no-store",
    },
  });
}
