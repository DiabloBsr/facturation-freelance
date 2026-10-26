"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox, Field, Input, Textarea, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/button";
import {
  BANK_ACCOUNT_KINDS,
  BANK_ACCOUNT_KIND_LABELS,
  type BankAccountKind,
} from "@/lib/enums";

export type BankAccountValues = {
  id?: string;
  kind: string;
  label: string;
  holder: string | null;
  bankName: string | null;
  branchName: string | null;
  bankCode: string | null;
  branchCode: string | null;
  accountNumber: string | null;
  ribKey: string | null;
  iban: string | null;
  bic: string | null;
  provider: string | null;
  phoneNumber: string | null;
  accountRef: string | null;
  currency: string;
  isDefault: boolean;
  showOnPdf: boolean;
  notes: string | null;
};

const MOBILE_PROVIDERS = ["MVola", "Orange Money", "Airtel Money"];

/**
 * Les champs affichés dépendent de la nature du compte : un RIB malgache
 * (code banque / guichet / compte / clé) n'a rien à voir avec un numéro MVola.
 */
export function BankAccountForm({
  action,
  values,
  currencies,
  submitLabel,
  title,
  description,
}: {
  action: (formData: FormData) => void | Promise<void>;
  values: BankAccountValues;
  currencies: { code: string; name: string }[];
  submitLabel: string;
  title: string;
  description?: string;
}) {
  const [kind, setKind] = useState(values.kind);

  const isBank = kind === "BANK" || kind === "OTHER";
  const isMobile = kind === "MOBILE_MONEY";
  const isWallet = kind === "PAYPAL" || kind === "WISE";

  return (
    <form action={action}>
      <Card>
        <CardHeader title={title} description={description} />
        {values.id && <input type="hidden" name="id" value={values.id} />}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Type de compte">
            <Select name="kind" value={kind} onChange={(event) => setKind(event.target.value)}>
              {BANK_ACCOUNT_KINDS.map((option) => (
                <option key={option} value={option}>
                  {BANK_ACCOUNT_KIND_LABELS[option as BankAccountKind]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Intitulé" required hint="Nom interne, ex. « BNI — compte principal »">
            <Input name="label" defaultValue={values.label} required />
          </Field>

          <Field label="Titulaire du compte">
            <Input name="holder" defaultValue={values.holder ?? ""} />
          </Field>

          <Field label="Devise du compte">
            <Select name="currency" defaultValue={values.currency}>
              {currencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} — {currency.name}
                </option>
              ))}
            </Select>
          </Field>

          {isBank && (
            <>
              <Field label="Banque">
                <Input name="bankName" defaultValue={values.bankName ?? ""} placeholder="BNI Madagascar" />
              </Field>
              <Field label="Agence">
                <Input name="branchName" defaultValue={values.branchName ?? ""} />
              </Field>

              <div className="sm:col-span-2">
                <p className="mb-2 text-[13px] font-medium text-ink">Relevé d&apos;identité bancaire</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Field label="Code banque">
                    <Input
                      name="bankCode"
                      defaultValue={values.bankCode ?? ""}
                      className="font-mono text-[13px]"
                      placeholder="00005"
                    />
                  </Field>
                  <Field label="Code guichet">
                    <Input
                      name="branchCode"
                      defaultValue={values.branchCode ?? ""}
                      className="font-mono text-[13px]"
                      placeholder="00000"
                    />
                  </Field>
                  <Field label="Numéro de compte">
                    <Input
                      name="accountNumber"
                      defaultValue={values.accountNumber ?? ""}
                      className="font-mono text-[13px]"
                    />
                  </Field>
                  <Field label="Clé RIB">
                    <Input
                      name="ribKey"
                      defaultValue={values.ribKey ?? ""}
                      className="font-mono text-[13px]"
                      placeholder="00"
                    />
                  </Field>
                </div>
              </div>

              <Field label="IBAN" hint="Pour les virements internationaux.">
                <Input
                  name="iban"
                  defaultValue={values.iban ?? ""}
                  className="font-mono text-[13px]"
                />
              </Field>
              <Field label="Code SWIFT / BIC">
                <Input
                  name="bic"
                  defaultValue={values.bic ?? ""}
                  className="font-mono text-[13px]"
                />
              </Field>
            </>
          )}

          {isMobile && (
            <>
              <Field label="Opérateur">
                <Input
                  name="provider"
                  defaultValue={values.provider ?? ""}
                  list="mobile-providers"
                  placeholder="MVola"
                />
              </Field>
              <Field label="Numéro">
                <Input
                  name="phoneNumber"
                  defaultValue={values.phoneNumber ?? ""}
                  className="font-mono text-[13px]"
                  placeholder="034 00 000 00"
                />
              </Field>
              <datalist id="mobile-providers">
                {MOBILE_PROVIDERS.map((provider) => (
                  <option key={provider} value={provider} />
                ))}
              </datalist>
            </>
          )}

          {isWallet && (
            <Field label="Identifiant du compte" className="sm:col-span-2">
              <Input
                name="accountRef"
                defaultValue={values.accountRef ?? ""}
                placeholder="Adresse e-mail ou @tag"
              />
            </Field>
          )}

          <Field label="Note" className="sm:col-span-2">
            <Textarea name="notes" defaultValue={values.notes ?? ""} rows={2} />
          </Field>
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
          <Checkbox
            name="isDefault"
            defaultChecked={values.isDefault}
            label="Compte par défaut"
            hint="Proposé automatiquement sur les nouveaux documents."
          />
          <Checkbox
            name="showOnPdf"
            defaultChecked={values.showOnPdf}
            label="Afficher sur les documents"
            hint="Décochez pour un compte utilisé uniquement en interne."
          />
        </div>

        <div className="mt-4 flex justify-end">
          <SubmitButton pendingLabel="Enregistrement…">{submitLabel}</SubmitButton>
        </div>
      </Card>
    </form>
  );
}
