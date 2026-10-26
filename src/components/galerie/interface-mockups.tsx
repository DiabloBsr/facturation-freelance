import type { CSSProperties } from "react";

/**
 * Maquettes d'interface pour la galerie.
 *
 * Ce sont des reproductions statiques, sans données réelles : elles servent à
 * choisir une direction (disposition et ambiance) avant que je ne l'applique
 * pour de bon à l'application.
 */

export type InterfaceProposal = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  traits: string[];
  /** Vrai pour la proposition actuellement en place. */
  current?: boolean;
  skin: Skin;
};

type Skin = {
  nav: "side" | "top";
  bg: string;
  surface: string;
  border: string;
  ink: string;
  muted: string;
  accent: string;
  accentSoft: string;
  accentInk: string;
  radius: number;
  density: "cosy" | "dense";
  /** Les indicateurs sont des cartes, ou une simple bande chiffrée. */
  stats: "cards" | "strip";
  shadow: string;
  font: string;
};

const SANS = 'ui-sans-serif, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const INTERFACE_PROPOSALS: InterfaceProposal[] = [
  {
    id: "actuelle",
    name: "A — Sobre, menu latéral",
    tagline: "L'interface actuelle",
    description:
      "Menu latéral permanent, fond papier chaud, encre navy. Rythme aéré, ombres discrètes. Lisible longtemps sans fatigue.",
    traits: ["Menu latéral", "Clair chaud", "Aéré"],
    current: true,
    skin: {
      nav: "side",
      bg: "#f7f6f3",
      surface: "#ffffff",
      border: "#e3e0d9",
      ink: "#1a1815",
      muted: "#6b655c",
      accent: "#1f4d7a",
      accentSoft: "#e8eff6",
      accentInk: "#ffffff",
      radius: 10,
      density: "cosy",
      stats: "cards",
      shadow: "0 1px 3px rgba(26,24,21,0.07)",
      font: SANS,
    },
  },
  {
    id: "horizontale",
    name: "B — Menu en haut, très aéré",
    tagline: "Plus d'espace pour le contenu",
    description:
      "Barre de navigation horizontale : toute la largeur revient au tableau. Beaucoup de blanc, gros titres, accent vert profond.",
    traits: ["Menu en haut", "Pleine largeur", "Très aéré"],
    skin: {
      nav: "top",
      bg: "#ffffff",
      surface: "#ffffff",
      border: "#e8e8e6",
      ink: "#14161a",
      muted: "#71767f",
      accent: "#146c50",
      accentSoft: "#e6f2ed",
      accentInk: "#ffffff",
      radius: 12,
      density: "cosy",
      stats: "strip",
      shadow: "none",
      font: SANS,
    },
  },
  {
    id: "dense",
    name: "C — Dense, orientée tableaux",
    tagline: "Voir un maximum de lignes",
    description:
      "Lignes serrées, colonnes compactes, chiffres alignés. Pensée pour traiter beaucoup de factures d'un coup plutôt que pour contempler.",
    traits: ["Dense", "Beaucoup de lignes", "Neutre"],
    skin: {
      nav: "side",
      bg: "#f4f5f7",
      surface: "#ffffff",
      border: "#dfe2e7",
      ink: "#1b1f27",
      muted: "#6a7180",
      accent: "#2b4b8f",
      accentSoft: "#e9eef8",
      accentInk: "#ffffff",
      radius: 6,
      density: "dense",
      stats: "strip",
      shadow: "0 1px 2px rgba(20,24,33,0.06)",
      font: SANS,
    },
  },
  {
    id: "sombre",
    name: "D — Sombre, en cartes",
    tagline: "Confort du soir",
    description:
      "Fond sombre, cartes contrastées, accent ambré. Les montants ressortent nettement ; agréable en travail nocturne.",
    traits: ["Sombre", "Cartes", "Accent ambré"],
    skin: {
      nav: "side",
      bg: "#111316",
      surface: "#1a1d21",
      border: "#2a2e34",
      ink: "#ecebe8",
      muted: "#9aa0a8",
      accent: "#d9a441",
      accentSoft: "#2a2317",
      accentInk: "#14161a",
      radius: 12,
      density: "cosy",
      stats: "cards",
      shadow: "0 2px 10px rgba(0,0,0,0.4)",
      font: SANS,
    },
  },
];

