"use client";

import { useEffect, useState } from "react";
import { Input } from "./field";
import {
  bpToInputValue,
  milliToInputValue,
  parseAmountOrZero,
  parseRateToBp,
  MILLI,
} from "@/lib/money";
import { cn } from "@/lib/cn";

/**
 * Champ monétaire : l'utilisateur tape librement ("12 500,50"), la valeur
 * remontée est toujours un entier de milli-unités.
 */
export function MoneyInput({
  value,
  onChange,
  decimals = 2,
  suffix,
  className,
  ...props
}: {
  value: number;
  onChange: (milli: number) => void;
  decimals?: number;
  suffix?: string;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [raw, setRaw] = useState(() => milliToInputValue(value, decimals));

  // Resynchronise seulement si la valeur externe diverge réellement,
  // afin de ne pas écraser la frappe en cours.
  useEffect(() => {
    if (parseAmountOrZero(raw) !== value) setRaw(milliToInputValue(value, decimals));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimals]);

  return (
    <div className="relative">
      <Input
        inputMode="decimal"
        value={raw}
        onChange={(event) => {
          setRaw(event.target.value);
          onChange(parseAmountOrZero(event.target.value));
        }}
        onBlur={() => setRaw(milliToInputValue(parseAmountOrZero(raw), decimals))}
        className={cn("tnum text-right", suffix && "pr-10", className)}
        {...props}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-faint">
          {suffix}
        </span>
      )}
    </div>
  );
}

/** Champ de quantité (jours, heures, unités) — accepte les décimales. */
export function QuantityInput({
  value,
  onChange,
  className,
  ...props
}: {
  value: number;
  onChange: (milli: number) => void;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [raw, setRaw] = useState(() => String(value / MILLI));

  useEffect(() => {
    const parsed = Number(raw.replace(",", "."));
    if (!Number.isFinite(parsed) || Math.round(parsed * MILLI) !== value) {
      setRaw(String(value / MILLI));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Input
      inputMode="decimal"
      value={raw}
      onChange={(event) => {
        setRaw(event.target.value);
        const parsed = Number(event.target.value.replace(",", "."));
        onChange(Number.isFinite(parsed) ? Math.round(parsed * MILLI) : 0);
      }}
      className={cn("tnum text-right", className)}
      {...props}
    />
  );
}

/** Champ de taux en pourcentage — la valeur remontée est en points de base. */
export function RateInput({
  value,
  onChange,
  className,
  ...props
}: {
  value: number;
  onChange: (basisPoints: number) => void;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [raw, setRaw] = useState(() => bpToInputValue(value));

  useEffect(() => {
    if (parseRateToBp(raw) !== value) setRaw(bpToInputValue(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative">
      <Input
        inputMode="decimal"
        value={raw}
        onChange={(event) => {
          setRaw(event.target.value);
          onChange(parseRateToBp(event.target.value));
        }}
        className={cn("tnum pr-7 text-right", className)}
        {...props}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-faint">
        %
      </span>
    </div>
  );
}
