/* Modèle « Compact » — densité maximale, pensé pour les longs détails de prestations. */

import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { PdfViewModel } from "../view-model";
import { CompanyLogo } from "../company-logo";

const INK = "#1A1815";
const GREY = "#6B655C";
const RULE = "#E3E0D9";

const styles = StyleSheet.create({
  page: {
    paddingTop: 26,
    paddingBottom: 40,
    paddingHorizontal: 30,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: INK,
  },
  head: { flexDirection: "row", justifyContent: "space-between", gap: 16, alignItems: "flex-start" },
  logo: { width: 38, height: 38, objectFit: "contain", marginRight: 8 },
  name: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  micro: { fontSize: 7, color: GREY, lineHeight: 1.35 },
  strong: { fontFamily: "Helvetica-Bold" },
  muted: { color: GREY },

  titleBox: { alignItems: "flex-end" },
  title: { fontSize: 13, fontFamily: "Helvetica-Bold", letterSpacing: 0.8 },
  number: { fontSize: 8.5, color: GREY, marginTop: 1 },

  bar: { height: 2, marginTop: 8, marginBottom: 8 },

  info: { flexDirection: "row", gap: 12 },
  infoBox: {
    flex: 1,
    borderWidth: 0.5,
    borderStyle: "solid",
    borderColor: RULE,
    padding: 6,
  },
  infoLabel: { fontSize: 6.5, letterSpacing: 0.5, color: GREY, marginBottom: 2.5 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 1 },
  line: { lineHeight: 1.3, marginBottom: 0.5 },

  subject: { marginTop: 7, fontSize: 8.5, fontFamily: "Helvetica-Bold" },

  thead: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 5, marginTop: 8 },
  th: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#FFFFFF", letterSpacing: 0.3 },
  tr: {
    flexDirection: "row",
    paddingVertical: 3.5,
    paddingHorizontal: 5,
    borderBottomWidth: 0.4,
    borderStyle: "solid",
    borderColor: "#EDEAE4",
  },
  cDesc: { flex: 1, paddingRight: 6 },
  cQty: { width: 42, textAlign: "right" },
  cUnit: { width: 38, paddingLeft: 4 },
  cPrice: { width: 66, textAlign: "right" },
  cVat: { width: 34, textAlign: "right" },
  cTotal: { width: 72, textAlign: "right" },
  desc: { fontSize: 7, color: GREY, marginTop: 1, lineHeight: 1.3 },

  bottom: { flexDirection: "row", gap: 12, marginTop: 8, alignItems: "flex-start" },
  side: { flex: 1 },
  totals: { width: 210 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 7,
    marginTop: 3,
  },
  grandText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },

  panel: { borderWidth: 0.5, borderStyle: "solid", borderColor: RULE, padding: 6, marginBottom: 6 },
  panelTitle: { fontSize: 6.5, fontFamily: "Helvetica-Bold", letterSpacing: 0.5, marginBottom: 3 },
  bankRow: { flexDirection: "row", marginBottom: 0.8 },
  bankLabel: { width: 66, color: GREY, fontSize: 7 },

  footer: {
    position: "absolute",
    bottom: 16,
    left: 30,
    right: 30,
    fontSize: 6.5,
    color: GREY,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.4,
    borderStyle: "solid",
    borderColor: RULE,
    paddingTop: 4,
  },
});