const NAV_ITEMS = ["Tableau de bord", "Devis", "Factures", "Clients", "Missions", "Temps"];

const ROWS = [
  { number: "FAC-2026-0042", client: "Exemple Conseil SA", status: "Payé", tone: "success", total: "1 480,00 €" },
  { number: "FAC-2026-0041", client: "Sahaza Distribution", status: "En retard", tone: "danger", total: "4 500 000 Ar" },
  { number: "FAC-2026-0040", client: "Numeria Solutions", status: "Envoyé", tone: "info", total: "2 300,00 €" },
  { number: "DEV-2026-0018", client: "Toliara Services", status: "Brouillon", tone: "neutral", total: "860 000 Ar" },
];

function tone(skin: Skin, key: string): { bg: string; fg: string } {
  const dark = skin.bg.startsWith("#1") || skin.bg.startsWith("#0");
  const map: Record<string, [string, string]> = {
    success: dark ? ["#16301f", "#6fc79b"] : ["#e4f2ea", "#1f6b4b"],
    danger: dark ? ["#301818", "#e07b7b"] : ["#fbe9e9", "#9b2c2c"],
    info: dark ? ["#1b2530", "#7bb0e0"] : ["#e8eff6", "#1f4d7a"],
    neutral: dark ? ["#232629", "#9aa0a8"] : ["#efede8", "#565049"],
  };
  const [bg, fg] = map[key] ?? map.neutral;
  return { bg, fg };
}

