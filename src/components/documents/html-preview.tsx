import type { CSSProperties } from "react";
import type { PdfViewModel, PdfParty } from "@/pdf/view-model";
import { LogoMark } from "@/components/galerie/logo-mark";

/**
 * Logo de l'en-tête : l'image téléversée, sinon la marque vectorielle choisie
 * dans la galerie. Même règle que sur le PDF.
 */
function HeaderLogo({
  vm,
  size,
  style,
}: {
  vm: PdfViewModel;
  size: number;
  style?: CSSProperties;
}) {
  if (vm.company.logoData) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={vm.company.logoData}
        alt=""
        style={{ width: size, height: size, objectFit: "contain", ...style }}
      />
    );
  }
  if (vm.company.logoMark) {
    return (
      <div style={style}>
        <LogoMark id={vm.company.logoMark} accent={vm.accent} size={size} />
      </div>
    );
  }
  return null;
}

/**
 * Rendu du document à l'écran, en HTML.
 *
 * Il s'appuie sur le même modèle de vue que le PDF : mêmes mentions, mêmes
 * montants, même ordre. La mise en page reprend fidèlement chaque gabarit sans
 * dépendre du lecteur PDF du navigateur, qui refuse parfois d'afficher quoi que
 * ce soit. Le PDF téléchargé reste la référence pour l'impression.
 */

type Skin = {
  /** Disposition de l'en-tête. */
  header: "band" | "sidebar" | "plain" | "centered" | "compact";
  fontFamily: string;
  fontSize: number;
  padding: string;
  /** Densité verticale, en facteur appliqué aux marges. */
  density: number;
  table: "boxed" | "ruled" | "hairline";
  uppercaseTitles: boolean;
  letterSpacing: string;
  totalStyle: "filled" | "outlined" | "underlined";
};

const SERIF = 'Georgia, "Times New Roman", Times, serif';
const SANS = 'ui-sans-serif, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const SKINS: Record<string, Skin> = {
  classique: {
    header: "band",
    fontFamily: SANS,
    fontSize: 12,
    padding: "0",
    density: 1,
    table: "boxed",
    uppercaseTitles: true,
    letterSpacing: "0.04em",
    totalStyle: "filled",
  },
  moderne: {
    header: "sidebar",
    fontFamily: SANS,
    fontSize: 12,
    padding: "0",
    density: 1.1,
    table: "ruled",
    uppercaseTitles: true,
    letterSpacing: "0.06em",
    totalStyle: "underlined",
  },
  minimal: {
    header: "plain",
    fontFamily: SANS,
    fontSize: 12,
    padding: "56px 58px",
    density: 1.15,
    table: "hairline",
    uppercaseTitles: true,
    letterSpacing: "0.1em",
    totalStyle: "underlined",
  },
  elegant: {
    header: "centered",
    fontFamily: SERIF,
    fontSize: 12,
    padding: "44px 56px",
    density: 1,
    table: "ruled",
    uppercaseTitles: true,
    letterSpacing: "0.22em",
    totalStyle: "filled",
  },
  compact: {
    header: "compact",
    fontFamily: SANS,
    fontSize: 10.5,
    padding: "26px 32px",
    density: 0.7,
    table: "boxed",
    uppercaseTitles: true,
    letterSpacing: "0.03em",
    totalStyle: "filled",
  },
};

const INK = "#1a1815";
const MUTED = "#6b655c";
const RULE = "#e3e0d9";

function space(skin: Skin, base: number): number {
  return Math.round(base * skin.density);
}

// ---------------------------------------------------------------------------
// Blocs partagés
// ---------------------------------------------------------------------------

function Label({ children, skin, color }: { children: React.ReactNode; skin: Skin; color?: string }) {
  return (
    <p
      style={{
        fontSize: 8.5,
        fontWeight: 700,
        letterSpacing: skin.letterSpacing,
        color: color ?? MUTED,
        margin: `0 0 ${space(skin, 6)}px`,
        textTransform: skin.uppercaseTitles ? "uppercase" : "none",
      }}
    >
      {children}
    </p>
  );
}