export function CompactTemplate({ vm }: { vm: PdfViewModel }) {
  const accent = vm.accent;

  return (
    <Document title={`${vm.title} ${vm.number}`} author={vm.company.name}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.head}>
          <View style={{ flexDirection: "row", flex: 1 }}>
            <CompanyLogo vm={vm} accent={vm.accent} size={38} style={styles.logo} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{vm.company.tradeName || vm.company.name}</Text>
              <Text style={styles.micro}>
                {[vm.company.addressLines.join(", "), vm.company.phone, vm.company.email]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              {vm.company.identifiers.length > 0 && (
                <Text style={styles.micro}>
                  {vm.company.identifiers
                    .map((identifier) => `${identifier.label} ${identifier.value}`)
                    .join(" · ")}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.titleBox}>
            <Text style={[styles.title, { color: accent }]}>{vm.title}</Text>
            <Text style={styles.number}>N° {vm.number}</Text>
          </View>
        </View>

        <View style={[styles.bar, { backgroundColor: accent }]} />

        <View style={styles.info}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>
              {vm.endClient ? "FACTURÉ À (AGENCE)" : "FACTURÉ À"}
            </Text>
            <Text style={[styles.line, styles.strong]}>{vm.billTo.displayName}</Text>
            {vm.billTo.legalLine && <Text style={styles.line}>{vm.billTo.legalLine}</Text>}
            {vm.contactName && <Text style={styles.line}>{vm.contactName}</Text>}
            <Text style={styles.line}>{vm.billTo.addressLines.join(", ")}</Text>
            {vm.billTo.identifiers.length > 0 && (
              <Text style={[styles.line, styles.muted]}>
                {vm.billTo.identifiers
                  .map((identifier) => `${identifier.label} ${identifier.value}`)
                  .join(" · ")}
              </Text>
            )}
            {vm.endClient && (
              <Text style={[styles.line, styles.muted]}>
                Pour le compte de <Text style={styles.strong}>{vm.endClient.name}</Text>
              </Text>
            )}
          </View>

          <View style={[styles.infoBox, { maxWidth: 190 }]}>
            <Text style={styles.infoLabel}>INFORMATIONS</Text>
            {vm.dates.map((date) => (
              <View key={date.label} style={styles.row}>
                <Text style={styles.muted}>{date.label}</Text>
                <Text style={styles.strong}>{date.value}</Text>
              </View>
            ))}
            {vm.purchaseOrder && (
              <View style={styles.row}>
                <Text style={styles.muted}>Bon de commande</Text>
                <Text style={styles.strong}>{vm.purchaseOrder}</Text>
              </View>
            )}
          </View>
        </View>

        {vm.subject && <Text style={styles.subject}>Objet : {vm.subject}</Text>}

        {/*
          Conteneur du tableau : `fixed` ne répète alors la ligne de titres que
          sur les pages qu'occupe réellement le tableau.
        */}
        <View>
        <View style={[styles.thead, { backgroundColor: accent }]} fixed>
          <Text style={[styles.th, styles.cDesc]}>DÉSIGNATION</Text>
          <Text style={[styles.th, styles.cQty]}>QTÉ</Text>
          <Text style={[styles.th, styles.cUnit]}>UNITÉ</Text>
          <Text style={[styles.th, styles.cPrice]}>P.U.</Text>
          {vm.showVatColumn && <Text style={[styles.th, styles.cVat]}>TVA</Text>}
          <Text style={[styles.th, styles.cTotal]}>MONTANT</Text>
        </View>

        {vm.lines.map((line, index) => {
          if (line.kind === "SECTION") {
            return (
              <View
                key={index}
                style={[styles.tr, { backgroundColor: "#F4F2EE" }]}
                wrap={false}
              >
                <Text style={[styles.strong, { color: accent }]}>{line.label}</Text>
              </View>
            );
          }
          if (line.kind === "TEXT") {
            return (
              <View key={index} style={styles.tr} wrap={false}>
                <Text style={[styles.cDesc, styles.muted]}>{line.label}</Text>
              </View>
            );
          }
          return (
            <View key={index} style={styles.tr} wrap={false}>
              <View style={styles.cDesc}>
                <Text>{line.label}</Text>
                {line.description && <Text style={styles.desc}>{line.description}</Text>}
                {line.discount && <Text style={styles.desc}>Remise {line.discount}</Text>}
              </View>
              <Text style={styles.cQty}>{line.quantity}</Text>
              <Text style={[styles.cUnit, styles.muted]}>{line.unit}</Text>
              <Text style={styles.cPrice}>{line.unitPrice}</Text>
              {vm.showVatColumn && <Text style={styles.cVat}>{line.vatRate}</Text>}
              <Text style={[styles.cTotal, styles.strong]}>{line.total}</Text>
            </View>
          );
        })}
        </View>

        <View style={styles.bottom}>
          <View style={styles.side}>
            {vm.bank && (
              <View style={styles.panel}>
                <Text style={[styles.panelTitle, { color: accent }]}>
                  {vm.bank.kindLabel.toUpperCase()}
                </Text>
                {vm.bank.rows.map((row) => (
                  <View key={row.label} style={styles.bankRow}>
                    <Text style={styles.bankLabel}>{row.label}</Text>
                    <Text style={[styles.strong, { fontSize: 7 }]}>{row.value}</Text>
                  </View>
                ))}
              </View>
            )}

            {vm.amountInWords && (
              <View style={styles.panel}>
                <Text style={{ fontSize: 7, lineHeight: 1.4 }}>
                  <Text style={styles.strong}>Arrêtée à la somme de : </Text>
                  {vm.amountInWords}.
                </Text>
              </View>
            )}

            {(vm.notes || vm.terms) && (
              <View style={styles.panel}>
                {vm.notes && <Text style={{ fontSize: 7, lineHeight: 1.4 }}>{vm.notes}</Text>}
                {vm.terms && (
                  <Text style={[{ fontSize: 7, lineHeight: 1.4 }, vm.notes ? { marginTop: 3 } : {}]}>
                    {vm.terms}
                  </Text>
                )}
              </View>
            )}

            {vm.legalNotes.length > 0 && (
              <Text style={[styles.micro, { marginTop: 2 }]}>{vm.legalNotes.join(" ")}</Text>
            )}
          </View>

          <View style={styles.totals}>
            {vm.totals.map((row, index) => (
              <View key={index} style={styles.totalRow}>
                <Text style={row.emphasis ? styles.strong : styles.muted}>{row.label}</Text>
                <Text style={row.emphasis ? styles.strong : undefined}>{row.value}</Text>
              </View>
            ))}

            <View style={[styles.grand, { backgroundColor: accent }]}>
              <Text style={styles.grandText}>{vm.grandTotalLabel}</Text>
              <Text style={styles.grandText}>{vm.grandTotalValue}</Text>
            </View>

            {vm.paidSummary?.map((row) => (
              <View key={row.label} style={styles.totalRow}>
                <Text style={styles.muted}>{row.label}</Text>
                <Text style={styles.strong}>{row.value}</Text>
              </View>
            ))}

            {(vm.company.signatureData || vm.company.signatureName) && (
              <View style={{ marginTop: 10, alignItems: "center" }} wrap={false}>
                {vm.company.signatureData && (
                  <Image
                    src={vm.company.signatureData}
                    style={{ width: 92, height: 36, objectFit: "contain" }}
                  />
                )}
                {vm.company.signatureName && (
                  <Text style={[styles.strong, { fontSize: 7 }]}>{vm.company.signatureName}</Text>
                )}
                {vm.company.signatureRole && (
                  <Text style={styles.micro}>{vm.company.signatureRole}</Text>
                )}
              </View>
            )}
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
