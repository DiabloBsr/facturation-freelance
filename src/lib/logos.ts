/**
 * Propositions de logo, décrites une seule fois.
 *
 * Chaque marque est un jeu de primitives dans un carré de 100×100. Le même
 * dessin est rendu en SVG dans le navigateur (pour choisir) et par le moteur
 * PDF (pour la facture) : aucune image bitmap, donc net à toute taille et
 * aucune dépendance de conversion.
 *
 * Une couleur est soit symbolique (`accent`, `ink`, `white`), soit un hexadécimal
 * explicite, soit un renvoi à un dégradé déclaré dans `defs` (`grad:nom`).
 * Les marques qui portent leur propre palette peuvent la proposer comme couleur
 * d'accent de toute la facture.
 */

export type LogoColor = string;

export type LogoGradient = {
  id: string;
  from: string;
  to: string;
  /** Coordonnées dans le repère du dessin (0 → 100). */
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
};

type Base = {
  fill?: LogoColor;
  stroke?: LogoColor;
  strokeWidth?: number;
  opacity?: number;
};

export type LogoShape =
  | (Base & { kind: "rect"; x: number; y: number; w: number; h: number; rx?: number })
  | (Base & { kind: "circle"; cx: number; cy: number; r: number })
  | (Base & { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number })
  | (Base & { kind: "polygon"; points: string })
  | (Base & {
      kind: "path";
      d: string;
      linecap?: "butt" | "round" | "square";
      linejoin?: "miter" | "round" | "bevel";
    })
  | (Base & {
      kind: "text";
      x: number;
      y: number;
      content: string;
      size: number;
      bold?: boolean;
      serif?: boolean;
      mono?: boolean;
      italic?: boolean;
      anchor?: "start" | "middle" | "end";
      letterSpacing?: number;
    });

export type LogoFamily =
  | "Monogrammes"
  | "Métier et code"
  | "Géométrie"
  | "Madagascar"
  | "Typographiques";

export type LogoProposal = {
  id: string;
  name: string;
  family: LogoFamily;
  description: string;
  /** Modèles de facture auxquels la marque va particulièrement bien. */
  suits: string;
  /** Couleur d'accent que la marque propose, si elle en porte une. */
  palette?: string;
  defs?: LogoGradient[];
  shapes: LogoShape[];
};

// Teintes récurrentes, choisies pour rester lisibles à l'impression.
const NAVY = "#1F4D7A";
const TEAL = "#0F6E6E";
const EMERALD = "#146C50";
const AMBER = "#B87514";
const TERRA = "#A2452C";
const PLUM = "#5B3A7E";
const SLATE = "#37455B";
const GOLD = "#C9A227";

