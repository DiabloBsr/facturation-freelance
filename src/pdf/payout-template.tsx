/* Justificatif de reversement remis au sous-traitant. */

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { CompanyLogo } from "./company-logo";
import type { PdfViewModel } from "./view-model";

export type PayoutPdfModel = {
  title: string;
  number: string;
  isDraft: boolean;
  accent: string;
  date: string;
  paidAt: string | null;
  reference: string | null;
  documentNumber: string | null;

  company: PdfViewModel["company"];

  beneficiary: {
    name: string;
    legalName: string | null;
    addressLines: string[];
    email: string | null;
    identifiers: { label: string; value: string }[];
  };

  sourceCode: string;
  targetCode: string;
  rateLabel: string;

  lines: { label: string; description: string | null; quantity: string; unit: string; unitPrice: string; amount: string }[];

  totalSource: string;
  totalConverted: string;
  bankFees: string | null;
  adjustments: { label: string; amount: string }[];
  netPayable: string;
  netInWords: string | null;

  notes: string | null;
  footer: string | null;
};

const INK = "#1A1815";
const GREY = "#6B655C";
const RULE = "#E3E0D9";

const styles = StyleSheet.create({
  page: { paddingTop: 34, paddingBottom: 44, paddingHorizontal: 42, fontSize: 9, fontFamily: "Helvetica", color: INK },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 20 },
  logo: { width: 42, height: 42, objectFit: "contain", marginBottom: 6 },
  name: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  micro: { fontSize: 7.5, color: GREY, lineHeight: 1.4 },
  strong: { fontFamily: "Helvetica-Bold" },
  muted: { color: GREY },
  line: { marginBottom: 1, lineHeight: 1.3 },

  titleBox: { alignItems: "flex-end" },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", letterSpacing: 0.6 },
  number: { fontSize: 9.5, color: GREY, marginTop: 2 },

  bar: { height: 2, marginTop: 10, marginBottom: 12 },

  cols: { flexDirection: "row", gap: 16 },
  box: { flex: 1, borderWidth: 0.6, borderStyle: "solid", borderColor: RULE, padding: 8 },
  boxLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 0.6, color: GREY, marginBottom: 3 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 1.5 },

  thead: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 7, marginTop: 14 },
  th: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#FFFFFF", letterSpacing: 0.4 },
  tr: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 7, borderBottomWidth: 0.5, borderStyle: "solid", borderColor: "#EDEAE4" },
  cDesc: { flex: 1, paddingRight: 8 },
  cQty: { width: 66, textAlign: "right" },
  cPrice: { width: 74, textAlign: "right" },
  cAmount: { width: 82, textAlign: "right" },
  desc: { fontSize: 7.5, color: GREY, marginTop: 1.5, lineHeight: 1.3 },

  calc: { marginTop: 14, borderWidth: 0.6, borderStyle: "solid", borderColor: RULE },
  calcRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, paddingHorizontal: 10, borderBottomWidth: 0.5, borderStyle: "solid", borderColor: "#EDEAE4" },
  calcStrong: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, paddingHorizontal: 10, backgroundColor: "#F4F2EE", borderBottomWidth: 0.5, borderStyle: "solid", borderColor: "#EDEAE4" },
  net: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, paddingHorizontal: 10 },
  netLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },
  netValue: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },

  words: { marginTop: 10, fontSize: 8.5, lineHeight: 1.45 },
  notes: { marginTop: 12, fontSize: 8.5, lineHeight: 1.45, color: "#3A352E" },

  signatures: { flexDirection: "row", gap: 24, marginTop: 26 },
  signBox: { flex: 1, borderTopWidth: 0.6, borderStyle: "solid", borderColor: RULE, paddingTop: 5 },
  signLabel: { fontSize: 7.5, color: GREY },
  signSpace: { height: 42 },

  footer: { position: "absolute", bottom: 20, left: 42, right: 42, borderTopWidth: 0.5, borderStyle: "solid", borderColor: RULE, paddingTop: 5, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: GREY },
  draft: { position: "absolute", top: 300, left: 110, fontSize: 62, color: INK, opacity: 0.06, fontFamily: "Helvetica-Bold", transform: "rotate(-24deg)" },
});