function PartyBlock({
  party,
  title,
  skin,
  accent,
  endClientName,
}: {
  party: PdfParty;
  title: string;
  skin: Skin;
  accent: string;
  endClientName?: string | null;
}) {
  return (
    <div>
      <Label skin={skin} color={accent}>
        {title}
      </Label>
      <p style={{ margin: 0, fontWeight: 700, lineHeight: 1.4 }}>{party.displayName}</p>
      {party.legalLine && (
        <p style={{ margin: 0, lineHeight: 1.4 }}>{party.legalLine}</p>
      )}
      {party.addressLines.map((line, index) => (
        <p key={index} style={{ margin: 0, lineHeight: 1.4 }}>
          {line}
        </p>
      ))}
      {party.email && <p style={{ margin: 0, lineHeight: 1.4 }}>{party.email}</p>}
      {party.identifiers.map((identifier) => (
        <p key={identifier.label} style={{ margin: 0, lineHeight: 1.4, color: MUTED }}>
          {identifier.label} : {identifier.value}
        </p>
      ))}
      {endClientName && (
        <p style={{ margin: `${space(skin, 6)}px 0 0`, color: MUTED, lineHeight: 1.4 }}>
          Pour le compte de <strong style={{ color: INK }}>{endClientName}</strong>
        </p>
      )}
    </div>
  );
}

function LinesTable({ vm, skin, accent }: { vm: PdfViewModel; skin: Skin; accent: string }) {
  const boxed = skin.table === "boxed";
  const cell: CSSProperties = {
    padding: `${space(skin, 7)}px ${boxed ? 8 : 0}px`,
    verticalAlign: "top",
    borderBottom: skin.table === "hairline" ? `0.5px solid ${RULE}` : `1px solid ${RULE}`,
  };
  const num: CSSProperties = { ...cell, textAlign: "right", whiteSpace: "nowrap" };

  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        marginTop: space(skin, 16),
        border: boxed ? `1px solid ${RULE}` : "none",
      }}
    >
      <thead>
        <tr
          style={{
            background: boxed ? accent : "transparent",
            color: boxed ? "#fff" : accent,
            borderTop: boxed ? "none" : `1.5px solid ${accent}`,
            borderBottom: boxed ? "none" : `1.5px solid ${accent}`,
          }}
        >
          {["Désignation", "Qté", "Unité", "P.U.", ...(vm.showVatColumn ? ["TVA"] : []), "Montant"].map(
            (head, index) => (
              <th
                key={head}
                style={{
                  padding: `${space(skin, 6)}px ${boxed ? 8 : 0}px`,
                  fontSize: 8.5,
                  fontWeight: 700,
                  letterSpacing: skin.letterSpacing,
                  textTransform: "uppercase",
                  textAlign: index === 0 || index === 2 ? "left" : "right",
                  whiteSpace: "nowrap",
                }}
              >
                {head}
              </th>
            ),
          )}
        </tr>
      </thead>
      <tbody>
        {vm.lines.map((line, index) => {
          if (line.kind === "SECTION") {
            return (
              <tr key={index}>
                <td
                  colSpan={vm.showVatColumn ? 6 : 5}
                  style={{
                    ...cell,
                    background: boxed ? "#f4f2ee" : "transparent",
                    fontWeight: 700,
                    color: accent,
                    letterSpacing: skin.header === "centered" ? "0.08em" : undefined,
                  }}
                >
                  {line.label}
                </td>
              </tr>
            );
          }
          if (line.kind === "TEXT") {
            return (
              <tr key={index}>
                <td colSpan={vm.showVatColumn ? 6 : 5} style={{ ...cell, color: MUTED }}>
                  {line.label}
                </td>
              </tr>
            );
          }
          return (
            <tr key={index}>
              <td style={cell}>
                <span style={{ fontWeight: 500 }}>{line.label}</span>
                {line.description && (
                  <span style={{ display: "block", fontSize: 10, color: MUTED, marginTop: 2 }}>
                    {line.description}
                  </span>
                )}
                {line.discount && (
                  <span style={{ display: "block", fontSize: 10, color: MUTED, marginTop: 2 }}>
                    Remise appliquée : {line.discount}
                  </span>
                )}
              </td>
              <td style={num}>{line.quantity}</td>
              <td style={{ ...cell, color: MUTED, whiteSpace: "nowrap" }}>{line.unit}</td>
              <td style={num}>{line.unitPrice}</td>
              {vm.showVatColumn && <td style={num}>{line.vatRate}</td>}
              <td style={{ ...num, fontWeight: 700 }}>{line.total}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Totals({ vm, skin, accent }: { vm: PdfViewModel; skin: Skin; accent: string }) {
  const filled = skin.totalStyle === "filled";
  return (
    <div style={{ width: 280, marginLeft: "auto" }}>
      {vm.totals.map((row, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            padding: `${space(skin, 4)}px 0`,
            borderTop: row.emphasis ? `1px solid ${RULE}` : "none",
            fontWeight: row.emphasis ? 700 : 400,
            color: row.emphasis ? INK : MUTED,
          }}
        >
          <span>{row.label}</span>
          <span style={{ color: INK, whiteSpace: "nowrap" }}>{row.value}</span>
        </div>
      ))}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginTop: space(skin, 8),
          padding: filled ? `${space(skin, 10)}px 12px` : `${space(skin, 10)}px 0 0`,
          background: filled ? accent : "transparent",
          color: filled ? "#fff" : accent,
          borderTop: filled ? "none" : `2px solid ${accent}`,
        }}
      >
        <span style={{ fontWeight: 700, letterSpacing: skin.letterSpacing, textTransform: "uppercase", fontSize: 10 }}>
          {vm.grandTotalLabel}
        </span>
        <span style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap" }}>
          {vm.grandTotalValue}
        </span>
      </div>

      {vm.paidSummary?.map((row) => (
        <div
          key={row.label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            padding: `${space(skin, 4)}px 0`,
            color: MUTED,
          }}
        >
          <span>{row.label}</span>
          <strong style={{ color: INK }}>{row.value}</strong>
        </div>
      ))}
    </div>
  );
}

