import type { ReactElement } from "react";
import type { PdfViewModel } from "./view-model";
import { ClassiqueTemplate } from "./templates/classique";
import { ModerneTemplate } from "./templates/moderne";
import { MinimalTemplate } from "./templates/minimal";
import { ElegantTemplate } from "./templates/elegant";
import { CompactTemplate } from "./templates/compact";

/** Gabarits PDF, indexés par identifiant de modèle. */
export const TEMPLATE_RENDERERS: Record<
  string,
  (props: { vm: PdfViewModel }) => ReactElement
> = {
  classique: ClassiqueTemplate,
  moderne: ModerneTemplate,
  minimal: MinimalTemplate,
  elegant: ElegantTemplate,
  compact: CompactTemplate,
};
