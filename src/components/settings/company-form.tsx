"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** Champ image : aperçu de l'existant, remplacement, ou retrait explicite. */
function ImageField({
  name,
  label,
  hint,
  current,
  ratio = "square",
}: {
  name: string;
  label: string;
  hint: string;
  current: string | null;
  ratio?: "square" | "wide";
}) {
  const [remove, setRemove] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const shown = remove ? null : (preview ?? current);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] font-medium text-ink">{label}</p>

      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius)] border border-dashed border-line bg-surface-2",
            ratio === "wide" ? "h-16 w-28" : "h-20 w-20",
          )}
        >
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="" className="h-full w-full object-contain p-1" />
          ) : (
            <span className="text-[10px] text-faint">Aucune</span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <input
            type="file"
            name={name}
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                setPreview(null);
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                setPreview(String(reader.result));
                setRemove(false);
              };
              reader.readAsDataURL(file);
            }}
            className="block w-full text-[12px] text-muted file:mr-3 file:cursor-pointer file:rounded-[var(--radius)] file:border file:border-line file:bg-surface file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-ink hover:file:bg-surface-hover"
          />
          <p className="text-[11px] leading-snug text-muted">{hint}</p>

          {current && (
            <label className="flex cursor-pointer items-center gap-2 text-[12px] text-muted">
              <input
                type="checkbox"
                name={`${name}Remove`}
                checked={remove}
                onChange={(event) => setRemove(event.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--accent)]"
              />
              Retirer l&apos;image actuelle
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

export type CompanyFormValues = {
  legalName: string;
  tradeName: string | null;
  legalForm: string | null;
  activity: string | null;
  slogan: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  region: string | null;
  country: string;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  website: string | null;
  logoData: string | null;
  stampData: string | null;
  signatureData: string | null;
  signatureName: string | null;
  signatureRole: string | null;
};

export function CompanyForm({
  action,
  values,
}: {
  action: (formData: FormData) => void | Promise<void>;
  values: CompanyFormValues;
}) {
  return (
    <form action={action} className="flex flex-col gap-5">
      <Card>
        <CardHeader
          title="Identité de l'entreprise"
          description="Ce bloc constitue l'en-tête « émetteur » de chaque devis et facture."
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Raison sociale" required hint="Le nom légal de l'entreprise.">
            <Input name="legalName" defaultValue={values.legalName} required />
          </Field>

          <Field label="Nom commercial" hint="Affiché en gros sur le document, s'il diffère.">
            <Input name="tradeName" defaultValue={values.tradeName ?? ""} />
          </Field>

          <Field label="Forme juridique">
            <Input name="legalForm" defaultValue={values.legalForm ?? ""} placeholder="EI, SARL, SARLU…" />
          </Field>

          <Field
            label="Activité"
            hint="Donnée administrative, conservée sur cette fiche. Elle n'est pas imprimée sur les documents."
          >
            <Input
              name="activity"
              defaultValue={values.activity ?? ""}
              placeholder="Développement logiciel"
            />
          </Field>

          <Field
            label="Accroche"
            hint="Courte phrase imprimée sous votre nom sur les documents. Laissez vide pour n'afficher que le nom."
            className="sm:col-span-2"
          >
            <Input name="slogan" defaultValue={values.slogan ?? ""} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Adresse et contact" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Adresse" className="sm:col-span-2">
            <Input name="addressLine1" defaultValue={values.addressLine1 ?? ""} />
          </Field>
          <Field label="Complément" className="sm:col-span-2">
            <Input name="addressLine2" defaultValue={values.addressLine2 ?? ""} />
          </Field>
          <Field label="Code postal">
            <Input name="postalCode" defaultValue={values.postalCode ?? ""} />
          </Field>
          <Field label="Ville">
            <Input name="city" defaultValue={values.city ?? ""} placeholder="Antananarivo" />
          </Field>
          <Field label="Région / province">
            <Input name="region" defaultValue={values.region ?? ""} />
          </Field>
          <Field label="Pays">
            <Input name="country" defaultValue={values.country} />
          </Field>
          <Field label="Téléphone">
            <Input name="phone" defaultValue={values.phone ?? ""} />
          </Field>
          <Field label="Mobile">
            <Input name="mobile" defaultValue={values.mobile ?? ""} />
          </Field>
          <Field label="E-mail">
            <Input type="email" name="email" defaultValue={values.email ?? ""} />
          </Field>
          <Field label="Site web">
            <Input name="website" defaultValue={values.website ?? ""} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Logo, cachet et signature"
          description="Images intégrées directement au PDF : elles restent disponibles hors connexion. 1,5 Mo maximum."
        />
        <div className="mt-4 grid gap-6 sm:grid-cols-3">
          <ImageField
            name="logo"
            label="Logo"
            hint="Affiché en en-tête. Un PNG à fond transparent rend le mieux."
            current={values.logoData}
          />
          <ImageField
            name="stamp"
            label="Cachet"
            hint="Tampon de l'entreprise, apposé près de la signature."
            current={values.stampData}
          />
          <ImageField
            name="signature"
            label="Signature"
            hint="Signature scannée, placée au-dessus de votre nom."
            current={values.signatureData}
            ratio="wide"
          />
        </div>

        <div className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
          <Field label="Nom du signataire">
            <Input name="signatureName" defaultValue={values.signatureName ?? ""} />
          </Field>
          <Field label="Qualité du signataire">
            <Input
              name="signatureRole"
              defaultValue={values.signatureRole ?? ""}
              placeholder="Gérant, Freelance…"
            />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Enregistrement…">Enregistrer l&apos;identité</SubmitButton>
      </div>
    </form>
  );
}