function BankBlock({ vm, skin, accent }: { vm: PdfViewModel; skin: Skin; accent: string }) {
  if (!vm.bank) return null;
  const boxed = skin.table === "boxed";
  return (
    <div
      style={{
        marginTop: space(skin, 14),
        // Uniquement des propriétés détaillées : mêler `border` et `borderTop`
        // dans un même style rend l'ordre d'application indéterminé au rendu.
        // Le filet du haut est toujours présent ; les trois autres côtés ne le
        // sont que dans les gabarits à cadre.
        borderTop: `1px solid ${RULE}`,
        borderRight: boxed ? `1px solid ${RULE}` : "none",
        borderBottom: boxed ? `1px solid ${RULE}` : "none",
        borderLeft: boxed ? `1px solid ${RULE}` : "none",
        padding: boxed ? 10 : "10px 0 0",
      }}
    >
      <Label skin={skin} color={accent}>
        Coordonnées de paiement — {vm.bank.kindLabel}
      </Label>
      {vm.bank.rows.map((row) => (
        <div key={row.label} style={{ display: "flex", gap: 8, lineHeight: 1.5 }}>
          <span style={{ width: 120, color: MUTED, flexShrink: 0 }}>{row.label}</span>
          <strong>{row.value}</strong>
        </div>
      ))}
    </div>
  );
}

function Signature({ vm, skin }: { vm: PdfViewModel; skin: Skin }) {
  if (!vm.company.signatureData && !vm.company.stampData && !vm.company.signatureName) return null;
  return (
    <div
      style={{
        marginTop: space(skin, 22),
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "flex-end",
        gap: 14,
      }}
    >
      {vm.company.stampData && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={vm.company.stampData} alt="" style={{ width: 84, height: 84, objectFit: "contain" }} />
      )}
      <div style={{ textAlign: "center" }}>
        {vm.company.signatureData && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vm.company.signatureData}
            alt=""
            style={{ width: 120, height: 46, objectFit: "contain", display: "block" }}
          />
        )}
        {vm.company.signatureName && <strong>{vm.company.signatureName}</strong>}
        {vm.company.signatureRole && (
          <p style={{ margin: 0, color: MUTED, fontSize: 10.5 }}>{vm.company.signatureRole}</p>
        )}
      </div>
    </div>
  );
}

