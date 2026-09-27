import { describe, expect, it } from "vitest";
import { canReadAnimalPhoto, parseAnimalPhotoObjectKey } from "./photo-access";

describe("animal photo access", () => {
  const owner = "11111111-1111-1111-1111-111111111111";
  const other = "22222222-2222-2222-2222-222222222222";

  it("lets anyone read a public animal photo", () => {
    expect(
      canReadAnimalPhoto({ isPublic: true, ownerUserId: owner, viewerUserId: null }),
    ).toBe(true);
  });

  it("lets only the owner read a private animal photo", () => {
    expect(
      canReadAnimalPhoto({ isPublic: false, ownerUserId: owner, viewerUserId: null }),
    ).toBe(false);
    expect(
      canReadAnimalPhoto({ isPublic: false, ownerUserId: owner, viewerUserId: other }),
    ).toBe(false);
    expect(
      canReadAnimalPhoto({ isPublic: false, ownerUserId: owner, viewerUserId: owner }),
    ).toBe(true);
  });

  it("rejects path traversal in object keys", () => {
    expect(parseAnimalPhotoObjectKey(owner, "file.jpg")).toBe(`${owner}/file.jpg`);
    expect(parseAnimalPhotoObjectKey(owner, "../secret.jpg")).toBeNull();
    expect(parseAnimalPhotoObjectKey("not-a-uuid", "file.jpg")).toBeNull();
  });
});
