/**
 * Sérialisation d'une marque en SVG brut.
 *
 * Utilisée pour le favicon, servi comme fichier autonome. Next interdit
 * `react-dom/server` dans l'App Router : on écrit donc le balisage à la main,
 * à partir de la même description de formes que les deux autres rendus.
 */

import { logoById, resolveLogoColor, type LogoShape } from "./logos";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** N'écrit un attribut que s'il a une valeur utile. */
function attrs(pairs: Record<string, string | number | undefined>): string {
  return Object.entries(pairs)
    .filter(([, value]) => value !== undefined && value !== "" && value !== "none")
    .map(([key, value]) => `${key}="${esc(String(value))}"`)
    .join(" ");
}

function fontFamily(shape: Extract<LogoShape, { kind: "text" }>): string {
  if (shape.mono) return "ui-monospace, Consolas, monospace";
  if (shape.serif) return "Georgia, 'Times New Roman', serif";
  return "system-ui, 'Segoe UI', Helvetica, Arial, sans-serif";
}

function shapeToSvg(shape: LogoShape, accent: string, instanceId: string): string {
  const fill = resolveLogoColor(shape.fill, accent, instanceId);
  const stroke = resolveLogoColor(shape.stroke, accent, instanceId);
  const common = {
    fill,
    stroke,
    "stroke-width": shape.strokeWidth || undefined,
    opacity: shape.opacity !== undefined && shape.opacity !== 1 ? shape.opacity : undefined,
  };

  switch (shape.kind) {
    case "rect":
      return `<rect ${attrs({ x: shape.x, y: shape.y, width: shape.w, height: shape.h, rx: shape.rx, ...common })}/>`;
    case "circle":
      return `<circle ${attrs({ cx: shape.cx, cy: shape.cy, r: shape.r, ...common })}/>`;
    case "ellipse":
      return `<ellipse ${attrs({ cx: shape.cx, cy: shape.cy, rx: shape.rx, ry: shape.ry, ...common })}/>`;
    case "polygon":
      return `<polygon ${attrs({ points: shape.points, ...common })}/>`;
    case "path":
      return `<path ${attrs({
        d: shape.d,
        ...common,
        "stroke-linecap": shape.linecap,
        "stroke-linejoin": shape.linejoin,
      })}/>`;
    case "text":
      return `<text ${attrs({
        x: shape.x,
        y: shape.y,
        "font-size": shape.size,
        fill: resolveLogoColor(shape.fill, accent, instanceId, "#1A1815"),
        "font-weight": shape.bold ? 700 : undefined,
        "font-style": shape.italic ? "italic" : undefined,
        "font-family": fontFamily(shape),
        "text-anchor": shape.anchor,
        "letter-spacing": shape.letterSpacing,
        opacity: shape.opacity !== undefined && shape.opacity !== 1 ? shape.opacity : undefined,
      })}>${esc(shape.content)}</text>`;
  }
}

/** Marque complète, prête à être servie comme fichier `.svg`. */
export function renderLogoSvg(id: string, accent: string, size = 64): string | null {
  const logo = logoById(id);
  if (!logo) return null;

  const instanceId = "icon";

  const defs = logo.defs?.length
    ? `<defs>${logo.defs
        .map(
          (gradient) =>
            `<linearGradient ${attrs({
              id: `${instanceId}-${gradient.id}`,
              gradientUnits: "userSpaceOnUse",
              x1: gradient.x1 ?? 0,
              y1: gradient.y1 ?? 0,
              x2: gradient.x2 ?? 100,
              y2: gradient.y2 ?? 100,
            })}><stop offset="0%" stop-color="${esc(gradient.from)}"/><stop offset="100%" stop-color="${esc(
              gradient.to,
            )}"/></linearGradient>`,
        )
        .join("")}</defs>`
    : "";

  const body = logo.shapes.map((shape) => shapeToSvg(shape, accent, instanceId)).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${esc(
    logo.name,
  )}">${defs}${body}</svg>`;
}

/** Icône de repli, tant qu'aucune marque n'a été choisie. */
export function fallbackIconSvg(accent: string, size = 64): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="Facturation"><rect x="6" y="6" width="88" height="88" rx="20" fill="${esc(
    accent,
  )}"/><path d="M 32 30 h 36 M 32 48 h 26 M 32 66 h 16" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round"/></svg>`;
}