function CompanyLines({ vm, muted = MUTED }: { vm: PdfViewModel; muted?: string }) {
  return (
    <>
      {vm.company.addressLines.map((line, index) => (
        <p key={index} style={{ margin: 0, lineHeight: 1.45, color: muted }}>
          {line}
        </p>
      ))}
      {vm.company.phone && <p style={{ margin: 0, lineHeight: 1.45, color: muted }}>Tél. : {vm.company.phone}</p>}
      {vm.company.mobile && <p style={{ margin: 0, lineHeight: 1.45, color: muted }}>Mobile : {vm.company.mobile}</p>}
      {vm.company.email && <p style={{ margin: 0, lineHeight: 1.45, color: muted }}>{vm.company.email}</p>}
      {vm.company.website && <p style={{ margin: 0, lineHeight: 1.45, color: muted }}>{vm.company.website}</p>}
    </>
  );
}

// ---------------------------------------------------------------------------
// Feuille
// ---------------------------------------------------------------------------

export function HtmlDocumentPreview({
  vm,
  template,
}: {
  vm: PdfViewModel;
  template: string;
}) {
  const skin = SKINS[template] ?? SKINS.classique;
  const accent = vm.accent;

  const sheet: CSSProperties = {
    position: "relative",
    width: 794, // A4 à 96 ppp
    minHeight: 1123,
    margin: "0 auto",
    background: "#fff",
    color: INK,
    fontFamily: skin.fontFamily,
    fontSize: skin.fontSize,
    lineHeight: 1.45,
    boxShadow: "0 2px 18px rgba(26,24,21,0.12)",
    display: "flex",
    flexDirection: skin.header === "sidebar" ? "row" : "column",
    overflow: "hidden",
  };

  const body: CSSProperties = {
    flex: 1,
    padding: skin.header === "band" ? "24px 40px 40px" : skin.header === "sidebar" ? "36px 32px" : skin.padding,
    display: "flex",
    flexDirection: "column",
  };

  return (
    <div style={sheet}>
      {vm.isDraft && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 340,
            left: 90,
            fontSize: 88,
            fontWeight: 800,
            color: INK,
            opacity: 0.06,
            transform: "rotate(-24deg)",
            letterSpacing: "0.06em",
            pointerEvents: "none",
          }}
        >
          BROUILLON
        </span>
      )}

      {/* --- En-tête, selon le gabarit ------------------------------------ */}
      {skin.header === "band" && (
        <header
          style={{
            background: accent,
            color: "#fff",
            padding: "18px 40px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <HeaderLogo vm={vm} size={52} />
          <div>
            <p style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>
              {vm.company.tradeName || vm.company.name}
            </p>
            {(vm.company.tagline) && (
              <p style={{ margin: 0, opacity: 0.85, fontSize: 11 }}>
                {vm.company.tagline}
              </p>
            )}
          </div>
        </header>
      )}

      {skin.header === "sidebar" && (
        <aside style={{ width: 210, background: accent, color: "#fff", padding: "34px 22px" }}>
          <HeaderLogo vm={vm} size={62} style={{ marginBottom: 14 }} />
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, lineHeight: 1.25 }}>
            {vm.company.tradeName || vm.company.name}
          </p>
          {(vm.company.tagline) && (
            <p style={{ margin: "4px 0 0", fontSize: 10.5, opacity: 0.8 }}>
              {vm.company.tagline}
            </p>
          )}

          <p style={{ margin: "22px 0 6px", fontSize: 8.5, letterSpacing: "0.1em", opacity: 0.7, fontWeight: 700 }}>
            COORDONNÉES
          </p>
          <div style={{ fontSize: 10.5 }}>
            <CompanyLines vm={vm} muted="rgba(255,255,255,0.92)" />
          </div>

          {vm.company.identifiers.length > 0 && (
            <>
              <p style={{ margin: "18px 0 6px", fontSize: 8.5, letterSpacing: "0.1em", opacity: 0.7, fontWeight: 700 }}>
                IDENTIFIANTS
              </p>
              {vm.company.identifiers.map((identifier) => (
                <p key={identifier.label} style={{ margin: 0, fontSize: 10.5, lineHeight: 1.5 }}>
                  <strong>{identifier.label}</strong> {identifier.value}
                </p>
              ))}
            </>
          )}
        </aside>
      )}

      <div style={body}>
        {skin.header === "centered" && (
          <div style={{ textAlign: "center", borderBottom: `1px solid ${RULE}`, paddingBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <HeaderLogo vm={vm} size={56} style={{ marginBottom: 8 }} />
            </div>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: "0.12em" }}>
              {(vm.company.tradeName || vm.company.name).toUpperCase()}
            </p>
            {(vm.company.tagline) && (
              <p style={{ margin: "3px 0 0", fontSize: 10.5, color: MUTED, letterSpacing: "0.1em" }}>
                {vm.company.tagline}
              </p>
            )}
            <p style={{ margin: "8px 0 0", fontSize: 10, color: MUTED }}>
              {[vm.company.addressLines.join(" · "), vm.company.phone, vm.company.email]
                .filter(Boolean)
                .join("  ·  ")}
            </p>
            {vm.company.identifiers.length > 0 && (
              <p style={{ margin: "3px 0 0", fontSize: 10, color: MUTED }}>
                {vm.company.identifiers.map((i) => `${i.label} ${i.value}`).join("  ·  ")}
              </p>
            )}
          </div>
        )}

        {(skin.header === "plain" || skin.header === "compact") && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
            <div style={{ maxWidth: 320 }}>
              <HeaderLogo vm={vm} size={44} style={{ marginBottom: 6 }} />
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>
                {vm.company.tradeName || vm.company.name}
              </p>
              <div style={{ fontSize: 10.5 }}>
                <CompanyLines vm={vm} />
              </div>
              {vm.company.identifiers.length > 0 && (
                <p style={{ margin: "5px 0 0", fontSize: 10, color: MUTED }}>
                  {vm.company.identifiers.map((i) => `${i.label} ${i.value}`).join(" · ")}
                </p>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: skin.letterSpacing,
                  color: skin.header === "compact" ? accent : INK,
                }}
              >
                {vm.title}
              </p>
              <p style={{ margin: "2px 0 0", color: MUTED }}>{vm.number}</p>
            </div>
          </div>
        )}

        {/* --- Titre et dates ---------------------------------------------- */}
        {(skin.header === "band" || skin.header === "sidebar") && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 24,
              marginTop: space(skin, 20),
            }}
          >
            {skin.header === "band" ? (
              <div style={{ flex: 1 }}>
                <Label skin={skin}>Émetteur</Label>
                <p style={{ margin: 0, fontWeight: 700 }}>
                  {vm.company.name}
                  {vm.company.legalForm ? ` — ${vm.company.legalForm}` : ""}
                </p>
                <CompanyLines vm={vm} />
                {vm.company.identifiers.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    {vm.company.identifiers.map((identifier) => (
                      <p key={identifier.label} style={{ margin: 0, color: MUTED, lineHeight: 1.4 }}>
                        <strong style={{ color: INK }}>{identifier.label}</strong> : {identifier.value}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 30, fontWeight: 800, color: accent, letterSpacing: "-0.01em" }}>
                  {vm.title}
                </p>
                <p style={{ margin: "2px 0 0", color: MUTED }}>N° {vm.number}</p>
              </div>
            )}

            <div
              style={
                skin.header === "band"
                  ? { border: `1px solid ${accent}`, padding: 12, minWidth: 230 }
                  : { minWidth: 200 }
              }
            >
              {skin.header === "band" && (
                <>
                  <p style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "0.06em", color: accent }}>
                    {vm.title}
                  </p>
                  <p style={{ margin: "2px 0 8px", fontWeight: 700, fontSize: 13 }}>N° {vm.number}</p>
                </>
              )}
              {vm.dates.map((date) => (
                <div key={date.label} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ color: MUTED }}>{date.label}</span>
                  <strong>{date.value}</strong>
                </div>
              ))}
              {vm.purchaseOrder && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ color: MUTED }}>Bon de commande</span>
                  <strong>{vm.purchaseOrder}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- Destinataire -------------------------------------------------- */}
        <div
          style={{
            marginTop: space(skin, 18),
            display: skin.header === "band" ? "block" : "flex",
            justifyContent: "space-between",
            gap: 30,
          }}
        >
          <div
            style={
              skin.header === "band"
                ? {
                    border: `1px solid ${RULE}`,
                    padding: 12,
                    maxWidth: 320,
                    marginLeft: "auto",
                  }
                : { flex: 1 }
            }
          >
            <PartyBlock
              party={vm.billTo}
              title={vm.endClient ? "Facturé à (agence)" : "Facturé à"}
              skin={skin}
              accent={accent}
              endClientName={vm.endClient?.name ?? null}
            />
          </div>

          {(skin.header === "plain" || skin.header === "centered" || skin.header === "compact") && (
            <div style={{ minWidth: 210 }}>
              {vm.dates.map((date) => (
                <div key={date.label} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ color: MUTED }}>{date.label}</span>
                  <strong>{date.value}</strong>
                </div>
              ))}
              {vm.purchaseOrder && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ color: MUTED }}>Bon de commande</span>
                  <strong>{vm.purchaseOrder}</strong>
                </div>
              )}
            </div>
          )}
        </div>

        {vm.subject && (
          <p
            style={{
              margin: `${space(skin, 16)}px 0 0`,
              fontWeight: 700,
              textAlign: skin.header === "centered" ? "center" : "left",
              fontStyle: skin.header === "centered" ? "italic" : "normal",
            }}
          >
            {skin.header === "centered" ? vm.subject : `Objet : ${vm.subject}`}
          </p>
        )}

        <LinesTable vm={vm} skin={skin} accent={accent} />

        <div style={{ marginTop: space(skin, 16) }}>
          <Totals vm={vm} skin={skin} accent={accent} />
        </div>

        {vm.amountInWords && (
          <p
            style={{
              marginTop: space(skin, 14),
              padding: skin.table === "boxed" ? "8px 10px" : 0,
              background: skin.table === "boxed" ? "#f4f2ee" : "transparent",
              borderLeft: skin.table === "boxed" ? `3px solid ${accent}` : "none",
              fontStyle: skin.header === "centered" ? "italic" : "normal",
              textAlign: skin.header === "centered" ? "center" : "left",
            }}
          >
            <strong>Arrêtée la présente {vm.title.toLowerCase()} à la somme de : </strong>
            {vm.amountInWords}.
          </p>
        )}

        <BankBlock vm={vm} skin={skin} accent={accent} />

        {(vm.notes || vm.terms) && (
          <div style={{ marginTop: space(skin, 12), lineHeight: 1.5 }}>
            {vm.notes && <p style={{ margin: 0, whiteSpace: "pre-line" }}>{vm.notes}</p>}
            {vm.terms && (
              <p style={{ margin: vm.notes ? "6px 0 0" : 0, whiteSpace: "pre-line" }}>{vm.terms}</p>
            )}
          </div>
        )}

        {vm.legalNotes.length > 0 && (
          <div style={{ marginTop: space(skin, 10), fontSize: 10, color: MUTED, lineHeight: 1.5 }}>
            {vm.legalNotes.map((note, index) => (
              <p key={index} style={{ margin: 0 }}>
                {note}
              </p>
            ))}
          </div>
        )}

        <Signature vm={vm} skin={skin} />

        <div
          style={{
            marginTop: "auto",
            paddingTop: space(skin, 14),
            borderTop: `1px solid ${RULE}`,
            fontSize: 10,
            color: MUTED,
            textAlign: skin.header === "centered" ? "center" : "left",
          }}
        >
          {vm.footer || vm.company.name}
        </div>
      </div>
    </div>
  );
}

/** Conteneur qui met la feuille A4 à l'échelle du bloc qui l'accueille. */
export function PreviewFrame({
  children,
  scale = 1,
}: {
  children: React.ReactNode;
  scale?: number;
}) {
  return (
    <div
      style={{
        width: 794 * scale,
        height: 1123 * scale,
        overflow: "hidden",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: 794,
        }}
      >
        {children}
      </div>
    </div>
  );
}
