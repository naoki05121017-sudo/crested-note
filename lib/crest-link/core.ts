import type {
  CrestLinkOwnerEntry,
  CrestLinkRecord,
  CrestLinkTransferRecord,
  DatabaseFile,
  SettingsRecord,
} from "@/lib/db/types";

const TRANSFER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TRANSFER_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export type CrestLinkRelative = {
  animalId: string;
  name: string;
  code: string;
  crestLinkId: string;
};

export type CrestLinkView = {
  crestLinkId: string;
  currentOwnerLabel: string;
  ownerHistory: CrestLinkOwnerEntry[];
  pendingCode: string | null;
  publicPath: string;
  sire: CrestLinkRelative | null;
  dam: CrestLinkRelative | null;
  grandparents: CrestLinkRelative[];
  children: CrestLinkRelative[];
  grandchildren: CrestLinkRelative[];
  greatGrandchildren: CrestLinkRelative[];
};

export function crestLinkPublicPath(crestLinkId: string): string {
  return `/crest/${encodeURIComponent(crestLinkId)}`;
}

export function formatCrestLinkId(seq: number): string {
  if (!Number.isInteger(seq) || seq < 1) {
    throw new Error("Crest Link 連番が不正です。");
  }
  return `NC-${String(seq).padStart(6, "0")}`;
}

export function parseCrestLinkSeq(id: string): number {
  const match = /^NC-(\d+)$/.exec(id.trim());
  if (!match) return 0;
  const seq = Number(match[1]);
  return Number.isInteger(seq) && seq > 0 ? seq : 0;
}

export function ownerLabelFromSettings(settings: SettingsRecord): string {
  const name = settings.displayName.trim();
  return name || "未設定";
}

export function normalizeTransferCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function highestSeq(db: Pick<DatabaseFile, "crestLinkSeq" | "crestLinks">): number {
  let max = db.crestLinkSeq;
  for (const row of db.crestLinks) {
    max = Math.max(max, parseCrestLinkSeq(row.id));
  }
  return max;
}

function nowIso(now = new Date()): string {
  return now.toISOString();
}

function makeTransferCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let raw = "";
  for (const byte of bytes) {
    raw += TRANSFER_ALPHABET[byte % TRANSFER_ALPHABET.length];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export function getCrestLinkForAnimal(
  db: DatabaseFile,
  animalId: string,
): CrestLinkRecord | undefined {
  const animal = db.animals.find((row) => row.id === animalId);
  if (!animal) return undefined;
  if (animal.crestLinkId) {
    const byId = db.crestLinks.find((row) => row.id === animal.crestLinkId);
    if (byId) return byId;
  }
  return db.crestLinks.find((row) => row.animalId === animalId && row.status === "active");
}

export function getAnimalByCrestLinkId(db: DatabaseFile, crestLinkId: string) {
  if (!crestLinkId) return undefined;
  const link = db.crestLinks.find((row) => row.id === crestLinkId);
  if (link?.animalId) {
    const byLink = db.animals.find((row) => row.id === link.animalId);
    if (byLink) return byLink;
  }
  return db.animals.find((row) => row.crestLinkId === crestLinkId);
}

function appendOwnerHistory(
  link: CrestLinkRecord,
  ownerLabel: string,
  at: string,
) {
  const last = link.ownerHistory.at(-1);
  if (last && last.ownerLabel === ownerLabel) return;
  link.ownerHistory = [...link.ownerHistory, { at, ownerLabel }];
}

export function syncCrestLinkParents(db: DatabaseFile, animalId: string) {
  const animal = db.animals.find((row) => row.id === animalId);
  const link = getCrestLinkForAnimal(db, animalId);
  if (!animal || !link) return;
  const sire = animal.sireId
    ? db.animals.find((row) => row.id === animal.sireId)
    : undefined;
  const dam = animal.damId
    ? db.animals.find((row) => row.id === animal.damId)
    : undefined;
  link.sireCrestLinkId = sire?.crestLinkId ?? "";
  link.damCrestLinkId = dam?.crestLinkId ?? "";
}

export function issueCrestLinkForAnimal(
  db: DatabaseFile,
  animalId: string,
  at = new Date(),
): CrestLinkRecord {
  const animal = db.animals.find((row) => row.id === animalId);
  if (!animal) {
    throw new Error("個体が見つかりません。");
  }

  const activeForAnimal = db.crestLinks.filter(
    (row) => row.animalId === animalId && row.status === "active",
  );
  if (activeForAnimal.length > 0) {
    const preferred =
      activeForAnimal.find((row) => row.id === animal.crestLinkId) ??
      activeForAnimal[0];
    for (const extra of activeForAnimal) {
      if (extra.id !== preferred.id) {
        extra.status = "retired";
        extra.animalId = "";
        extra.events = [...extra.events, { at: nowIso(at), type: "retired" }];
      }
    }
    animal.crestLinkId = preferred.id;
    if (!preferred.ownerHistory.length && preferred.currentOwnerLabel) {
      preferred.ownerHistory = [
        { at: preferred.createdAt || nowIso(at), ownerLabel: preferred.currentOwnerLabel },
      ];
    }
    syncCrestLinkParents(db, animalId);
    return preferred;
  }

  if (animal.crestLinkId) {
    const existing = db.crestLinks.find((row) => row.id === animal.crestLinkId);
    if (existing) {
      if (existing.status === "active") existing.animalId = animalId;
      syncCrestLinkParents(db, animalId);
      return existing;
    }
    if (parseCrestLinkSeq(animal.crestLinkId) > 0) {
      const stamp = nowIso(at);
      const ownerLabel = ownerLabelFromSettings(db.settings);
      const repaired: CrestLinkRecord = {
        id: animal.crestLinkId,
        animalId,
        status: "active",
        createdAt: animal.createdAt || stamp,
        currentOwnerLabel: ownerLabel,
        ownerHistory: [{ at: stamp, ownerLabel }],
        sireCrestLinkId: "",
        damCrestLinkId: "",
        originKind: "local",
        payloadVersion: 1,
        events: [{ at: stamp, type: "issued" }],
      };
      db.crestLinks.push(repaired);
      db.crestLinkSeq = Math.max(db.crestLinkSeq, parseCrestLinkSeq(repaired.id));
      syncCrestLinkParents(db, animalId);
      return repaired;
    }
  }

  const taken = new Set(db.crestLinks.map((row) => row.id));
  let seq = highestSeq(db);
  let id = "";
  do {
    seq += 1;
    id = formatCrestLinkId(seq);
  } while (taken.has(id));

  const stamp = nowIso(at);
  const ownerLabel = ownerLabelFromSettings(db.settings);
  const record: CrestLinkRecord = {
    id,
    animalId,
    status: "active",
    createdAt: stamp,
    currentOwnerLabel: ownerLabel,
    ownerHistory: [{ at: stamp, ownerLabel }],
    sireCrestLinkId: "",
    damCrestLinkId: "",
    originKind: "local",
    payloadVersion: 1,
    events: [{ at: stamp, type: "issued" }],
  };
  db.crestLinkSeq = seq;
  db.crestLinks.push(record);
  animal.crestLinkId = id;
  syncCrestLinkParents(db, animalId);
  return record;
}

/** Assign missing IDs and retire links whose animals were removed. Returns true if the file should be saved. */
export function syncCrestLinks(db: DatabaseFile, at = new Date()): boolean {
  const before = JSON.stringify({
    seq: db.crestLinkSeq,
    links: db.crestLinks,
    animals: db.animals.map((animal) => animal.crestLinkId),
  });

  const living = new Set(db.animals.map((animal) => animal.id));
  for (const link of db.crestLinks) {
    if (link.status === "active" && link.animalId && !living.has(link.animalId)) {
      link.status = "retired";
      link.animalId = "";
      link.events = [...link.events, { at: nowIso(at), type: "retired" }];
    }
  }

  for (const animal of db.animals) {
    issueCrestLinkForAnimal(db, animal.id, at);
  }
  for (const animal of db.animals) {
    syncCrestLinkParents(db, animal.id);
  }

  const after = JSON.stringify({
    seq: db.crestLinkSeq,
    links: db.crestLinks,
    animals: db.animals.map((row) => row.crestLinkId),
  });
  return before !== after;
}

export function retireCrestLinkForAnimal(db: DatabaseFile, animalId: string, at = new Date()) {
  const animal = db.animals.find((row) => row.id === animalId);
  const link = db.crestLinks.find(
    (row) =>
      row.animalId === animalId || (animal?.crestLinkId && row.id === animal.crestLinkId),
  );
  if (!link) return;
  link.status = "retired";
  link.animalId = "";
  link.events = [...link.events, { at: nowIso(at), type: "retired" }];
  for (const transfer of db.crestLinkTransfers) {
    if (transfer.crestLinkId === link.id && transfer.status === "pending") {
      transfer.status = "revoked";
    }
  }
}

export function issueTransferCode(
  db: DatabaseFile,
  animalId: string,
  at = new Date(),
): CrestLinkTransferRecord {
  const link = getCrestLinkForAnimal(db, animalId);
  if (!link || link.status !== "active") {
    throw new Error("この個体の Crest Link が見つかりません。");
  }

  for (const transfer of db.crestLinkTransfers) {
    if (transfer.animalId === animalId && transfer.status === "pending") {
      transfer.status = "revoked";
    }
  }

  const stamp = nowIso(at);
  const record: CrestLinkTransferRecord = {
    id: crypto.randomUUID(),
    code: makeTransferCode(),
    crestLinkId: link.id,
    animalId,
    createdAt: stamp,
    expiresAt: new Date(at.getTime() + TRANSFER_TTL_MS).toISOString(),
    redeemedAt: "",
    status: "pending",
    payloadVersion: 1,
  };
  db.crestLinkTransfers.push(record);
  link.events = [...link.events, { at: stamp, type: "transfer_issued" }];
  return record;
}

export function revokePendingTransfer(db: DatabaseFile, animalId: string) {
  for (const transfer of db.crestLinkTransfers) {
    if (transfer.animalId === animalId && transfer.status === "pending") {
      transfer.status = "revoked";
    }
  }
}

export function redeemTransferCode(
  db: DatabaseFile,
  code: string,
  newOwnerLabel: string,
  at = new Date(),
): { animalId: string; crestLinkId: string } {
  const owner = newOwnerLabel.trim();
  if (!owner) {
    throw new Error("新しい所有者名を入力してください。");
  }

  const normalized = normalizeTransferCode(code);
  if (!normalized) {
    throw new Error("引き継ぎコードを入力してください。");
  }

  const transfer = db.crestLinkTransfers.find(
    (row) => normalizeTransferCode(row.code) === normalized,
  );
  if (!transfer) {
    throw new Error("引き継ぎコードが見つかりません。");
  }

  if (transfer.status === "redeemed") {
    throw new Error("このコードはすでに使用されています。");
  }
  if (transfer.status === "revoked") {
    throw new Error("このコードは無効です。");
  }

  if (transfer.status === "pending" && transfer.expiresAt < nowIso(at)) {
    transfer.status = "expired";
  }
  if (transfer.status !== "pending") {
    throw new Error("このコードは使えません。");
  }

  const link = db.crestLinks.find((row) => row.id === transfer.crestLinkId);
  const animal = db.animals.find((row) => row.id === transfer.animalId);
  if (!link || !animal || link.status !== "active") {
    throw new Error("対象の個体が見つかりません。");
  }
  if (animal.crestLinkId !== link.id) {
    throw new Error("個体IDと Crest Link ID の対応が壊れているため引き継げません。");
  }

  const stamp = nowIso(at);
  transfer.status = "redeemed";
  transfer.redeemedAt = stamp;
  link.currentOwnerLabel = owner;
  appendOwnerHistory(link, owner, stamp);
  link.events = [...link.events, { at: stamp, type: "transferred" }];
  animal.updatedAt = stamp;

  return { animalId: animal.id, crestLinkId: link.id };
}

function relativeOf(
  db: DatabaseFile,
  animalId: string,
): CrestLinkRelative | null {
  if (!animalId) return null;
  const animal = db.animals.find((row) => row.id === animalId);
  if (!animal) return null;
  return {
    animalId: animal.id,
    name: animal.name,
    code: animal.code,
    crestLinkId: animal.crestLinkId,
  };
}

function childrenOf(db: DatabaseFile, animalId: string) {
  return db.animals.filter(
    (row) => row.sireId === animalId || row.damId === animalId,
  );
}

function uniqueRelatives(rows: CrestLinkRelative[]): CrestLinkRelative[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (!row.animalId || seen.has(row.animalId)) return false;
    seen.add(row.animalId);
    return true;
  });
}

