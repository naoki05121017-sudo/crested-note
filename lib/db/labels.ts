import { displayAnimalId } from "./animal-code";
import type {
  AnimalStatus,
  BreedingStatus,
  EggResult,
  FeedbackCategory,
  FeedbackStatus,
  ProjectRole,
  ProjectStatus,
  Sex,
} from "./types";

export const SEX_LABEL: Record<Sex, string> = {
  male: "オス",
  female: "メス",
  unknown: "不明",
};

export const ANIMAL_STATUS_LABEL: Record<AnimalStatus, string> = {
  active: "飼育中",
  breeding: "繁殖中",
  sold: "売却",
  deceased: "死亡",
};

export const BREEDING_STATUS_LABEL: Record<BreedingStatus, string> = {
  active: "進行中",
  closed: "終了",
};

export const EGG_RESULT_LABEL: Record<EggResult, string> = {
  incubating: "孵化待ち",
  fertile: "有精",
  infertile: "無精",
  hatched: "孵化",
  failed: "失敗",
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  active: "進行中",
  paused: "一時停止",
  done: "完了",
};

export const PROJECT_ROLE_LABEL: Record<ProjectRole, string> = {
  candidate: "候補",
  sire: "父",
  dam: "母",
  offspring: "子",
};

export const FEEDBACK_CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  improvement: "改善提案",
  bug: "不具合",
  morph: "モルフ追加",
  ui: "UI",
  genetics: "計算",
  other: "質問・その他",
};

export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  open: "未対応",
  reviewing: "確認中",
  planned: "対応予定",
  done: "対応済み",
  hold: "保留",
};

export function animalTitle(animal: { name: string; code?: string }): string {
  const id = displayAnimalId(animal);
  return id !== "未発行" ? `${animal.name}（${id}）` : animal.name;
}

export const PREFECTURES = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
] as const;
