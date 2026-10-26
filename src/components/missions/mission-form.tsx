"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";
import {
  BILL_TO_LABELS,
  BILL_TO_OPTIONS,
  MISSION_STATUSES,
  MISSION_STATUS_LABELS,
  RATE_TYPES,
  RATE_TYPE_LABELS,
  type BillTo,
  type MissionStatus,
  type RateType,
} from "@/lib/enums";
import { bpToInputValue } from "@/lib/money";

export type MissionFormValues = {
  id?: string;
  title: string;
  reference: string | null;
  description: string | null;
  clientId: string;
  agencyId: string | null;
  billTo: string;
  rateType: string;
  rate: number;
  currency: string;
  vatRate: number | null;
  budget: number | null;
  purchaseOrder: string | null;
  startDate: string;
  endDate: string;
  status: string;
  notes: string | null;
};

export function MissionForm({
  action,
  values,
  clients,
  agencies,
  currencies,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  values: MissionFormValues;
  clients: { id: string; name: string }[];
  agencies: { id: string; name: string }[];
  currencies: { code: string; name: string; decimals: number }[];
  submitLabel: string;
}) {
  const [agencyId, setAgencyId] = useState(values.agencyId ?? "");
  const [currency, setCurrency] = useState(values.currency);
  const [rate, setRate] = useState(values.rate);
  const [budget, setBudget] = useState(values.budget ?? 0);

  const decimals = currencies.find((c) => c.code === currency)?.decimals ?? 2;

  return (
    <form action={action} className="flex flex-col gap-5">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <input type="hidden" name="rate" value={rate / 1000} />
      <input type="hidden" name="budget" value={budget > 0 ? budget / 1000 : ""} />

      <Card>
        <CardHeader
          title="Mission"
          description="Une mission regroupe les prestations d'un même engagement : elle alimente le CRA et pré-remplit vos factures."
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Intitulé" required className="sm:col-span-2">
            <Input name="title" defaultValue={values.title} required autoFocus />
          </Field>

          <Field label="Référence interne">
            <Input name="reference" defaultValue={values.reference ?? ""} />
          </Field>

          <Field label="Bon de commande client">
            <Input name="purchaseOrder" defaultValue={values.purchaseOrder ?? ""} />
          </Field>

          <Field label="Description" className="sm:col-span-2">
            <Textarea name="description" defaultValue={values.description ?? ""} rows={3} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Client et facturation"
          description="En régie via une agence, la prestation est réalisée pour le client final mais facturée à l'agence."
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Client final" required>
            <Select name="clientId" defaultValue={values.clientId} required>
              <option value="">— Sélectionner —</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Agence intermédiaire">
            <Select
              name="agencyId"
              value={agencyId}
              onChange={(event) => setAgencyId(event.target.value)}
            >
              <option value="">— Aucune (facturation directe) —</option>
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name}
                </option>
              ))}
            </Select>
          </Field>

          {agencyId && (
            <Field label="Destinataire de la facture" className="sm:col-span-2">
              <Select name="billTo" defaultValue={values.billTo}>
                {BILL_TO_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {BILL_TO_LABELS[option as BillTo]}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Tarification" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Mode de tarification">
            <Select name="rateType" defaultValue={values.rateType}>
              {RATE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {RATE_TYPE_LABELS[type as RateType]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Devise">
            <Select
              name="currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            >
              {currencies.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} — {item.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Tarif" hint="Par jour, par heure ou montant du forfait.">
            <MoneyInput value={rate} onChange={setRate} decimals={decimals} />
          </Field>

          <Field label="Budget total" hint="Facultatif, pour suivre la consommation.">
            <MoneyInput value={budget} onChange={setBudget} decimals={decimals} />
          </Field>

          <Field label="Taux de TVA" hint="En %. Vide = taux par défaut.">
            <Input
              name="vatRate"
              inputMode="decimal"
              defaultValue={values.vatRate === null ? "" : bpToInputValue(values.vatRate)}
              className="tnum"
            />
          </Field>

          <Field label="Statut">
            <Select name="status" defaultValue={values.status}>
              {MISSION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {MISSION_STATUS_LABELS[status as MissionStatus]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Début">
            <Input type="date" name="startDate" defaultValue={values.startDate} />
          </Field>

          <Field label="Fin prévue">
            <Input type="date" name="endDate" defaultValue={values.endDate} />
          </Field>

          <Field label="Notes" className="sm:col-span-2">
            <Textarea name="notes" defaultValue={values.notes ?? ""} rows={2} />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Enregistrement…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