export function crestLinkView(db: DatabaseFile, animalId: string): CrestLinkView | undefined {
  const animal = db.animals.find((row) => row.id === animalId);
  if (!animal) return undefined;
  const link = getCrestLinkForAnimal(db, animalId);
  if (!link || link.status !== "active") return undefined;
  const pending =
    db.crestLinkTransfers.find(
      (row) => row.animalId === animalId && row.status === "pending",
    ) ?? null;

  const sire = relativeOf(db, animal.sireId);
  const dam = relativeOf(db, animal.damId);
  const grandparents = uniqueRelatives(
    [sire, dam].flatMap((parent) => {
      if (!parent) return [];
      const record = db.animals.find((row) => row.id === parent.animalId);
      if (!record) return [];
      return [relativeOf(db, record.sireId), relativeOf(db, record.damId)].filter(
        (row): row is CrestLinkRelative => row !== null,
      );
    }),
  );
  const children = childrenOf(db, animalId).map((row) => ({
    animalId: row.id,
    name: row.name,
    code: row.code,
    crestLinkId: row.crestLinkId,
  }));
  const grandchildren = uniqueRelatives(
    children.flatMap((child) =>
      childrenOf(db, child.animalId).map((row) => ({
        animalId: row.id,
        name: row.name,
        code: row.code,
        crestLinkId: row.crestLinkId,
      })),
    ),
  );
  const greatGrandchildren = uniqueRelatives(
    grandchildren.flatMap((row) =>
      childrenOf(db, row.animalId).map((desc) => ({
        animalId: desc.id,
        name: desc.name,
        code: desc.code,
        crestLinkId: desc.crestLinkId,
      })),
    ),
  );

  return {
    crestLinkId: link.id,
    currentOwnerLabel: link.currentOwnerLabel,
    ownerHistory: link.ownerHistory,
    pendingCode: pending?.code ?? null,
    publicPath: crestLinkPublicPath(link.id),
    sire,
    dam,
    grandparents,
    children,
    grandchildren,
    greatGrandchildren,
  };
}
