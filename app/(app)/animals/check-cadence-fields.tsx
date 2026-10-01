"use client";

import { useState } from "react";
import {
  CHECK_CADENCE_PRESETS,
  cadenceIdFromDays,
  type CheckCadenceId,
} from "@/lib/care/check-cadence";

export function CheckCadenceFields({
  defaultDays,
}: {
  defaultDays?: number;
}) {
  const initial = cadenceIdFromDays(defaultDays);
  const [cadence, setCadence] = useState<CheckCadenceId>(initial);
  const [customDays, setCustomDays] = useState(
    initial === "custom" && defaultDays ? String(defaultDays) : "7",
  );
  const customValue = Math.max(1, Math.min(365, Number.parseInt(customDays, 10) || 1));

  return (
    <div className="grid gap-3 sm:col-span-2">
      <label className="grid gap-1 text-sm">
        <span className="font-medium">記録の間隔</span>
        <input type="hidden" name="checkCadence" value={cadence} />
        <select
          value={cadence}
          onChange={(event) =>
            setCadence(event.target.value as CheckCadenceId)
          }
          className="nc-input min-h-12"
        >
          <option value="unset">まだ決めていない</option>
          {CHECK_CADENCE_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
          <option value="custom">カスタム</option>
        </select>
      </label>
      {cadence === "custom" ? (
        <div className="grid gap-2 text-sm">
          <span className="font-medium">日数</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="nc-btn-ghost min-h-12 w-12 px-0 text-lg"
              aria-label="1日減らす"
              onClick={() => setCustomDays(String(Math.max(1, customValue - 1)))}
            >
              −
            </button>
            <input
              name="checkEveryDays"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={customDays}
              onChange={(event) =>
                setCustomDays(event.target.value.replace(/[^\d]/g, ""))
              }
              className="nc-input min-h-12 flex-1 text-center text-xl font-semibold tabular-nums"
            />
            <button
              type="button"
              className="nc-btn-ghost min-h-12 w-12 px-0 text-lg"
              aria-label="1日増やす"
              onClick={() => setCustomDays(String(Math.min(365, customValue + 1)))}
            >
              ＋
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
