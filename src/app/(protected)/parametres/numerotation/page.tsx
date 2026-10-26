import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RESET_POLICIES, RESET_POLICY_LABELS, type ResetPolicy } from "@/lib/enums";
import { previewNumber } from "@/lib/numbering";
import { today } from "@/lib/dates";
import { getSequences } from "@/server/settings";
import { saveSequences } from "@/server/actions/settings";

export const metadata = { title: "Numérotation" };

export default async function ParametresNumerotationPage() {
  const sequences = await getSequences();
  const now = today();

  return (
    <form action={saveSequences} className="flex flex-col gap-5">
      <Card>
        <CardHeader
          title="Comment fonctionne la numérotation"
          description="Un document reste en brouillon tant qu'il n'est pas validé : le numéro n'est réservé qu'au moment de la validation, et de façon atomique. La suite reste donc continue, sans trou ni doublon, même si vous abandonnez un brouillon."
        />
        <div className="mt-4 flex flex-wrap gap-2 text-[12px] text-muted">
          <Token token="{PREFIX}" description="le préfixe ci-dessous" />
          <Token token="{YYYY}" description="année sur 4 chiffres" />
          <Token token="{YY}" description="année sur 2 chiffres" />
          <Token token="{MM}" description="mois sur 2 chiffres" />
          <Token token="{SEQ}" description="compteur, complété de zéros" />
        </div>
      </Card>

      {sequences.map((sequence) => (
        <Card key={sequence.key}>
          <CardHeader
            title={sequence.label}
            actions={
              <Badge tone="accent">
                Prochain : {previewNumber(sequence, now)}
              </Badge>
            }
          />
          <input type="hidden" name="sequenceKey" value={sequence.key} />

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Préfixe">
              <Input
                name="sequencePrefix"
                defaultValue={sequence.prefix}
                className="font-mono text-[13px] uppercase"
              />
            </Field>

            <Field label="Gabarit" className="lg:col-span-2">
              <Input
                name="sequencePattern"
                defaultValue={sequence.pattern}
                className="font-mono text-[13px]"
              />
            </Field>

            <Field label="Zéros de tête" hint="Longueur du compteur.">
              <Input
                name="sequencePadding"
                inputMode="numeric"
                defaultValue={String(sequence.padding)}
                className="tnum text-right"
              />
            </Field>

            <Field label="Prochain numéro">
              <Input
                name="sequenceNext"
                inputMode="numeric"
                defaultValue={String(sequence.nextValue)}
                className="tnum text-right"
              />
            </Field>

            <Field label="Remise à zéro" className="sm:col-span-2">
              <Select name="sequencePolicy" defaultValue={sequence.resetPolicy}>
                {RESET_POLICIES.map((policy) => (
                  <option key={policy} value={policy}>
                    {RESET_POLICY_LABELS[policy as ResetPolicy]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>
      ))}

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Enregistrement…">Enregistrer la numérotation</SubmitButton>
      </div>
    </form>
  );
}

function Token({ token, description }: { token: string; description: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1">
      <code className="font-mono text-[11px] font-semibold text-accent">{token}</code>
      <span>{description}</span>
    </span>
  );
}
