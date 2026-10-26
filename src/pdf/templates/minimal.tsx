/* Modèle « Minimal » — noir et blanc, filets fins, respiration maximale. */

import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { PdfViewModel } from "../view-model";
import { CompanyLogo } from "../company-logo";

const INK = "#111111";
const GREY = "#666666";
const RULE = "#DDDDDD";

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 42,
    paddingHorizontal: 44,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: INK,
  },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { width: 38, height: 38, objectFit: "contain", marginBottom: 5 },
  name: { fontSize: 10.5, fontFamily: "Helvetica-Bold" },
  line: { marginBottom: 1, lineHeight: 1.3, color: GREY },
  strong: { fontFamily: "Helvetica-Bold", color: INK },

  docTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", letterSpacing: 2, textAlign: "right" },
  docNumber: { fontSize: 9, color: GREY, textAlign: "right", marginTop: 2 },

  rule: { borderBottomWidth: 1, borderStyle: "solid", borderColor: RULE, marginVertical: 12 },
  ruleTight: { borderBottomWidth: 1, borderStyle: "solid", borderColor: RULE, marginVertical: 9 },

  cols: { flexDirection: "row", gap: 26 },
  col: { flex: 1 },
  label: { fontSize: 7, letterSpacing: 1, color: GREY, marginBottom: 4 },

  dateRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },

  subject: { marginTop: 12, fontSize: 10, fontFamily: "Helvetica-Bold" },

  thead: { flexDirection: "row", marginTop: 12, paddingBottom: 5 },
  th: { fontSize: 7, letterSpacing: 1, color: GREY },
  tr: { flexDirection: "row", paddingVertical: 5.5 },
  hair: { borderBottomWidth: 0.5, borderStyle: "solid", borderColor: RULE },
  cDesc: { flex: 1, paddingRight: 12 },
  cQty: { width: 64, textAlign: "right" },
  cPrice: { width: 82, textAlign: "right" },
  cTotal: { width: 88, textAlign: "right" },
  desc: { fontSize: 8, color: GREY, marginTop: 1.5, lineHeight: 1.3 },

  totals: { marginTop: 12, marginLeft: "auto", width: 232 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 7,
    paddingTop: 7,
    borderTopWidth: 1,
    borderStyle: "solid",
    borderColor: INK,
  },
  grandLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },
  grandValue: { fontSize: 13, fontFamily: "Helvetica-Bold" },

  block: { marginTop: 11 },
  small: { fontSize: 8, color: GREY, lineHeight: 1.35 },

  bankRow: { flexDirection: "row", marginBottom: 1 },
  bankLabel: { width: 96, color: GREY, fontSize: 8 },

  signature: { marginTop: 14, alignItems: "flex-end" },
  signatureImg: { width: 100, height: 40, objectFit: "contain" },
  stampImg: { width: 72, height: 72, objectFit: "contain" },

  footer: {
    position: "absolute",
    bottom: 18,
    left: 44,
    right: 44,
    fontSize: 7.5,
    color: GREY,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderStyle: "solid",
    borderColor: RULE,
    paddingTop: 6,
  },
});

