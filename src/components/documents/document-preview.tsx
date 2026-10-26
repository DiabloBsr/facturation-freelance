import Link from "next/link";
import { SubmitButton } from "@/components/ui/button";
import { buttonClass } from "@/components/ui/button-style";
import { IconDownload, IconEye } from "@/components/icons";
import { TEMPLATES } from "@/lib/templates";
import { cn } from "@/lib/cn";
import type { PdfViewModel } from "@/pdf/view-model";
import { setDocumentTemplate } from "@/server/actions/documents";
import { HtmlDocumentPreview } from "./html-preview";

/**
 * Aperçu du document.
 *
 * Le rendu affiché est du HTML, produit à partir du même modèle de vue que le
 * PDF : il s'affiche toujours, même lorsque le navigateur refuse d'afficher un
 * PDF dans la page. Le PDF reste accessible en plein écran et au téléchargement,
 * et fait foi pour l'impression.
 *
 * Le modèle prévisualisé est porté par l'URL : l'essai est donc rendu par le
 * serveur, sans dupliquer les cinq gabarits côté navigateur.
 */
export function DocumentPreview({
  documentId,
  currentTemplate,
  previewTemplate,
  vm,
}: {
  documentId: string;
  currentTemplate: string;
  previewTemplate: string;
  vm: PdfViewModel;
}) {
  const changed = previewTemplate !== currentTemplate;
  const previewName = TEMPLATES.find((t) => t.id === previewTemplate)?.name ?? previewTemplate;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {TEMPLATES.map((template) => {
            const active = previewTemplate === template.id;
            return (
              <Link
                key={template.id}
                href={`/documents/${documentId}?modele=${template.id}`}
                scroll={false}
                title={template.description}
                className={cn(
                  "rounded-full border px-3 py-1 text-[12px] font-medium transition-colors duration-150",
                  active
                    ? "border-accent bg-accent text-accent-contrast"
                    : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink",
                )}
              >
                {template.name}
                {template.id === currentTemplate && !active && (
                  <span className="ml-1 text-[10px] opacity-70">(actuel)</span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/documents/${documentId}/pdf?modele=${previewTemplate}`}
            target="_blank"
            rel="noreferrer"
            className={buttonClass("ghost", "sm")}
          >
            <IconEye className="h-4 w-4" />
            Voir le PDF
          </a>
          <a
            href={`/api/documents/${documentId}/pdf?dl=1&modele=${previewTemplate}`}
            className={buttonClass("secondary", "sm")}
          >
            <IconDownload className="h-4 w-4" />
            Télécharger
          </a>
        </div>
      </div>

      {changed && (
        <form
          action={setDocumentTemplate}
          className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-accent-border bg-accent-soft px-3.5 py-2.5"
        >
          <input type="hidden" name="id" value={documentId} />
          <input type="hidden" name="template" value={previewTemplate} />
          <p className="text-[13px] text-accent">
            Vous essayez le modèle <strong className="font-semibold">{previewName}</strong>. Il
            n&apos;est pas encore enregistré sur ce document.
          </p>
          <SubmitButton size="sm" pendingLabel="Application…">
            Appliquer ce modèle
          </SubmitButton>
        </form>
      )}

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-bg-subtle p-4 shadow-[var(--shadow-sm)]">
        <HtmlDocumentPreview vm={vm} template={previewTemplate} />
      </div>

      <p className="text-[12px] leading-relaxed text-muted">
        Aperçu à l&apos;écran, calculé à partir des mêmes données que le PDF. Le fichier
        téléchargé fait foi pour l&apos;impression et l&apos;envoi au client.
      </p>
    </div>
  );
}
