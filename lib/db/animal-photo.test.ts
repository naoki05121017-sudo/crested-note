import { describe, expect, it } from "vitest";
import {
  ANIMAL_PHOTO_BUCKET,
  animalPhotoObjectKey,
  animalPhotoObjectPath,
  isManagedAnimalPhotoUrl,
  nextPhotoUrl,
  parsePhotoForm,
  validatePhotoFile,
} from "./animal-photo";

function jpeg(name = "gecko.jpg", size = 12): File {
  return new File([new Uint8Array(size)], name, { type: "image/jpeg" });
}

describe("animal photo files", () => {
  it("accepts a jpeg under the size limit", () => {
    expect(validatePhotoFile(jpeg())).toBeNull();
  });

  it("rejects an empty or oversized or non-image file", () => {
    expect(validatePhotoFile(new File([], "empty.jpg", { type: "image/jpeg" }))).toBe(
      "写真ファイルが空です。",
    );
    expect(
      validatePhotoFile(new File([new Uint8Array(5 * 1024 * 1024)], "big.jpg", { type: "image/jpeg" })),
    ).toBe("写真は 4MB 以下にしてください。");
    expect(validatePhotoFile(new File([new Uint8Array(8)], "notes.pdf", { type: "application/pdf" }))).toBe(
      "写真は JPEG / PNG / WebP / GIF で選んでください。",
    );
  });

  it("reads a chosen file and an explicit remove from the form", () => {
    const withFile = new FormData();
    withFile.set("photo", jpeg());
    expect(parsePhotoForm(withFile)).toMatchObject({ remove: false, error: null });
    expect(parsePhotoForm(withFile).file?.name).toBe("gecko.jpg");

    const remove = new FormData();
    remove.set("removePhoto", "on");
    expect(parsePhotoForm(remove)).toEqual({ file: null, remove: true, error: null });
  });

  it("keeps the stored photo unless a new file is uploaded or removal is requested", () => {
    expect(nextPhotoUrl("https://old.example/a.jpg", null, false)).toBe(
      "https://old.example/a.jpg",
    );
    expect(nextPhotoUrl("https://old.example/a.jpg", "https://new.example/b.jpg", true)).toBe(
      "https://new.example/b.jpg",
    );
    expect(nextPhotoUrl("https://old.example/a.jpg", null, true)).toBe("");
  });

  it("stores files under the animal id and recognizes managed public URLs", () => {
    const path = animalPhotoObjectPath("animal-1", jpeg(), "file-9");
    expect(path).toBe("animal-1/file-9.jpg");
    const url = `https://proj.supabase.co/storage/v1/object/public/${ANIMAL_PHOTO_BUCKET}/${path}`;
    expect(isManagedAnimalPhotoUrl(url)).toBe(true);
    expect(animalPhotoObjectKey(url)).toBe(path);
    expect(isManagedAnimalPhotoUrl("https://images.example/gecko.jpg")).toBe(false);
  });
});
