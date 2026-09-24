/**
 * 特商法・問い合わせ用の表示値。
 * 未定の項目はここに書くか、同名の NEXT_PUBLIC_LEGAL_* で上書きする。
 * 実在しない氏名・住所・電話番号は入れない。
 */
export type LegalOperator = {
  sellerName: string;
  operatorName: string;
  address: string;
  phone: string;
  email: string;
  price: string;
  paymentMethod: string;
  paymentTiming: string;
  serviceTiming: string;
  cancelMethod: string;
  returns: string;
};

export const LEGAL_OPERATOR_DEFAULTS: LegalOperator = {
  sellerName: "未設定",
  operatorName: "未設定",
  address: "未設定",
  phone: "未設定",
  email: "未設定",
  price: "現在未定",
  paymentMethod: "未定",
  paymentTiming: "未定",
  serviceTiming: "登録後すぐ利用可能",
  cancelMethod: "後から設定",
  returns: "後から設定",
};

const ENV_KEYS: Record<keyof LegalOperator, string> = {
  sellerName: "NEXT_PUBLIC_LEGAL_SELLER_NAME",
  operatorName: "NEXT_PUBLIC_LEGAL_OPERATOR_NAME",
  address: "NEXT_PUBLIC_LEGAL_ADDRESS",
  phone: "NEXT_PUBLIC_LEGAL_PHONE",
  email: "NEXT_PUBLIC_LEGAL_EMAIL",
  price: "NEXT_PUBLIC_LEGAL_PRICE",
  paymentMethod: "NEXT_PUBLIC_LEGAL_PAYMENT_METHOD",
  paymentTiming: "NEXT_PUBLIC_LEGAL_PAYMENT_TIMING",
  serviceTiming: "NEXT_PUBLIC_LEGAL_SERVICE_TIMING",
  cancelMethod: "NEXT_PUBLIC_LEGAL_CANCEL",
  returns: "NEXT_PUBLIC_LEGAL_RETURNS",
};

function fromEnv(key: keyof LegalOperator): string {
  const value = process.env[ENV_KEYS[key]]?.trim() ?? "";
  return value || LEGAL_OPERATOR_DEFAULTS[key];
}

export function legalOperator(): LegalOperator {
  return {
    sellerName: fromEnv("sellerName"),
    operatorName: fromEnv("operatorName"),
    address: fromEnv("address"),
    phone: fromEnv("phone"),
    email: fromEnv("email"),
    price: fromEnv("price"),
    paymentMethod: fromEnv("paymentMethod"),
    paymentTiming: fromEnv("paymentTiming"),
    serviceTiming: fromEnv("serviceTiming"),
    cancelMethod: fromEnv("cancelMethod"),
    returns: fromEnv("returns"),
  };
}

export const LEGAL_LINKS = [
  { href: "/legal/terms", label: "利用規約" },
  { href: "/legal/privacy", label: "プライバシーポリシー" },
  { href: "/legal/tokushoho", label: "特定商取引法に基づく表記" },
] as const;
