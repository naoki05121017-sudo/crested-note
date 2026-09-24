import {
  CHECK_CADENCE_PRESETS,
  cadenceIdFromDays,
} from "@/lib/care/check-cadence";

export function CheckCadenceFields({
  defaultDays,
}: {
  defaultDays?: number;
}) {
  const selected = cadenceIdFromDays(defaultDays);

  return (
    <div className="grid gap-3 sm:col-span-2">
      <label className="grid gap-1 text-sm">
        <span className="font-medium">記録の間隔</span>
        <select
          name="checkCadence"
          defaultValue={selected}
          className="nc-input"
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
      <label className="grid gap-1 text-sm">
        <span className="font-medium">カスタムの日数</span>
        <input
          name="checkEveryDays"
          type="number"
          min={1}
          max={365}
          defaultValue={selected === "custom" ? defaultDays : ""}
          placeholder="カスタムを選んだとき"
          className="nc-input sm:max-w-40"
        />
        <span className="text-sm font-normal text-muted">
          「カスタム」を選んだときだけ使います。毎週・2週間ごと・1ヶ月ごとでは空のままで大丈夫です。
        </span>
      </label>
    </div>
  );
}
