import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/button";
import { TemplatePicker } from "@/components/settings/template-picker";
import { getCompany } from "@/server/settings";
import { updateAppearance } from "@/server/actions/settings";

export const metadata = { title: "Modèles & mentions" };

export default async function ParametresModelesPage() {
  const company = await getCompany();

  return (
    <form action={updateAppearance} className="flex flex-col gap-5">
      <Card>
        <CardHeader
          title="Modèle de document par défaut"
          description="Appliqué aux nouveaux documents. Chaque document peut ensuite utiliser un autre modèle, et vous pouvez tous les essayer depuis l'aperçu."
        />
        <TemplatePicker
          name="defaultTemplate"
          defaultValue={company.defaultTemplate}
          accentColor={company.accentColor}
        />
      </Card>

      <Card>
        <CardHeader
          title="Couleur d'accent"
          description="Bandeaux, titres et totaux du PDF s'appuient sur cette couleur."
        />
        <div className="mt-4 flex items-center gap-3">
          <input
            type="color"
            name="accentColor"
            defaultValue={company.accentColor}
            className="h-11 w-16 cursor-pointer rounded-[var(--radius)] border border-line bg-surface p-1"
            aria-label="Couleur d'accent"
          />
          <p className="text-[13px] text-muted">
            Une teinte soutenue et peu saturée reste lisible à l&apos;impression noir et blanc.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Mentions par défaut"
          description="Pré-remplissent chaque nouveau document ; elles restent modifiables au cas par cas."
        />
        <div className="mt-4 grid gap-4">
          <Field label="Conditions de règlement">
            <Textarea name="defaultTerms" defaultValue={company.defaultTerms ?? ""} rows={4} />
          </Field>
          <Field label="Pied de page">
            <Input name="defaultFooter" defaultValue={company.defaultFooter ?? ""} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Éléments imprimés" />
        <div className="mt-4 flex flex-col gap-3">
          <Checkbox
            name="showAmountInWords"
            defaultChecked={company.showAmountInWords}
            label="Montant en toutes lettres"
            hint="« Arrêtée la présente facture à la somme de… » — mention d'usage à Madagascar et en zone francophone."
          />
          <Checkbox
            name="showStampOnPdf"
            defaultChecked={company.showStampOnPdf}
            label="Afficher le cachet"
            hint="Nécessite une image de cachet dans l'onglet Identité."
          />
          <Checkbox
            name="showSignatureOnPdf"
            defaultChecked={company.showSignatureOnPdf}
            label="Afficher la signature"
            hint="Nécessite une image de signature dans l'onglet Identité."
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
      </div>
    </form>
  );
}
