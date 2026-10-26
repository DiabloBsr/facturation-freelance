/** Modèles de mise en page disponibles pour les PDF. */

export type TemplateInfo = {
  id: string;
  name: string;
  description: string;
  /** Résumé visuel affiché dans le sélecteur. */
  traits: string[];
};

export const TEMPLATES: TemplateInfo[] = [
  {
    id: "classique",
    name: "Classique",
    description:
      "Bandeau de couleur, blocs encadrés, mentions légales complètes. Le plus institutionnel — à l'aise avec les administrations et les grands comptes.",
    traits: ["Bandeau coloré", "Cadres nets", "Très lisible"],
  },
  {
    id: "moderne",
    name: "Moderne",
    description:
      "Colonne latérale colorée qui regroupe vos coordonnées et votre RIB, grands titres, tableau aéré.",
    traits: ["Colonne latérale", "Titres larges", "Aéré"],
  },
  {
    id: "minimal",
    name: "Minimal",
    description:
      "Noir et blanc, filets fins, beaucoup de respiration. Sobre et intemporel, idéal pour les prestations intellectuelles.",
    traits: ["Sans couleur", "Filets fins", "Épuré"],
  },
  {
    id: "elegant",
    name: "Élégant",
    description:
      "Titres en capitales espacées, séparateurs discrets, totaux mis en valeur. Le plus haut de gamme.",
    traits: ["Capitales espacées", "Contraste doux", "Premium"],
  },
  {
    id: "compact",
    name: "Compact",
    description:
      "Densité maximale : interlignes serrés et colonnes resserrées pour faire tenir un long détail sur une seule page.",
    traits: ["Dense", "Longues listes", "Économe en pages"],
  },
];

export function templateById(id: string): TemplateInfo {
  return TEMPLATES.find((template) => template.id === id) ?? TEMPLATES[0];
}
