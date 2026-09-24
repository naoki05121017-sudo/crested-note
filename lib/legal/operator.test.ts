import { describe, expect, it } from "vitest";
import { LEGAL_LINKS, LEGAL_OPERATOR_DEFAULTS, legalOperator } from "./operator";

describe("legal operator copy", () => {
  it("does not invent a seller identity while fields are unset", () => {
    expect(LEGAL_OPERATOR_DEFAULTS.sellerName).toBe("未設定");
    expect(LEGAL_OPERATOR_DEFAULTS.operatorName).toBe("未設定");
    expect(LEGAL_OPERATOR_DEFAULTS.address).toBe("未設定");
    expect(LEGAL_OPERATOR_DEFAULTS.phone).toBe("未設定");
    expect(LEGAL_OPERATOR_DEFAULTS.email).toBe("未設定");
    expect(LEGAL_OPERATOR_DEFAULTS.price).toBe("現在未定");
    expect(LEGAL_OPERATOR_DEFAULTS.paymentMethod).toBe("未定");
    expect(LEGAL_OPERATOR_DEFAULTS.paymentTiming).toBe("未定");
    expect(LEGAL_OPERATOR_DEFAULTS.serviceTiming).toBe("登録後すぐ利用可能");
    expect(LEGAL_OPERATOR_DEFAULTS.cancelMethod).toBe("後から設定");
    expect(LEGAL_OPERATOR_DEFAULTS.returns).toBe("後から設定");
  });

  it("lists the three public legal pages", () => {
    expect(LEGAL_LINKS.map((row) => row.href)).toEqual([
      "/legal/terms",
      "/legal/privacy",
      "/legal/tokushoho",
    ]);
  });

  it("falls back to defaults when env is empty", () => {
    expect(legalOperator().price).toBe("現在未定");
    expect(legalOperator().sellerName).toBe("未設定");
  });
});
