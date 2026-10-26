import { PageHeader, PageShell } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button-style";
import { IconDownload, IconEye } from "@/components/icons";
import {
  INTERFACE_PROPOSALS,
  InterfaceMockup,
} from "@/components/galerie/interface-mockups";
import { HtmlDocumentPreview, PreviewFrame } from "@/components/documents/html-preview";
import { LogoMark } from "@/components/galerie/logo-mark";
import { SubmitButton } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/field";
import { TEMPLATES } from "@/lib/templates";
import { LOGO_FAMILIES, LOGO_PROPOSALS } from "@/lib/logos";
import { buildDemoViewModel } from "@/pdf/demo";
import { getCompany, getLogoMark } from "@/server/settings";
import { chooseLogoMark } from "@/server/actions/settings";

export const metadata = { title: "Galerie" };

export default async function GaleriePage() {
  const [vm, company, currentMark] = await Promise.all([
    buildDemoViewModel(),
    getCompany(),
    getLogoMark(),
  ]);
  const accent = company.accentColor;
  const displayName = company.tradeName?.trim() || company.legalName;

  return (
    <PageShell wide>
      <PageHeader
        title="Galerie"
        description="Trois choix : l'allure de l'application, votre logo, et le modèle de vos factures. Le logo et le modèle s'appliquent d'un clic ; pour l'interface, dites-moi la proposition retenue et je l'implémente."
      />

      {/* ------------------------------------------------------------------ */}
      {/* Interfaces                                                          */}
      {/* ------------------------------------------------------------------ */}
      <section className="flex flex-col gap-4">
        <header>
          <h2 className="text-[17px] font-semibold tracking-tight text-ink">
            1. L&apos;interface de l&apos;application
          </h2>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-muted">
            Quatre directions, qui diffèrent par la <strong className="text-ink">disposition</strong>{" "}
            (menu latéral ou barre du haut, cartes ou tableaux denses) et par
            l&apos;<strong className="text-ink">ambiance</strong> (couleurs, densité, contraste). Ce
            sont des maquettes : rien n&apos;est cliquable, les chiffres sont fictifs.
          </p>
        </header>

        <div className="grid gap-5 xl:grid-cols-2">
          {INTERFACE_PROPOSALS.map((proposal) => (
            <article
              key={proposal.id}
              className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-sm)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
                <div className="min-w-0">
                  <h3 className="flex flex-wrap items-center gap-2 text-[15px] font-semibold tracking-tight text-ink">
                    {proposal.name}
                    {proposal.current && <Badge tone="accent">en place</Badge>}
                  </h3>
                  <p className="mt-0.5 text-[12px] font-medium text-accent">{proposal.tagline}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                    {proposal.description}
                  </p>
                </div>
              </div>

              {/* Fenêtre de navigateur factice */}
              <div className="bg-bg-subtle p-4">
                <div className="overflow-hidden rounded-[10px] border border-line shadow-[var(--shadow-md)]">
                  <div className="flex items-center gap-1.5 border-b border-line bg-surface-2 px-3 py-2">
                    <span className="h-2 w-2 rounded-full bg-line-strong" />
                    <span className="h-2 w-2 rounded-full bg-line-strong" />
                    <span className="h-2 w-2 rounded-full bg-line-strong" />
                    <span className="ml-2 truncate text-[10px] text-faint">
                      facturation · {proposal.id}
                    </span>
                  </div>
                  <InterfaceMockup skin={proposal.skin} />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 border-t border-line px-5 py-3">
                {proposal.traits.map((trait) => (
                  <span
                    key={trait}
                    className="rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[11px] text-muted"
                  >
                    {trait}
                  </span>
                ))}
                <span className="ml-auto text-[12px] text-faint">
                  Pour l&apos;adopter : dites-moi «&nbsp;{proposal.name.slice(0, 1)}&nbsp;»
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Logos                                                               */}
      {/* ------------------------------------------------------------------ */}
      <section className="mt-4 flex flex-col gap-4">
        <header>
          <h2 className="text-[17px] font-semibold tracking-tight text-ink">
            2. Votre logo
          </h2>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-muted">
            {LOGO_PROPOSALS.length} propositions pour{" "}
            <strong className="text-ink">{displayName}</strong>, rangées par famille et dessinées
            en vectoriel : elles restent nettes à toute taille, à l&apos;écran comme à
            l&apos;impression. Les unes reprennent votre couleur d&apos;accent, les autres
            proposent la leur — vous pouvez alors l&apos;adopter pour toute la facture. Celle
            que vous choisissez s&apos;applique aussitôt.
            {company.logoData && (
              <>
                {" "}
                <strong className="text-warning">
                  Vous avez déjà téléversé une image de logo : elle reste prioritaire tant que
                  vous ne la retirez pas depuis Mon entreprise.
                </strong>
              </>
            )}
          </p>
        </header>

        {LOGO_FAMILIES.map((family) => {
          const logos = LOGO_PROPOSALS.filter((logo) => logo.family === family);
          if (logos.length === 0) return null;

          return (
            <div key={family} className="flex flex-col gap-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">
                {family}
              </h3>

              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {logos.map((logo) => {
                  const active = currentMark === logo.id;
                  // Une marque qui porte sa propre couleur se montre avec.
                  const shown = logo.palette ?? accent;

                  return (
                    <article
                      key={logo.id}
                      className={`flex flex-col overflow-hidden rounded-[var(--radius-lg)] border bg-surface shadow-[var(--shadow-sm)] transition-colors ${
                        active ? "border-accent" : "border-line"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-6 bg-bg-subtle px-5 py-7">
                        {/* Grand format, puis en situation dans un en-tête. */}
                        <LogoMark id={logo.id} accent={shown} size={82} instance={`big-${logo.id}`} />
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 rounded-[var(--radius)] border border-line bg-surface px-3 py-2">
                            <LogoMark id={logo.id} accent={shown} size={26} instance={`sm-${logo.id}`} />
                            <span className="text-[12px] font-semibold text-ink">{displayName}</span>
                          </div>
                          <div
                            className="flex items-center gap-2 rounded-[var(--radius)] px-3 py-2"
                            style={{ background: shown }}
                          >
                            <span className="rounded bg-white/95 p-0.5">
                              <LogoMark id={logo.id} accent={shown} size={20} instance={`inv-${logo.id}`} />
                            </span>
                            <span className="text-[12px] font-semibold text-white">
                              {displayName}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col gap-2 border-t border-line px-5 py-4">
                        <h3 className="flex flex-wrap items-center gap-2 text-[15px] font-semibold tracking-tight text-ink">
                          {logo.name}
                          {active && <Badge tone="accent">en place</Badge>}
                          {logo.palette && (
                            <span
                              className="h-3.5 w-3.5 rounded-full border border-line"
                              style={{ background: logo.palette }}
                              title={`Couleur proposée : ${logo.palette}`}
                            />
                          )}
                        </h3>
                        <p className="text-[13px] leading-relaxed text-muted">{logo.description}</p>
                        <p className="text-[12px] text-faint">{logo.suits}</p>
                      </div>

                      <form
                        action={chooseLogoMark}
                        className="flex flex-col gap-2 border-t border-line px-5 py-3"
                      >
                        <input type="hidden" name="mark" value={logo.id} />
                        {logo.palette && (
                          <>
                            <input type="hidden" name="palette" value={logo.palette} />
                            <Checkbox
                              name="applyColor"
                              label="Adopter aussi sa couleur"
                              hint="Elle deviendra la couleur d'accent de tous vos documents."
                            />
                          </>
                        )}
                        <SubmitButton
                          size="sm"
                          variant={active ? "secondary" : "primary"}
                          pendingLabel="Application…"
                        >
                          {active ? "Réappliquer" : "Choisir ce logo"}
                        </SubmitButton>
                      </form>
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })}

        {currentMark && (
          <form action={chooseLogoMark}>
            <input type="hidden" name="mark" value="" />
            <SubmitButton variant="ghost" size="sm" pendingLabel="Retrait…">
              N&apos;utiliser aucun logo
            </SubmitButton>
          </form>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Modèles de facture                                                  */}
      {/* ------------------------------------------------------------------ */}
      <section className="mt-4 flex flex-col gap-4">
        <header>
          <h2 className="text-[17px] font-semibold tracking-tight text-ink">
            3. Le modèle de vos factures
          </h2>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-muted">
            Les cinq modèles, rendus avec <strong className="text-ink">votre identité réelle</strong>{" "}
            sur une facture d&apos;exemple qui n&apos;est jamais enregistrée. Celui que vous retenez
            se règle dans <em>Mon entreprise → Modèles &amp; mentions</em>, et reste modifiable
            document par document.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {TEMPLATES.map((template) => (
            <article
              key={template.id}
              className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-sm)]"
            >
              <div className="border-b border-line px-5 py-4">
                <h3 className="text-[15px] font-semibold tracking-tight text-ink">
                  {template.name}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                  {template.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {template.traits.map((trait) => (
                    <span
                      key={trait}
                      className="rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[11px] text-muted"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-center bg-bg-subtle p-4">
                <PreviewFrame scale={0.42}>
                  <HtmlDocumentPreview vm={vm} template={template.id} />
                </PreviewFrame>
              </div>

              <div className="flex items-center gap-2 border-t border-line px-5 py-3">
                <a
                  href={`/api/galerie/pdf?modele=${template.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClass("secondary", "sm")}
                >
                  <IconEye className="h-4 w-4" />
                  Le PDF en grand
                </a>
                <a
                  href={`/api/galerie/pdf?modele=${template.id}&dl=1`}
                  className={buttonClass("ghost", "sm")}
                >
                  <IconDownload className="h-4 w-4" />
                  Télécharger
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
