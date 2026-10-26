import { Image, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { PdfLogoMark } from "./logo-mark";
import type { PdfViewModel } from "./view-model";

/**
 * Le logo de l'entreprise : l'image téléversée si elle existe, sinon la marque
 * vectorielle choisie dans la galerie, sinon rien.
 */
export function CompanyLogo({
  vm,
  accent,
  size,
  style,
}: {
  vm: PdfViewModel;
  accent: string;
  size: number;
  style?: Style;
}) {
  if (vm.company.logoData) {
    return (
      <Image
        src={vm.company.logoData}
        style={[{ width: size, height: size, objectFit: "contain" }, style ?? {}]}
      />
    );
  }

  if (vm.company.logoMark) {
    return (
      <View style={[{ width: size, height: size }, style ?? {}]}>
        <PdfLogoMark id={vm.company.logoMark} accent={accent} size={size} />
      </View>
    );
  }

  return null;
}
