"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { TEMPLATES } from "@/lib/templates";

/** Vignette schématique du gabarit, dessinée en CSS (aucune image à charger). */
function Thumb({ id, accent }: { id: string; accent: string }) {
  const bar = "rounded-[1px] bg-current";

  if (id === "moderne") {
    return (
      <div className="flex h-full w-full overflow-hidden rounded-[3px] bg-white">
        <div className="w-1/3" style={{ backgroundColor: accent }} />
        <div className="flex flex-1 flex-col gap-1 p-1.5 text-line-strong">
          <div className={cn(bar, "h-1.5 w-2/3")} style={{ backgroundColor: accent }} />
          <div className={cn(bar, "h-0.5 w-full opacity-40")} />
          <div className={cn(bar, "h-0.5 w-5/6 opacity-40")} />
          <div className="mt-auto flex justify-end">
            <div className={cn(bar, "h-1 w-1/2")} style={{ backgroundColor: accent }} />
          </div>
        </div>
      </div>
    );
  }

  if (id === "minimal") {
    return (
      <div className="flex h-full w-full flex-col gap-1 overflow-hidden rounded-[3px] bg-white p-2 text-line-strong">
        <div className={cn(bar, "h-1 w-1/3 opacity-70")} />
        <div className="my-0.5 h-px w-full bg-current opacity-25" />
        <div className={cn(bar, "h-0.5 w-full opacity-30")} />
        <div className={cn(bar, "h-0.5 w-4/5 opacity-30")} />
        <div className={cn(bar, "h-0.5 w-5/6 opacity-30")} />
        <div className="mt-auto h-px w-full bg-current opacity-40" />
        <div className={cn(bar, "h-1 w-1/3 self-end opacity-80")} />
      </div>
    );
  }

  if (id === "elegant") {
    return (
      <div className="flex h-full w-full flex-col items-center gap-1 overflow-hidden rounded-[3px] bg-white p-2 text-line-strong">
        <div className={cn(bar, "h-1 w-1/2")} style={{ backgroundColor: accent }} />
        <div className="my-0.5 h-px w-3/4 bg-current opacity-30" />
        <div className={cn(bar, "h-0.5 w-full opacity-30")} />
        <div className={cn(bar, "h-0.5 w-full opacity-30")} />
        <div
          className="mt-auto h-2 w-2/3 rounded-[1px]"
          style={{ backgroundColor: accent }}
        />
      </div>
    );
  }

  if (id === "compact") {
    return (
      <div className="flex h-full w-full flex-col gap-[3px] overflow-hidden rounded-[3px] bg-white p-1.5 text-line-strong">
        <div className="flex items-center justify-between">
          <div className={cn(bar, "h-0.5 w-1/3 opacity-50")} />
          <div className={cn(bar, "h-1 w-1/4")} style={{ backgroundColor: accent }} />
        </div>
        <div className="h-0.5 w-full" style={{ backgroundColor: accent }} />
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className={cn(bar, "h-[2px] w-full opacity-25")} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-[3px] bg-white">
      <div className="h-3 w-full" style={{ backgroundColor: accent }} />
      <div className="flex flex-1 flex-col gap-1 p-1.5 text-line-strong">
        <div className="flex justify-between">
          <div className={cn(bar, "h-0.5 w-1/3 opacity-40")} />
          <div className={cn(bar, "h-2 w-1/4 opacity-20")} />
        </div>
        <div className="mt-1 h-1 w-full" style={{ backgroundColor: accent }} />
        <div className={cn(bar, "h-0.5 w-full opacity-30")} />
        <div className={cn(bar, "h-0.5 w-full opacity-30")} />
        <div className="mt-auto h-1.5 w-1/2 self-end" style={{ backgroundColor: accent }} />
      </div>
    </div>
  );
}

export function TemplatePicker({
  name,
  defaultValue,
  accentColor,
}: {
  name: string;
  defaultValue: string;
  accentColor: string;
}) {
  const [selected, setSelected] = useState(defaultValue);

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {TEMPLATES.map((template) => {
        const active = selected === template.id;
        return (
          <label
            key={template.id}
            className={cn(
              "group flex cursor-pointer flex-col gap-3 rounded-[var(--radius-lg)] border p-3 transition-all duration-150",
              active
                ? "border-accent bg-accent-soft shadow-[var(--shadow-sm)]"
                : "border-line bg-surface hover:border-line-strong hover:shadow-[var(--shadow-xs)]",
            )}
          >
            <input
              type="radio"
              name={name}
              value={template.id}
              checked={active}
              onChange={() => setSelected(template.id)}
              className="sr-only"
            />

            <div className="h-24 w-full overflow-hidden rounded-[var(--radius)] border border-line bg-surface-2 p-2">
              <Thumb id={template.id} accent={accentColor} />
            </div>

            <div>
              <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                {template.name}
                {active && (
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-contrast">
                    choisi
                  </span>
                )}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">{template.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {template.traits.map((trait) => (
                  <span
                    key={trait}
                    className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[10px] text-muted"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
}