export const LOGO_PROPOSALS: LogoProposal[] = [
  // ---------------------------------------------------------------- Monogrammes
  {
    id: "bloc",
    name: "Bloc OF",
    family: "Monogrammes",
    description:
      "Un carré plein aux angles adoucis, vos initiales en réserve. Lisible même minuscule — le choix le plus sûr.",
    suits: "Va avec tous les modèles.",
    shapes: [
      { kind: "rect", x: 6, y: 6, w: 88, h: 88, rx: 20, fill: "accent" },
      { kind: "text", x: 50, y: 66, content: "OF", size: 40, fill: "white", bold: true, anchor: "middle", letterSpacing: 1 },
    ],
  },
  {
    id: "bloc-degrade",
    name: "Bloc dégradé",
    family: "Monogrammes",
    description:
      "Le même bloc, traversé d'un dégradé profond. La nuance donne du relief sans jamais gêner la lecture.",
    suits: "Très bien en Moderne et Classique.",
    palette: NAVY,
    defs: [{ id: "g", from: "#2B6CA3", to: "#12324F", x1: 0, y1: 0, x2: 100, y2: 100 }],
    shapes: [
      { kind: "rect", x: 6, y: 6, w: 88, h: 88, rx: 22, fill: "grad:g" },
      { kind: "text", x: 50, y: 66, content: "OF", size: 40, fill: "white", bold: true, anchor: "middle", letterSpacing: 1 },
    ],
  },
  {
    id: "bloc-coupe",
    name: "Bloc bicolore",
    family: "Monogrammes",
    description:
      "Le carré coupé en diagonale, une initiale de chaque côté. Franc, mémorisable, très identitaire.",
    suits: "Moderne, Compact.",
    palette: TEAL,
    shapes: [
      { kind: "rect", x: 6, y: 6, w: 88, h: 88, rx: 20, fill: "#0F6E6E" },
      { kind: "polygon", points: "94,6 94,94 6,94", fill: "#0B4F4F" },
      { kind: "text", x: 33, y: 45, content: "O", size: 27, fill: "white", bold: true, anchor: "middle" },
      { kind: "text", x: 67, y: 79, content: "F", size: 27, fill: "white", bold: true, anchor: "middle" },
    ],
  },
  {
    id: "disque",
    name: "Disque",
    family: "Monogrammes",
    description:
      "Un disque plein, initiales centrées. La forme la plus douce : elle s'accorde avec les mises en page aérées.",
    suits: "Minimal, Élégant.",
    palette: PLUM,
    shapes: [
      { kind: "circle", cx: 50, cy: 50, r: 44, fill: "#5B3A7E" },
      { kind: "circle", cx: 50, cy: 50, r: 44, fill: "none", stroke: "#7B57A3", strokeWidth: 3 },
      { kind: "text", x: 50, y: 64, content: "OF", size: 34, fill: "white", bold: true, anchor: "middle", letterSpacing: 1 },
    ],
  },
  {
    id: "hexagone",
    name: "Hexagone",
    family: "Monogrammes",
    description:
      "Un hexagone dégradé et votre initiale. La facette évoque la construction, la précision technique.",
    suits: "Moderne, Compact.",
    palette: SLATE,
    defs: [{ id: "g", from: "#4A5D77", to: "#25314A", x1: 20, y1: 0, x2: 80, y2: 100 }],
    shapes: [
      { kind: "polygon", points: "50,5 89,27 89,73 50,95 11,73 11,27", fill: "grad:g" },
      { kind: "text", x: 50, y: 66, content: "F", size: 42, fill: "white", bold: true, anchor: "middle" },
    ],
  },
  {
    id: "ecusson",
    name: "Écusson",
    family: "Monogrammes",
    description:
      "Un écusson sobre : la forme de la garantie et de la signature. Elle inspire la solidité sur un document officiel.",
    suits: "Classique, Élégant.",
    palette: EMERALD,
    shapes: [
      { kind: "path", d: "M 50 6 L 88 20 L 88 54 C 88 76 70 90 50 96 C 30 90 12 76 12 54 L 12 20 Z", fill: "#146C50" },
      { kind: "path", d: "M 50 14 L 81 25 L 81 54 C 81 71 66 83 50 88 C 34 83 19 71 19 54 L 19 25 Z", fill: "none", stroke: "#5FBF95", strokeWidth: 2 },
      { kind: "text", x: 50, y: 62, content: "OF", size: 28, fill: "white", bold: true, serif: true, anchor: "middle", letterSpacing: 1 },
    ],
  },

  // ------------------------------------------------------------ Métier et code
  {
    id: "chevron",
    name: "Cercle et chevrons",
    family: "Métier et code",
    description:
      "Un anneau ouvert traversé de chevrons de code. Il dit votre métier sans l'écrire, et reste sobre.",
    suits: "Moderne, Minimal.",
    shapes: [
      { kind: "circle", cx: 50, cy: 50, r: 40, stroke: "accent", strokeWidth: 7, fill: "none" },
      { kind: "path", d: "M 38 36 L 24 50 L 38 64", stroke: "accent", strokeWidth: 7, fill: "none", linecap: "round", linejoin: "round" },
      { kind: "path", d: "M 62 36 L 76 50 L 62 64", stroke: "accent", strokeWidth: 7, fill: "none", linecap: "round", linejoin: "round" },
      { kind: "path", d: "M 56 30 L 44 70", stroke: "accent", strokeWidth: 7, fill: "none", linecap: "round" },
    ],
  },
  {
    id: "accolades",
    name: "Accolades",
    family: "Métier et code",
    description:
      "Votre initiale tenue entre deux accolades. Discrètement technique, très net en noir et blanc.",
    suits: "Minimal, Moderne.",
    shapes: [
      { kind: "path", d: "M 32 16 C 22 16 24 42 14 50 C 24 58 22 84 32 84", stroke: "accent", strokeWidth: 6.5, fill: "none", linecap: "round", linejoin: "round" },
      { kind: "path", d: "M 68 16 C 78 16 76 42 86 50 C 76 58 78 84 68 84", stroke: "accent", strokeWidth: 6.5, fill: "none", linecap: "round", linejoin: "round" },
      { kind: "text", x: 50, y: 65, content: "O", size: 42, fill: "ink", bold: true, anchor: "middle" },
    ],
  },
  {
    id: "terminal",
    name: "Terminal",
    family: "Métier et code",
    description:
      "Une fenêtre de terminal et son invite. Assumé, direct, immédiatement compris d'un client technique.",
    suits: "Compact, Moderne.",
    palette: "#1B2430",
    shapes: [
      { kind: "rect", x: 6, y: 12, w: 88, h: 76, rx: 12, fill: "#1B2430" },
      { kind: "circle", cx: 20, cy: 26, r: 3.4, fill: "#E06C5A" },
      { kind: "circle", cx: 32, cy: 26, r: 3.4, fill: "#D9A441" },
      { kind: "circle", cx: 44, cy: 26, r: 3.4, fill: "#6FC79B" },
      { kind: "text", x: 20, y: 66, content: ">", size: 30, fill: "#6FC79B", bold: true, mono: true },
      { kind: "rect", x: 42, y: 58, w: 26, h: 6, rx: 3, fill: "#8FA3BF" },
    ],
  },
  {
    id: "crochets",
    name: "Crochets",
    family: "Métier et code",
    description:
      "Vos initiales encadrées de crochets fins. Le clin d'œil au code le plus discret de la série.",
    suits: "Minimal, Élégant.",
    shapes: [
      { kind: "path", d: "M 30 18 L 16 18 L 16 82 L 30 82", stroke: "accent", strokeWidth: 5, fill: "none", linecap: "round", linejoin: "round" },
      { kind: "path", d: "M 70 18 L 84 18 L 84 82 L 70 82", stroke: "accent", strokeWidth: 5, fill: "none", linecap: "round", linejoin: "round" },
      { kind: "text", x: 50, y: 63, content: "OF", size: 27, fill: "ink", bold: true, anchor: "middle", letterSpacing: 1 },
    ],
  },
  {
    id: "slash",
    name: "Barre oblique",
    family: "Métier et code",
    description:
      "Deux initiales séparées d'une oblique franche, comme un chemin de fichier. Rythmé et contemporain.",
    suits: "Moderne, Compact.",
    palette: TERRA,
    shapes: [
      { kind: "text", x: 20, y: 66, content: "O", size: 38, fill: "ink", bold: true, anchor: "middle" },
      { kind: "path", d: "M 58 22 L 42 78", stroke: "#A2452C", strokeWidth: 7, linecap: "round" },
      { kind: "text", x: 80, y: 66, content: "F", size: 38, fill: "#A2452C", bold: true, anchor: "middle" },
    ],
  },

  // ------------------------------------------------------------------ Géométrie
  {
    id: "anneau-encoche",
    name: "Anneau à encoche",
    family: "Géométrie",
    description:
      "Un anneau épais interrompu net. Abstrait, très actuel : il fonctionne aussi bien en favicon qu'en grand.",
    suits: "Moderne, Minimal.",
    palette: TEAL,
    defs: [{ id: "g", from: "#12A594", to: "#0B4F4F", x1: 10, y1: 10, x2: 90, y2: 90 }],
    shapes: [
      { kind: "path", d: "M 50 12 A 38 38 0 1 1 12 50", stroke: "grad:g", strokeWidth: 15, fill: "none", linecap: "round" },
      { kind: "circle", cx: 50, cy: 50, r: 9, fill: "grad:g" },
    ],
  },
  {
    id: "losange",
    name: "Losange",
    family: "Géométrie",
    description:
      "Un losange dégradé, initiale en réserve. La pointe donne du mouvement là où le carré est statique.",
    suits: "Moderne, Élégant.",
    palette: AMBER,
    defs: [{ id: "g", from: "#E0A33E", to: "#8A5410", x1: 0, y1: 0, x2: 100, y2: 100 }],
    shapes: [
      { kind: "polygon", points: "50,4 96,50 50,96 4,50", fill: "grad:g" },
      { kind: "text", x: 50, y: 64, content: "O", size: 36, fill: "white", bold: true, anchor: "middle" },
    ],
  },
  {
    id: "arcs",
    name: "Arcs",
    family: "Géométrie",
    description:
      "Trois arcs décalés, sans lettre. Le plus abstrait et le plus haut de gamme : il vieillit très bien.",
    suits: "Élégant, Minimal.",
    palette: NAVY,
    shapes: [
      { kind: "path", d: "M 18 78 A 40 40 0 0 1 82 78", stroke: "accent", strokeWidth: 8, fill: "none", linecap: "round" },
      { kind: "path", d: "M 30 78 A 26 26 0 0 1 70 78", stroke: "accent", strokeWidth: 8, fill: "none", linecap: "round", opacity: 0.65 },
      { kind: "path", d: "M 42 78 A 12 12 0 0 1 58 78", stroke: "accent", strokeWidth: 8, fill: "none", linecap: "round", opacity: 0.35 },
    ],
  },
  {
    id: "prisme",
    name: "Prisme",
    family: "Géométrie",
    description:
      "Deux triangles imbriqués en dégradé. Une marque de studio : nette, structurée, sans nostalgie.",
    suits: "Moderne, Compact.",
    palette: PLUM,
    defs: [
      { id: "b", from: "#B98FDD", to: "#6A45A0", x1: 100, y1: 0, x2: 0, y2: 100 },
    ],
    shapes: [
      { kind: "polygon", points: "50,8 92,84 8,84", fill: "grad:b" },
      { kind: "polygon", points: "50,34 74,84 26,84", fill: "#FFFFFF", opacity: 0.9 },
      { kind: "polygon", points: "50,50 62,84 38,84", fill: "grad:b" },
    ],
  },
  {
    id: "contreforme",
    name: "Contreforme",
    family: "Géométrie",
    description:
      "Un carré plein dans lequel le O est découpé, laissant voir le fond. Élégant, un peu savant, très net.",
    suits: "Minimal, Classique.",
    shapes: [
      { kind: "path", d: "M 6 26 A 20 20 0 0 1 26 6 L 74 6 A 20 20 0 0 1 94 26 L 94 74 A 20 20 0 0 1 74 94 L 26 94 A 20 20 0 0 1 6 74 Z M 50 28 A 22 22 0 1 0 50 72 A 22 22 0 1 0 50 28 Z", fill: "accent" },
    ],
  },

  // ----------------------------------------------------------------- Madagascar
  {
    id: "soleil",
    name: "Soleil",
    family: "Madagascar",
    description:
      "Un soleil levant stylisé, chaleureux sans être folklorique. Une couleur qui vous distingue d'emblée.",
    suits: "Moderne, Compact.",
    palette: AMBER,
    defs: [{ id: "g", from: "#E8A93C", to: "#C0641A", x1: 0, y1: 20, x2: 0, y2: 90 }],
    shapes: [
      { kind: "path", d: "M 14 74 A 36 36 0 0 1 86 74 Z", fill: "grad:g" },
      { kind: "rect", x: 10, y: 80, w: 80, h: 6, rx: 3, fill: "#C0641A" },
      { kind: "path", d: "M 50 12 L 50 24", stroke: "#E8A93C", strokeWidth: 5, linecap: "round" },
      { kind: "path", d: "M 22 24 L 30 33", stroke: "#E8A93C", strokeWidth: 5, linecap: "round" },
      { kind: "path", d: "M 78 24 L 70 33", stroke: "#E8A93C", strokeWidth: 5, linecap: "round" },
    ],
  },
  {
    id: "ravinala",
    name: "Ravinala",
    family: "Madagascar",
    description:
      "L'éventail de l'arbre du voyageur, réduit à sept traits. Discrètement malgache, résolument graphique.",
    suits: "Élégant, Minimal.",
    palette: EMERALD,
    shapes: [
      { kind: "path", d: "M 50 88 L 50 56", stroke: "#0E5A42", strokeWidth: 6, linecap: "round" },
      { kind: "path", d: "M 50 60 L 14 34", stroke: "#146C50", strokeWidth: 6, linecap: "round" },
      { kind: "path", d: "M 50 60 L 25 22", stroke: "#1A8261", strokeWidth: 6, linecap: "round" },
      { kind: "path", d: "M 50 60 L 40 14", stroke: "#22996F", strokeWidth: 6, linecap: "round" },
      { kind: "path", d: "M 50 60 L 60 14", stroke: "#22996F", strokeWidth: 6, linecap: "round" },
      { kind: "path", d: "M 50 60 L 75 22", stroke: "#1A8261", strokeWidth: 6, linecap: "round" },
      { kind: "path", d: "M 50 60 L 86 34", stroke: "#146C50", strokeWidth: 6, linecap: "round" },
      { kind: "rect", x: 30, y: 86, w: 40, h: 5, rx: 2.5, fill: "#0E5A42" },
    ],
  },
  {
    id: "horizon",
    name: "Horizon",
    family: "Madagascar",
    description:
      "Un disque coupé par deux lignes d'horizon. Calme et large, il évoque le grand large plutôt que le code.",
    suits: "Minimal, Élégant.",
    palette: TERRA,
    defs: [{ id: "g", from: "#C86A4B", to: "#8E3A22", x1: 0, y1: 0, x2: 0, y2: 100 }],
    shapes: [
      { kind: "circle", cx: 50, cy: 46, r: 32, fill: "grad:g" },
      { kind: "rect", x: 8, y: 62, w: 84, h: 6, rx: 3, fill: "#FFFFFF" },
      { kind: "rect", x: 8, y: 76, w: 84, h: 6, rx: 3, fill: "#8E3A22" },
      { kind: "rect", x: 26, y: 88, w: 48, h: 5, rx: 2.5, fill: "#C86A4B", opacity: 0.6 },
    ],
  },

  // ------------------------------------------------------------- Typographiques
  {
    id: "initiales",
    name: "Initiales F·B·O",
    family: "Typographiques",
    description:
      "Purement typographique : vos trois initiales et un filet. Aucun symbole à interpréter, l'élégance vient de l'espacement.",
    suits: "Élégant, Minimal.",
    shapes: [
      { kind: "text", x: 50, y: 52, content: "FBO", size: 30, fill: "ink", bold: true, serif: true, anchor: "middle", letterSpacing: 6 },
      { kind: "rect", x: 20, y: 62, w: 60, h: 3, rx: 1.5, fill: "accent" },
      { kind: "text", x: 50, y: 82, content: "2026", size: 11, fill: "accent", anchor: "middle", letterSpacing: 3 },
    ],
  },
  {
    id: "sceau",
    name: "Sceau",
    family: "Typographiques",
    description:
      "Deux anneaux concentriques et vos initiales au centre, comme un cachet. Le plus institutionnel.",
    suits: "Élégant, Classique.",
    shapes: [
      { kind: "circle", cx: 50, cy: 50, r: 44, stroke: "accent", strokeWidth: 2.5, fill: "none" },
      { kind: "circle", cx: 50, cy: 50, r: 36, stroke: "accent", strokeWidth: 5, fill: "none" },
      { kind: "text", x: 50, y: 62, content: "OF", size: 30, fill: "accent", bold: true, serif: true, anchor: "middle", letterSpacing: 2 },
    ],
  },
  {
    id: "sceau-or",
    name: "Sceau doré",
    family: "Typographiques",
    description:
      "Le sceau, en or sur encre profonde. Le plus habillé de la série : parfait pour une clientèle haut de gamme.",
    suits: "Élégant.",
    palette: GOLD,
    defs: [{ id: "g", from: "#E3C359", to: "#A8821A", x1: 20, y1: 10, x2: 80, y2: 90 }],
    shapes: [
      { kind: "circle", cx: 50, cy: 50, r: 46, fill: "#16202E" },
      { kind: "circle", cx: 50, cy: 50, r: 40, stroke: "grad:g", strokeWidth: 1.6, fill: "none" },
      { kind: "circle", cx: 50, cy: 50, r: 34, stroke: "grad:g", strokeWidth: 4, fill: "none" },
      { kind: "text", x: 50, y: 62, content: "OF", size: 28, fill: "grad:g", bold: true, serif: true, anchor: "middle", letterSpacing: 2 },
    ],
  },
  {
    id: "paraphe",
    name: "Paraphe",
    family: "Typographiques",
    description:
      "Votre prénom en italique et un trait de plume. Chaleureux et personnel — il vend l'artisan plutôt que la société.",
    suits: "Élégant, Minimal.",
    shapes: [
      { kind: "text", x: 50, y: 52, content: "Olivio", size: 27, fill: "ink", serif: true, italic: true, anchor: "middle" },
      { kind: "path", d: "M 16 66 C 34 58 54 74 84 60", stroke: "accent", strokeWidth: 3.5, fill: "none", linecap: "round" },
      { kind: "text", x: 50, y: 86, content: "FANOMEZANTSOA", size: 8.5, fill: "accent", anchor: "middle", letterSpacing: 1.2 },
    ],
  },
  {
    id: "pile",
    name: "Pile",
    family: "Typographiques",
    description:
      "Vos initiales empilées et alignées à gauche, séparées de filets. Une rigueur d'éditeur, très lisible.",
    suits: "Minimal, Compact.",
    shapes: [
      { kind: "text", x: 22, y: 34, content: "F", size: 22, fill: "ink", bold: true, anchor: "start" },
      { kind: "text", x: 22, y: 60, content: "B", size: 22, fill: "ink", bold: true, anchor: "start" },
      { kind: "text", x: 22, y: 86, content: "O", size: 22, fill: "accent", bold: true, anchor: "start" },
      { kind: "rect", x: 52, y: 26, w: 26, h: 3, rx: 1.5, fill: "accent" },
      { kind: "rect", x: 52, y: 52, w: 26, h: 3, rx: 1.5, fill: "accent", opacity: 0.6 },
      { kind: "rect", x: 52, y: 78, w: 26, h: 3, rx: 1.5, fill: "accent", opacity: 0.3 },
    ],
  },
];

export const LOGO_FAMILIES: LogoFamily[] = [
  "Monogrammes",
  "Métier et code",
  "Géométrie",
  "Madagascar",
  "Typographiques",
];

export function logoById(id: string): LogoProposal | undefined {
  return LOGO_PROPOSALS.find((logo) => logo.id === id);
}

/**
 * Résout une couleur : symbolique, hexadécimale, ou renvoi vers un dégradé.
 * `instanceId` distingue les dégradés d'une marque à l'autre quand plusieurs
 * sont affichées sur la même page.
 */
export function resolveLogoColor(
  color: LogoColor | undefined,
  accent: string,
  instanceId: string,
  fallback = "none",
): string {
  if (!color || color === "none") return fallback;
  if (color === "accent") return accent;
  if (color === "white") return "#FFFFFF";
  if (color === "ink") return "#1A1815";
  if (color.startsWith("grad:")) return `url(#${instanceId}-${color.slice(5)})`;
  return color;
}