export function InterfaceMockup({ skin }: { skin: Skin }) {
  const pad = skin.density === "dense" ? 8 : 13;
  const rowPad = skin.density === "dense" ? 6 : 11;

  const frame: CSSProperties = {
    background: skin.bg,
    color: skin.ink,
    fontFamily: skin.font,
    fontSize: 11,
    display: "flex",
    flexDirection: skin.nav === "side" ? "row" : "column",
    height: 430,
    overflow: "hidden",
  };

  const navLink = (label: string, active: boolean): CSSProperties => ({
    padding: skin.nav === "side" ? `${rowPad - 3}px 10px` : "7px 11px",
    borderRadius: skin.radius - 2,
    background: active ? skin.accentSoft : "transparent",
    color: active ? skin.accent : skin.muted,
    fontWeight: active ? 600 : 500,
    whiteSpace: "nowrap",
  });

  const card: CSSProperties = {
    background: skin.surface,
    border: `1px solid ${skin.border}`,
    borderRadius: skin.radius,
    boxShadow: skin.shadow,
    padding: pad,
  };

  return (
    <div style={frame}>
      {/* Navigation */}
      {skin.nav === "side" ? (
        <aside
          style={{
            width: 150,
            flexShrink: 0,
            background: skin.surface,
            borderRight: `1px solid ${skin.border}`,
            padding: 10,
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 6px 12px" }}>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: skin.accent,
                display: "inline-block",
              }}
            />
            <span style={{ fontWeight: 700, fontSize: 11.5 }}>Facturation</span>
          </div>
          {NAV_ITEMS.map((item, index) => (
            <span key={item} style={navLink(item, index === 2)}>
              {item}
            </span>
          ))}
        </aside>
      ) : (
        <header
          style={{
            borderBottom: `1px solid ${skin.border}`,
            background: skin.surface,
            padding: "10px 18px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span
              style={{ width: 20, height: 20, borderRadius: 6, background: skin.accent, display: "inline-block" }}
            />
            <strong style={{ fontSize: 11.5 }}>Facturation</strong>
          </span>
          <nav style={{ display: "flex", gap: 3 }}>
            {NAV_ITEMS.map((item, index) => (
              <span key={item} style={navLink(item, index === 2)}>
                {item}
              </span>
            ))}
          </nav>
          <span
            style={{
              marginLeft: "auto",
              background: skin.accent,
              color: skin.accentInk,
              borderRadius: skin.radius - 2,
              padding: "6px 11px",
              fontWeight: 600,
            }}
          >
            Nouvelle facture
          </span>
        </header>
      )}

      {/* Contenu */}
      <main style={{ flex: 1, padding: skin.nav === "top" ? "18px 22px" : 16, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: skin.density === "dense" ? 15 : 19, fontWeight: 700 }}>
              Factures
            </h3>
            <p style={{ margin: "3px 0 0", color: skin.muted, fontSize: 10.5 }}>
              12 documents · 3 en retard
            </p>
          </div>
          {skin.nav === "side" && (
            <span
              style={{
                background: skin.accent,
                color: skin.accentInk,
                borderRadius: skin.radius - 2,
                padding: "6px 11px",
                fontWeight: 600,
              }}
            >
              Nouvelle facture
            </span>
          )}
        </div>

        {/* Indicateurs */}
        {skin.stats === "cards" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 9, marginTop: 14 }}>
            {[
              ["Facturé", "9 135 000 Ar"],
              ["Encaissé", "3 000 000 Ar"],
              ["En retard", "1 480,00 €"],
            ].map(([label, value], index) => (
              <div key={label} style={card}>
                <p style={{ margin: 0, fontSize: 9, color: skin.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {label}
                </p>
                <p
                  style={{
                    margin: "5px 0 0",
                    fontSize: 15,
                    fontWeight: 700,
                    color: index === 2 ? tone(skin, "danger").fg : skin.ink,
                  }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              gap: 26,
              marginTop: 14,
              paddingBottom: 12,
              borderBottom: `1px solid ${skin.border}`,
            }}
          >
            {[
              ["Facturé", "9 135 000 Ar"],
              ["Encaissé", "3 000 000 Ar"],
              ["En retard", "1 480,00 €"],
            ].map(([label, value], index) => (
              <div key={label}>
                <p style={{ margin: 0, fontSize: 9, color: skin.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {label}
                </p>
                <p
                  style={{
                    margin: "3px 0 0",
                    fontSize: 15,
                    fontWeight: 700,
                    color: index === 2 ? tone(skin, "danger").fg : skin.ink,
                  }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Tableau */}
        <div
          style={{
            marginTop: 14,
            background: skin.surface,
            border: `1px solid ${skin.border}`,
            borderRadius: skin.radius,
            boxShadow: skin.shadow,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 1.4fr 0.9fr 1fr",
              padding: `${rowPad - 3}px ${pad}px`,
              background: skin.nav === "top" ? "transparent" : skin.bg,
              borderBottom: `1px solid ${skin.border}`,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: skin.muted,
            }}
          >
            <span>Numéro</span>
            <span>Client</span>
            <span>Statut</span>
            <span style={{ textAlign: "right" }}>Total</span>
          </div>

          {ROWS.map((row, index) => {
            const badge = tone(skin, row.tone);
            return (
              <div
                key={row.number}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.1fr 1.4fr 0.9fr 1fr",
                  alignItems: "center",
                  padding: `${rowPad}px ${pad}px`,
                  borderBottom: index === ROWS.length - 1 ? "none" : `1px solid ${skin.border}`,
                }}
              >
                <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{row.number}</span>
                <span style={{ color: skin.muted }}>{row.client}</span>
                <span>
                  <span
                    style={{
                      background: badge.bg,
                      color: badge.fg,
                      borderRadius: 999,
                      padding: "2px 8px",
                      fontSize: 9.5,
                      fontWeight: 600,
                    }}
                  >
                    {row.status}
                  </span>
                </span>
                <span style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {row.total}
                </span>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