export function MinimalTemplate({ vm }: { vm: PdfViewModel }) {
  return (
    <Document title={`${vm.title} ${vm.number}`} author={vm.company.name}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.head}>
          <View style={{ maxWidth: 260 }}>
            <CompanyLogo vm={vm} accent={vm.accent} size={38} style={styles.logo} />
            <Text style={styles.name}>{vm.company.tradeName || vm.company.name}</Text>
            {vm.company.addressLines.map((row, index) => (
              <Text key={index} style={styles.line}>
                {row}
              </Text>
            ))}
            {vm.company.email && <Text style={styles.line}>{vm.company.email}</Text>}
            {vm.company.phone && <Text style={styles.line}>{vm.company.phone}</Text>}
          </View>

          <View>
            <Text style={styles.docTitle}>{vm.title}</Text>
            <Text style={styles.docNumber}>{vm.number}</Text>
          </View>
        </View>

        <View style={styles.rule} />

        <View style={styles.cols}>
          <View style={styles.col}>
            <Text style={styles.label}>{vm.endClient ? "AGENCE" : "CLIENT"}</Text>
            <Text style={[styles.strong, { marginBottom: 2 }]}>{vm.billTo.displayName}</Text>
            {vm.billTo.legalLine && <Text style={styles.line}>{vm.billTo.legalLine}</Text>}
            {vm.contactName && <Text style={styles.line}>{vm.contactName}</Text>}
            {vm.billTo.addressLines.map((row, index) => (
              <Text key={index} style={styles.line}>
                {row}
              </Text>
            ))}
            {vm.billTo.identifiers.map((identifier) => (
              <Text key={identifier.label} style={styles.line}>
                {identifier.label} {identifier.value}
              </Text>
            ))}
            {vm.endClient && (
              <Text style={[styles.line, { marginTop: 5 }]}>
                Pour le compte de <Text style={styles.strong}>{vm.endClient.name}</Text>
              </Text>
            )}
          </View>

          <View style={{ width: 190 }}>
            {vm.dates.map((date) => (
              <View key={date.label} style={styles.dateRow}>
                <Text style={{ color: GREY }}>{date.label}</Text>
                <Text style={styles.strong}>{date.value}</Text>
              </View>
            ))}
            {vm.purchaseOrder && (
              <View style={styles.dateRow}>
                <Text style={{ color: GREY }}>Bon de commande</Text>
                <Text style={styles.strong}>{vm.purchaseOrder}</Text>
              </View>
            )}
          </View>
        </View>

        {vm.subject && <Text style={styles.subject}>{vm.subject}</Text>}

        {/*
          Conteneur du tableau : `fixed` ne répète alors la ligne de titres que
          sur les pages qu'occupe réellement le tableau.
        */}
        <View>
        <View style={[styles.thead, styles.hair]} fixed>
          <Text style={[styles.th, styles.cDesc]}>DÉSIGNATION</Text>
          <Text style={[styles.th, styles.cQty]}>QUANTITÉ</Text>
          <Text style={[styles.th, styles.cPrice]}>PRIX</Text>
          <Text style={[styles.th, styles.cTotal]}>TOTAL</Text>
        </View>

        {vm.lines.map((line, index) => {
          if (line.kind === "SECTION") {
            return (
              <View key={index} style={{ paddingTop: 14, paddingBottom: 2 }} wrap={false}>
                <Text style={[styles.strong, { letterSpacing: 0.8, fontSize: 8.5 }]}>
                  {line.label.toUpperCase()}
                </Text>
              </View>
            );
          }
          if (line.kind === "TEXT") {
            return (
              <View key={index} style={[styles.tr, styles.hair]} wrap={false}>
                <View style={styles.cDesc}>
                  <Text style={{ color: GREY }}>{line.label}</Text>
                  {line.description && <Text style={styles.desc}>{line.description}</Text>}
                </View>
              </View>
            );
          }
          return (
            <View key={index} style={[styles.tr, styles.hair]} wrap={false}>
              <View style={styles.cDesc}>
                <Text>{line.label}</Text>
                {line.description && <Text style={styles.desc}>{line.description}</Text>}
                {line.discount && <Text style={styles.desc}>Remise {line.discount}</Text>}
                {vm.showVatColumn && <Text style={styles.desc}>TVA {line.vatRate}</Text>}
              </View>
              <Text style={styles.cQty}>
                {line.quantity} {line.unit}
              </Text>
              <Text style={styles.cPrice}>{line.unitPrice}</Text>
              <Text style={[styles.cTotal, styles.strong]}>{line.total}</Text>
            </View>
          );
        })}
        </View>

        <View style={styles.totals} wrap={false}>
          {vm.totals.map((row, index) => (
            <View key={index} style={styles.totalRow}>
              <Text style={row.emphasis ? styles.strong : { color: GREY }}>{row.label}</Text>
              <Text style={row.emphasis ? styles.strong : undefined}>{row.value}</Text>
            </View>
          ))}

          <View style={styles.grand}>
            <Text style={styles.grandLabel}>{vm.grandTotalLabel.toUpperCase()}</Text>
            <Text style={styles.grandValue}>{vm.grandTotalValue}</Text>
          </View>

          {vm.paidSummary?.map((row) => (
            <View key={row.label} style={styles.totalRow}>
              <Text style={{ color: GREY }}>{row.label}</Text>
              <Text style={styles.strong}>{row.value}</Text>
            </View>
          ))}
        </View>

        {vm.amountInWords && (
          <>
            <View style={styles.ruleTight} />
            <Text style={styles.small}>
              <Text style={styles.strong}>
                Arrêtée la présente {vm.title.toLowerCase()} à la somme de :{" "}
              </Text>
              {vm.amountInWords}.
            </Text>
          </>
        )}

        {vm.bank && (
          <View style={styles.block}>
            <Text style={styles.label}>{vm.bank.kindLabel.toUpperCase()}</Text>
            {vm.bank.rows.map((row) => (
              <View key={row.label} style={styles.bankRow}>
                <Text style={styles.bankLabel}>{row.label}</Text>
                <Text style={[styles.strong, { fontSize: 8 }]}>{row.value}</Text>
              </View>
            ))}
          </View>
        )}

        {(vm.notes || vm.terms) && (
          <View style={styles.block}>
            {vm.notes && <Text style={styles.small}>{vm.notes}</Text>}
            {vm.terms && (
              <Text style={[styles.small, vm.notes ? { marginTop: 6 } : {}]}>{vm.terms}</Text>
            )}
          </View>
        )}

        {(vm.company.identifiers.length > 0 || vm.legalNotes.length > 0) && (
          <View style={styles.block}>
            {vm.company.identifiers.length > 0 && (
              <Text style={styles.small}>
                {vm.company.identifiers
                  .map((identifier) => `${identifier.label} ${identifier.value}`)
                  .join("  ·  ")}
              </Text>
            )}
            {vm.legalNotes.map((note, index) => (
              <Text key={index} style={styles.small}>
                {note}
              </Text>
            ))}
          </View>
        )}

        {(vm.company.signatureData || vm.company.stampData || vm.company.signatureName) && (
          <View style={styles.signature} wrap={false}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
              {vm.company.stampData && <Image src={vm.company.stampData} style={styles.stampImg} />}
              <View style={{ alignItems: "center" }}>
                {vm.company.signatureData && (
                  <Image src={vm.company.signatureData} style={styles.signatureImg} />
                )}
                {vm.company.signatureName && (
                  <Text style={[styles.strong, { fontSize: 8 }]}>{vm.company.signatureName}</Text>
                )}
                {vm.company.signatureRole && (
                  <Text style={styles.small}>{vm.company.signatureRole}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>{vm.footer || vm.company.name}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
