"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox, Field, FieldGroup, Input, Select, Textarea } from "@/components/ui/field";
import { buttonClass, SubmitButton } from "@/components/ui/button";
import { IconPlus, IconTrash } from "@/components/icons";
import {
  IDENTIFIER_PRESETS,
  PARTY_TYPES,
  PARTY_TYPE_LABELS,
  type PartyKind,
  type PartyType,
} from "@/lib/enums";
import { bpToInputValue } from "@/lib/money";

export type PartyFormValues = {
  id?: string;
  kind: PartyKind;
  type: string;
  name: string;
  legalName: string | null;
  legalForm: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  region: string | null;
  country: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  currency: string;
  vatRate: number | null;
  paymentTermsDays: number | null;
  commissionRate: number;
  withholdingRate: number;
  notes: string | null;
  isActive: boolean;
  identifiers: { label: string; value: string }[];
};

export function PartyForm({
  action,
  values,
  currencies,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  values: PartyFormValues;
  currencies: { code: string; name: string }[];
  submitLabel: string;
}) {
  const isAgency = values.kind === "AGENCY";
  const [identifiers, setIdentifiers] = useState(
    values.identifiers.length > 0
      ? values.identifiers
      : [
          { label: "NIF", value: "" },
          { label: "STAT", value: "" },
        ],
  );

  const setIdentifier = (index: number, patch: Partial<{ label: string; value: string }>) =>
    setIdentifiers((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );

  return (
    <form action={action} className="flex flex-col gap-5">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <input type="hidden" name="kind" value={values.kind} />

      <Card>
        <CardHeader
          title="Identité"
          description={
            isAgency
              ? "L'agence qui vous mandate et reçoit la facture pour le compte de son client."
              : "Le client à qui vous facturez vos prestations."
          }
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Nom commercial" required htmlFor="name" className="sm:col-span-2">
            <Input id="name" name="name" defaultValue={values.name} required autoFocus />
          </Field>

          <Field label="Raison sociale" hint="Telle qu'elle doit figurer sur la facture.">
            <Input name="legalName" defaultValue={values.legalName ?? ""} />
          </Field>

          <Field label="Forme juridique">
            <Input name="legalForm" defaultValue={values.legalForm ?? ""} placeholder="SARL, SA, EI…" />
          </Field>

          <Field label="Type">
            <Select name="type" defaultValue={values.type}>
              {PARTY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {PARTY_TYPE_LABELS[type as PartyType]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Site web">
            <Input name="website" defaultValue={values.website ?? ""} placeholder="https://" />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Adresse et contact" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Adresse" className="sm:col-span-2">
            <Input name="addressLine1" defaultValue={values.addressLine1 ?? ""} />
          </Field>
          <Field label="Complément d'adresse" className="sm:col-span-2">
            <Input name="addressLine2" defaultValue={values.addressLine2 ?? ""} />
          </Field>
          <Field label="Code postal">
            <Input name="postalCode" defaultValue={values.postalCode ?? ""} />
          </Field>
          <Field label="Ville">
            <Input name="city" defaultValue={values.city ?? ""} placeholder="Antananarivo" />
          </Field>
          <Field label="Région / province">
            <Input name="region" defaultValue={values.region ?? ""} placeholder="Zoug" />
          </Field>
          <Field label="Pays" hint="Laissé vide, il n'apparaît pas sur les documents.">
            <Input name="country" defaultValue={values.country} placeholder="Suisse" />
          </Field>
          <Field label="E-mail">
            <Input type="email" name="email" defaultValue={values.email ?? ""} />
          </Field>
          <Field label="Téléphone">
            <Input name="phone" defaultValue={values.phone ?? ""} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Identifiants légaux"
          description="NIF, STAT, RCS, numéro de TVA… Ils sont imprimés sur chaque document."
        />
        <div className="mt-4 flex flex-col gap-2">
          {identifiers.map((row, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                name="identifierLabel"
                value={row.label}
                onChange={(event) => setIdentifier(index, { label: event.target.value })}
                list="identifier-presets"
                placeholder="NIF"
                className="w-36"
                aria-label="Type d'identifiant"
              />
              <Input
                name="identifierValue"
                value={row.value}
                onChange={(event) => setIdentifier(index, { value: event.target.value })}
                placeholder="Numéro"
                className="flex-1"
                aria-label="Valeur de l'identifiant"
              />
              <button
                type="button"
                onClick={() => setIdentifiers((c) => c.filter((_, i) => i !== index))}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius)] text-faint transition-colors hover:bg-danger-soft hover:text-danger"
                aria-label="Retirer cet identifiant"
              >
                <IconTrash className="h-4 w-4" />
              </button>
            </div>
          ))}

          <datalist id="identifier-presets">
            {IDENTIFIER_PRESETS.map((preset) => (
              <option key={preset.label} value={preset.label}>
                {preset.hint}
              </option>
            ))}
          </datalist>

          <button
            type="button"
            onClick={() => setIdentifiers((c) => [...c, { label: "", value: "" }])}
            className={buttonClass("secondary", "sm", "w-fit")}
          >
            <IconPlus className="h-4 w-4" />
            Ajouter un identifiant
          </button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Conditions commerciales" description="Reprises par défaut sur les documents." />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Devise de facturation">
            <Select name="currency" defaultValue={values.currency}>
              {currencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} — {currency.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Délai de paiement" hint="En jours. Vide = réglage de l'entreprise.">
            <Input
              name="paymentTermsDays"
              inputMode="numeric"
              defaultValue={values.paymentTermsDays ?? ""}
              className="tnum"
            />
          </Field>

          <Field label="Taux de TVA appliqué" hint="En %. Vide = taux par défaut.">
            <Input
              name="vatRate"
              inputMode="decimal"
              defaultValue={values.vatRate === null ? "" : bpToInputValue(values.vatRate)}
              className="tnum"
            />
          </Field>

          <Field label="Retenue à la source" hint="En %, appliquée sur le hors taxes.">
            <Input
              name="withholdingRate"
              inputMode="decimal"
              defaultValue={bpToInputValue(values.withholdingRate)}
              className="tnum"
            />
          </Field>

          {isAgency && (
            <Field
              label="Commission de l'agence"
              hint="En %, à titre indicatif sur la fiche."
              className="sm:col-span-2"
            >
              <Input
                name="commissionRate"
                inputMode="decimal"
                defaultValue={bpToInputValue(values.commissionRate)}
                className="tnum"
              />
            </Field>
          )}
        </div>
      </Card>

      <Card>
        <FieldGroup title="Divers">
          <Field label="Notes internes">
            <Textarea name="notes" defaultValue={values.notes ?? ""} rows={3} />
          </Field>
          <Checkbox
            name="isActive"
            defaultChecked={values.isActive}
            label="Fiche active"
            hint="Une fiche inactive n'apparaît plus dans les listes de sélection."
          />
        </FieldGroup>
      </Card>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Enregistrement…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
