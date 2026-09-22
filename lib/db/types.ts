import type { Genotype, PairingResult } from "@/lib/genetics";

export const SEXES = ["male", "female", "unknown"] as const;
export type Sex = (typeof SEXES)[number];

export const ANIMAL_STATUSES = [
  "active",
  "breeding",
  "sold",
  "deceased",
] as const;
export type AnimalStatus = (typeof ANIMAL_STATUSES)[number];

export const BREEDING_STATUSES = ["active", "closed"] as const;
export type BreedingStatus = (typeof BREEDING_STATUSES)[number];

export const EGG_RESULTS = [
  "incubating",
  "fertile",
  "infertile",
  "hatched",
  "failed",
] as const;
export type EggResult = (typeof EGG_RESULTS)[number];

export const PROJECT_STATUSES = ["active", "paused", "done"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_ROLES = ["candidate", "sire", "dam", "offspring"] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

export const CREST_LINK_EVENT_TYPES = [
  "issued",
  "transfer_issued",
  "transferred",
  "retired",
] as const;
export type CrestLinkEventType = (typeof CREST_LINK_EVENT_TYPES)[number];

export const CREST_LINK_STATUSES = ["active", "retired"] as const;
export type CrestLinkStatus = (typeof CREST_LINK_STATUSES)[number];

export const CREST_LINK_TRANSFER_STATUSES = [
  "pending",
  "redeemed",
  "revoked",
  "expired",
] as const;
export type CrestLinkTransferStatus =
  (typeof CREST_LINK_TRANSFER_STATUSES)[number];

/** Lifetime identity. IDs are never reused, including after delete or transfer. */
export type CrestLinkEvent = {
  at: string;
  type: CrestLinkEventType;
};

/** Display-name history only. Do not store contact details or prefecture here. */
export type CrestLinkOwnerEntry = {
  at: string;
  ownerLabel: string;
};

export type CrestLinkRecord = {
  id: string;
  animalId: string;
  status: CrestLinkStatus;
  createdAt: string;
  currentOwnerLabel: string;
  ownerHistory: CrestLinkOwnerEntry[];
  /** Parent Crest Link IDs; kept even if local animal rows later move. */
  sireCrestLinkId: string;
  damCrestLinkId: string;
  /** Reserved for N.CRESTED origin, QR, and public pages. */
  originKind: "local" | "ncrested";
  payloadVersion: 1;
  events: CrestLinkEvent[];
};

export type CrestLinkTransferRecord = {
  id: string;
  code: string;
  crestLinkId: string;
  animalId: string;
  createdAt: string;
  expiresAt: string;
  redeemedAt: string;
  status: CrestLinkTransferStatus;
  /** Animal identity only. Never store previous-owner personal fields. */
  payloadVersion: 1;
};

export type AnimalRecord = {
  id: string;
  /** Internal Crest Link row id (NC-000001). Not shown as 個体ID. */
  crestLinkId: string;
  /** User-facing 個体ID (NC-000001 display). Legacy rows may still store NC-0001; UI pads to 6 digits. */
  code: string;
  name: string;
  sex: Sex;
  hatchDate: string;
  status: AnimalStatus;
  sireId: string;
  damId: string;
  morphLabel: string;
  traits: string[];
  traitLevels?: Record<string, number>;
  notes: string;
  photoUrl: string;
  isPublic: boolean;
  shareSlug: string;
  prefecture: string;
  createdAt: string;
  updatedAt: string;
};

export type AnimalGeneRecord = {
  animalId: string;
  locusId: string;
  /** Locus state id, e.g. het / visual / sable / superLillyWhite. */
  status: string;
};

export type WeightLogRecord = {
  id: string;
  animalId: string;
  weighedOn: string;
  weightG: number;
  notes: string;
};

export type BreedingRecord = {
  id: string;
  maleId: string;
  femaleId: string;
  startedOn: string;
  endedOn: string;
  status: BreedingStatus;
  notes: string;
  predictionId: string;
  projectId: string;
  createdAt: string;
};

export type ClutchRecord = {
  id: string;
  breedingId: string;
  laidOn: string;
  notes: string;
};

export type EggRecord = {
  id: string;
  clutchId: string;
  expectedHatchOn: string;
  result: EggResult;
  hatchAnimalId: string;
  notes: string;
};

export type ProjectRecord = {
  id: string;
  name: string;
  goal: string;
  notes: string;
  status: ProjectStatus;
  createdAt: string;
};

export type ProjectMemberRecord = {
  projectId: string;
  animalId: string;
  role: ProjectRole;
};

export type PredictionRecord = {
  id: string;
  name: string;
  maleId: string;
  femaleId: string;
  parentA: Genotype;
  parentB: Genotype;
  pairing: PairingResult;
  breedingId: string;
  projectId: string;
  createdAt: string;
};

export type SettingsRecord = {
  displayName: string;
  collectionName: string;
  prefecture: string;
  publicByDefault: boolean;
};

/** Inbox for operator review only. Never render this list to general users. */
export const FEEDBACK_CATEGORIES = [
  "improvement",
  "bug",
  "morph",
  "ui",
  "genetics",
  "other",
] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

/** Categories shown on the user form (subset of operator categories). */
export const FEEDBACK_USER_CATEGORIES = [
  "improvement",
  "bug",
  "morph",
  "other",
] as const;
export type FeedbackUserCategory = (typeof FEEDBACK_USER_CATEGORIES)[number];

export const FEEDBACK_STATUSES = [
  "open",
  "reviewing",
  "planned",
  "done",
  "hold",
] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export type FeedbackRecord = {
  id: string;
  category: FeedbackCategory;
  status: FeedbackStatus;
  body: string;
  /** Optional; do not require personal contact details. */
  name: string;
  createdAt: string;
  updatedAt: string;
  /** Operator-only note. Never shown on the user form. */
  adminNote: string;
};

export type DatabaseFile = {
  animals: AnimalRecord[];
  genes: AnimalGeneRecord[];
  weights: WeightLogRecord[];
  breedings: BreedingRecord[];
  clutches: ClutchRecord[];
  eggs: EggRecord[];
  projects: ProjectRecord[];
  projectMembers: ProjectMemberRecord[];
  predictions: PredictionRecord[];
  settings: SettingsRecord;
  feedback: FeedbackRecord[];
  crestLinkSeq: number;
  /** High-water for display animal codes. Survives deletes; not derived from the current list. */
  animalCodeSeq: number;
  crestLinks: CrestLinkRecord[];
  crestLinkTransfers: CrestLinkTransferRecord[];
};

export type Animal = AnimalRecord & {
  genotype: Genotype;
};

export type Clutch = ClutchRecord & {
  eggs: EggRecord[];
};

export type Breeding = BreedingRecord & {
  clutches: Clutch[];
};

export const DEFAULT_SETTINGS: SettingsRecord = {
  displayName: "",
  collectionName: "クレスノート",
  prefecture: "",
  publicByDefault: false,
};
