"use client";

import { useMemo, useState } from "react";
import type { CalculatorTraitOption } from "@/app/components/calculator-traits";
import {
  OTHER_SECTION_LABEL,
  OTHER_SECTION_ORDER,
  TRAIT_PICKER_GROUP_LABEL,
  optionsInGroup,
  otherSectionFor,
  sortPickerOptions,
  traitMatchesQuery,
  traitMetaLabel,
} from "@/app/components/trait-picker-groups";

export function SelectedTraitChips({
  options,
  selectedIds,
  onRemove,
}: {
  options: CalculatorTraitOption[];
  selectedIds: string[];
  onRemove: (id: string) => void;
}) {
  if (selectedIds.length === 0) return null;
  const byId = new Map(options.map((option) => [option.id, option]));
  return (
    <div className="mb-4">
      <p className="mb-2 text-sm font-medium">選択中</p>
      <div className="flex flex-wrap gap-2">
        {selectedIds.map((id) => {
          const option = byId.get(id);
          return (
            <button
              key={id}
              type="button"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-3 text-sm font-medium text-ink"
              onClick={() => onRemove(id)}
              aria-label={`${option?.label ?? id} を外す`}
            >
              {option?.label ?? id}
              <span aria-hidden="true" className="text-lg leading-none">
                ×
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MorphPickButton({
  option,
  onPick,
}: {
  option: CalculatorTraitOption;
  onPick: (option: CalculatorTraitOption) => void;
}) {
  const meta = traitMetaLabel(option);
  return (
    <button
      type="button"
      className="flex min-h-12 w-full flex-col items-start justify-center rounded-2xl border border-line bg-surface px-3 py-2 text-left hover:bg-sand"
      onClick={() => onPick(option)}
    >
      <span className="text-sm font-medium leading-5">{option.label}</span>
      {meta ? <span className="mt-0.5 text-[11px] text-muted">{meta}</span> : null}
    </button>
  );
}

export function TraitCategoryPicker({
  options,
  onPick,
}: {
  options: CalculatorTraitOption[];
  onPick: (option: CalculatorTraitOption) => void;
}) {
  const [otherOpen, setOtherOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;
  const matches = useMemo(
    () => sortPickerOptions(options.filter((option) => traitMatchesQuery(option, query))),
    [options, query],
  );
  const basic = optionsInGroup(options, "basic");
  const other = optionsInGroup(options, "other");

  function pick(option: CalculatorTraitOption) {
    onPick(option);
    setQuery("");
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="grid gap-1 text-sm">
        <span className="font-medium">形質を検索</span>
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (event.target.value.trim()) setOtherOpen(false);
          }}
          placeholder="アザン、Sable、ソフトスケール…"
          className="nc-input"
          autoComplete="off"
        />
      </label>

      {options.length === 0 ? (
        <p className="rounded-2xl bg-sand px-4 py-4 text-sm text-muted">
          追加できる形質はすべて選択済みです。
        </p>
      ) : searching ? (
        <ul className="overflow-hidden rounded-2xl border border-line">
          {matches.length === 0 ? (
            <li className="px-4 py-4 text-sm text-muted">該当する形質がありません。</li>
          ) : (
            matches.map((option) => (
              <li key={option.id} className="border-t border-line first:border-t-0">
                <button
                  type="button"
                  className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-sand"
                  onClick={() => pick(option)}
                >
                  <span>{option.label}</span>
                  {traitMetaLabel(option) ? (
                    <span className="text-xs text-muted">{traitMetaLabel(option)}</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : (
        <>
          {basic.length > 0 ? (
            <div>
              <p className="mb-2 text-[11px] tracking-[0.18em] text-muted uppercase">
                {TRAIT_PICKER_GROUP_LABEL.basic}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {basic.map((option) => (
                  <MorphPickButton key={option.id} option={option} onPick={pick} />
                ))}
              </div>
            </div>
          ) : null}

          {other.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-line">
              <button
                type="button"
                className="flex min-h-12 w-full items-center justify-between gap-3 bg-[#faf7f2] px-4 py-3 text-left"
                aria-expanded={otherOpen}
                onClick={() => setOtherOpen((open) => !open)}
              >
                <span className="font-medium">
                  {TRAIT_PICKER_GROUP_LABEL.other} {otherOpen ? "" : "＋"}
                </span>
                <span className="text-xl text-muted" aria-hidden="true">
                  {otherOpen ? "▾" : "▸"}
                </span>
              </button>
              {otherOpen ? (
                <div>
                  {OTHER_SECTION_ORDER.map((section) => {
                    const items = other.filter((option) => otherSectionFor(option) === section);
                    if (items.length === 0) return null;
                    return (
                      <div key={section}>
                        <p className="bg-sand/70 px-4 py-2 text-[11px] tracking-[0.16em] text-muted">
                          {OTHER_SECTION_LABEL[section]}
                        </p>
                        <ul>
                          {items.map((option) => (
                            <li key={option.id} className="border-t border-line">
                              <button
                                type="button"
                                className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-sand"
                                onClick={() => pick(option)}
                              >
                                <span>{option.label}</span>
                                {traitMetaLabel(option) ? (
                                  <span className="text-xs text-muted">
                                    {traitMetaLabel(option)}
                                  </span>
                                ) : null}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