export function PayoutTemplate({ vm }: { vm: PayoutPdfModel }) {
  const accent = vm.accent;
  // Le gabarit du logo attend un modèle de facture : seul le bloc entreprise
  // l'intéresse, on le lui passe tel quel.
  const logoHost = { company: vm.company, accent } as unknown as PdfViewModel;

  return (
    <Document title={`${vm.title} ${vm.number}`} author={vm.company.name}>
      <Page size="A4" style={styles.page} wrap>
        {vm.isDraft && <Text style={styles.draft}>BROUILLON</Text>}

        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <CompanyLogo vm={logoHost} accent={accent} size={42} style={styles.logo} />
            <Text style={styles.name}>{vm.company.tradeName || vm.company.name}</Text>
            <Text style={styles.micro}>
              {[vm.company.addressLines.join(", "), vm.company.phone, vm.company.email]
                .filter(Boolean)
                .join(" · ")}
            </Text>
            {vm.company.identifiers.length > 0 && (
              <Text style={styles.micro}>
                {vm.company.identifiers.map((i) => `${i.label} ${i.value}`).join(" · ")}
              </Text>
            )}
          </View>

          <View style={styles.titleBox}>
            <Text style={[styles.title, { color: accent }]}>{vm.title}</Text>
            <Text style={styles.number}>N° {vm.number}</Text>
          </View>
        </View>

        <View style={[styles.bar, { backgroundColor: accent }]} />

        <View style={styles.cols}>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>REVERSÉ À</Text>
            <Text style={[styles.line, styles.strong]}>{vm.beneficiary.name}</Text>
            {vm.beneficiary.legalName && vm.beneficiary.legalName !== vm.beneficiary.name && (
              <Text style={styles.line}>{vm.beneficiary.legalName}</Text>
            )}
            {vm.beneficiary.addressLines.map((row, index) => (
              <Text key={index} style={styles.line}>
                {row}
              </Text>
            ))}
            {vm.beneficiary.email && <Text style={styles.line}>{vm.beneficiary.email}</Text>}
            {vm.beneficiary.identifiers.map((identifier) => (
              <Text key={identifier.label} style={[styles.line, styles.muted]}>
                {identifier.label} : {identifier.value}
              </Text>
            ))}
          </View>

          <View style={[styles.box, { maxWidth: 210 }]}>
            <Text style={styles.boxLabel}>INFORMATIONS</Text>
            <View style={styles.row}>
              <Text style={styles.muted}>Date</Text>
              <Text style={styles.strong}>{vm.date}</Text>
            </View>
            {vm.documentNumber && (
              <View style={styles.row}>
                <Text style={styles.muted}>Facture d&apos;origine</Text>
                <Text style={styles.strong}>{vm.documentNumber}</Text>
              </View>
            )}
            {vm.reference && (
              <View style={styles.row}>
                <Text style={styles.muted}>Référence</Text>
                <Text style={styles.strong}>{vm.reference}</Text>
              </View>
            )}
            {vm.paidAt && (
              <View style={styles.row}>
                <Text style={styles.muted}>Reversé le</Text>
                <Text style={styles.strong}>{vm.paidAt}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Prestations, dans la devise reçue */}
        <View style={[styles.thead, { backgroundColor: accent }]}>
          <Text style={[styles.th, styles.cDesc]}>PRESTATION</Text>
          <Text style={[styles.th, styles.cQty]}>QUANTITÉ</Text>
          <Text style={[styles.th, styles.cPrice]}>P.U.</Text>
          <Text style={[styles.th, styles.cAmount]}>MONTANT</Text>
        </View>

        {vm.lines.map((line, index) => (
          <View key={index} style={styles.tr} wrap={false}>
            <View style={styles.cDesc}>
              <Text>{line.label}</Text>
              {line.description && <Text style={styles.desc}>{line.description}</Text>}
            </View>
            <Text style={styles.cQty}>
              {line.quantity} {line.unit}
            </Text>
            <Text style={styles.cPrice}>{line.unitPrice}</Text>
            <Text style={[styles.cAmount, styles.strong]}>{line.amount}</Text>
          </View>
        ))}

        {/* Le calcul, poste par poste */}
        <View style={styles.calc}>
          <View style={styles.calcStrong}>
            <Text style={styles.strong}>Total reçu ({vm.sourceCode})</Text>
            <Text style={styles.strong}>{vm.totalSource}</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.muted}>Cours appliqué par la banque — {vm.rateLabel}</Text>
            <Text style={styles.strong}>{vm.totalConverted}</Text>
          </View>

          {vm.bankFees && (
            <View style={styles.calcRow}>
              <Text style={styles.muted}>Frais de banque</Text>
              <Text>− {vm.bankFees}</Text>
            </View>
          )}

          {vm.adjustments.map((adjustment, index) => (
            <View key={index} style={styles.calcRow}>
              <Text style={styles.muted}>{adjustment.label}</Text>
              <Text>{adjustment.amount}</Text>
            </View>
          ))}

          <View style={[styles.net, { backgroundColor: accent }]}>
            <Text style={styles.netLabel}>NET À REVERSER ({vm.targetCode})</Text>
            <Text style={styles.netValue}>{vm.netPayable}</Text>
          </View>
        </View>

        {vm.netInWords && (
          <Text style={styles.words}>
            <Text style={styles.strong}>Arrêté le présent décompte à la somme de : </Text>
            {vm.netInWords}.
          </Text>
        )}

        {vm.notes && <Text style={styles.notes}>{vm.notes}</Text>}

        <View style={styles.signatures} wrap={false}>
          <View style={styles.signBox}>
            <Text style={styles.signLabel}>Le donneur d&apos;ordre</Text>
            <Text style={[styles.strong, { marginTop: 2 }]}>{vm.company.name}</Text>
            <View style={styles.signSpace} />
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signLabel}>Le sous-traitant — reçu pour solde</Text>
            <Text style={[styles.strong, { marginTop: 2 }]}>{vm.beneficiary.name}</Text>
            <View style={styles.signSpace} />
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>{vm.footer || vm.company.name}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
