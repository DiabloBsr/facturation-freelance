/* Modèle « Élégant » — typographie à empattements, capitales espacées, totaux mis en valeur. */

import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { PdfViewModel } from "../view-model";
import { CompanyLogo } from "../company-logo";

const INK = "#1C1A17";
const GREY = "#7A736A";
const RULE = "#D9D4CB";

// Rythme vertical resserré : une facture courante doit tenir sur une page.
const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 44,
    fontSize: 9,
    fontFamily: "Times-Roman",
    color: INK,
  },
  center: { alignItems: "center" },
  logo: { width: 46, height: 46, objectFit: "contain", marginBottom: 6 },
  name: { fontSize: 13, fontFamily: "Times-Bold", letterSpacing: 1.2, textAlign: "center" },
  tagline: { fontSize: 8, color: GREY, letterSpacing: 0.9, marginTop: 2, textAlign: "center" },
  contact: { fontSize: 7.5, color: GREY, marginTop: 4, textAlign: "center", lineHeight: 1.35 },

  divider: { borderBottomWidth: 0.75, borderStyle: "solid", borderColor: RULE, marginVertical: 11 },
  dividerThin: { borderBottomWidth: 0.5, borderStyle: "solid", borderColor: RULE, marginVertical: 9 },

  title: { fontSize: 12.5, fontFamily: "Times-Bold", letterSpacing: 4, textAlign: "center" },
  number: { fontSize: 8.5, color: GREY, letterSpacing: 1.3, textAlign: "center", marginTop: 2 },

  cols: { flexDirection: "row", justifyContent: "space-between", gap: 24, marginTop: 13 },
  label: { fontSize: 7, letterSpacing: 1.5, color: GREY, marginBottom: 4 },
  strong: { fontFamily: "Times-Bold" },
  line: { marginBottom: 1, lineHeight: 1.3 },
  muted: { color: GREY },

  dateRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2, minWidth: 175 },

  subject: { marginTop: 13, textAlign: "center", fontSize: 10, fontFamily: "Times-Italic" },

  thead: {
    flexDirection: "row",
    borderTopWidth: 0.75,
    borderBottomWidth: 0.75,
    borderStyle: "solid",
    borderColor: RULE,
    paddingVertical: 5,
    marginTop: 12,
  },
  th: { fontSize: 7, letterSpacing: 1.3, color: GREY },
  tr: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 0.4,
    borderStyle: "solid",
    borderColor: "#EBE7E0",
  },
  cDesc: { flex: 1, paddingRight: 12 },
  cQty: { width: 66, textAlign: "right" },
  cPrice: { width: 84, textAlign: "right" },
  cTotal: { width: 90, textAlign: "right" },
  desc: { fontSize: 8, color: GREY, marginTop: 1.5, lineHeight: 1.3, fontFamily: "Times-Italic" },

  totals: { marginTop: 11, marginLeft: "auto", width: 250 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 7,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  grandLabel: { fontSize: 9, fontFamily: "Times-Bold", letterSpacing: 1.5, color: "#FFFFFF" },
  grandValue: { fontSize: 12.5, fontFamily: "Times-Bold", color: "#FFFFFF" },

  words: { marginTop: 11, fontSize: 8.5, fontFamily: "Times-Italic", lineHeight: 1.35, textAlign: "center" },

  panel: { marginTop: 10 },
  bankRow: { flexDirection: "row", marginBottom: 1 },
  bankLabel: { width: 96, color: GREY, fontSize: 8 },
  small: { fontSize: 8, color: GREY, lineHeight: 1.35 },

  signature: { marginTop: 14, alignItems: "flex-end" },
  signatureImg: { width: 104, height: 40, objectFit: "contain" },
  stampImg: { width: 74, height: 74, objectFit: "contain" },

  footer: {
    position: "absolute",
    bottom: 18,
    left: 44,
    right: 44,
    fontSize: 7.5,
    color: GREY,
    textAlign: "center",
    letterSpacing: 0.6,
  },
});

export function ElegantTemplate({ vm }: { vm: PdfViewModel }) {
  const accent = vm.accent;

  return (
    <Document title={`${vm.title} ${vm.number}`} author={vm.company.name}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.center}>
          <CompanyLogo vm={vm} accent={vm.accent} size={46} style={styles.logo} />
          <Text style={styles.name}>
            {(vm.company.tradeName || vm.company.name).toUpperCase()}
          </Text>
          {vm.company.tagline && (
            <Text style={styles.tagline}>{vm.company.tagline}</Text>
          )}
          <Text style={styles.contact}>
            {[
              vm.company.addressLines.join(" · "),
              vm.company.phone,
              vm.company.email,
              vm.company.website,
            ]
              .filter(Boolean)
              .join("  ·  ")}
          </Text>
          {vm.company.identifiers.length > 0 && (
            <Text style={styles.contact}>
              {vm.company.identifiers
                .map((identifier) => `${identifier.label} ${identifier.value}`)
                .join("  ·  ")}
            </Text>
          )}
        </View>

        <View style={styles.divider} />

        <Text style={[styles.title, { color: accent }]}>{vm.title}</Text>
        <Text style={styles.number}>N° {vm.number}</Text>

        <View style={styles.cols}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{vm.endClient ? "AGENCE" : "DESTINATAIRE"}</Text>
            <Text style={[styles.line, styles.strong]}>{vm.billTo.displayName}</Text>
            {vm.billTo.legalLine && <Text style={styles.line}>{vm.billTo.legalLine}</Text>}
            {vm.contactName && <Text style={styles.line}>{vm.contactName}</Text>}
            {vm.billTo.addressLines.map((row, index) => (
              <Text key={index} style={styles.line}>
                {row}
              </Text>
            ))}
            {vm.billTo.identifiers.map((identifier) => (
              <Text key={identifier.label} style={[styles.line, styles.muted]}>
                {identifier.label} : {identifier.value}
              </Text>
            ))}
            {vm.endClient && (
              <Text style={[styles.line, styles.muted, { marginTop: 5 }]}>
                Pour le compte de <Text style={styles.strong}>{vm.endClient.name}</Text>
              </Text>
            )}
          </View>

          <View>
            {vm.dates.map((date) => (
              <View key={date.label} style={styles.dateRow}>
                <Text style={styles.muted}>{date.label}</Text>
                <Text style={styles.strong}>{date.value}</Text>
              </View>
            ))}
            {vm.purchaseOrder && (
              <View style={styles.dateRow}>
                <Text style={styles.muted}>Bon de commande</Text>
                <Text style={styles.strong}>{vm.purchaseOrder}</Text>
              </View>
            )}
          </View>
        </View>

        {vm.subject && <Text style={styles.subject}>{vm.subject}</Text>}

        {/*
          Le tableau est enfermé dans un conteneur : `fixed` ne répète alors
          la ligne de titres que sur les pages effectivement occupées par le
          tableau, et non sur celles qui ne portent plus que les totaux.
        */}
        <View>
        <View style={styles.thead} fixed>
          <Text style={[styles.th, styles.cDesc]}>DÉSIGNATION</Text>
          <Text style={[styles.th, styles.cQty]}>QUANTITÉ</Text>
          <Text style={[styles.th, styles.cPrice]}>PRIX UNITAIRE</Text>
          <Text style={[styles.th, styles.cTotal]}>MONTANT</Text>
        </View>

        {vm.lines.map((line, index) => {
          if (line.kind === "SECTION") {
            return (
              <View key={index} style={{ paddingTop: 14, paddingBottom: 3 }} wrap={false}>
                <Text style={[styles.strong, { letterSpacing: 1.4, fontSize: 8.5, color: accent }]}>
                  {line.label.toUpperCase()}
                </Text>
              </View>
            );
          }
          if (line.kind === "TEXT") {
            return (
              <View key={index} style={styles.tr} wrap={false}>
                <View style={styles.cDesc}>
                  <Text style={styles.muted}>{line.label}</Text>
                  {line.description && <Text style={styles.desc}>{line.description}</Text>}
                </View>
              </View>
            );
          }
          return (
            <View key={index} style={styles.tr} wrap={false}>
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
              <Text style={row.emphasis ? styles.strong : styles.muted}>{row.label}</Text>
              <Text style={row.emphasis ? styles.strong : undefined}>{row.value}</Text>
            </View>
          ))}

          <View style={[styles.grand, { backgroundColor: accent }]}>
            <Text style={styles.grandLabel}>{vm.grandTotalLabel.toUpperCase()}</Text>
            <Text style={styles.grandValue}>{vm.grandTotalValue}</Text>
          </View>

          {vm.paidSummary?.map((row) => (
            <View key={row.label} style={styles.totalRow}>
              <Text style={styles.muted}>{row.label}</Text>
              <Text style={styles.strong}>{row.value}</Text>
            </View>
          ))}
        </View>

        {vm.amountInWords && (
          <Text style={styles.words}>
            Arrêtée la présente {vm.title.toLowerCase()} à la somme de{" "}
            <Text style={styles.strong}>{vm.amountInWords}</Text>.
          </Text>
        )}

        <View style={styles.dividerThin} />

        {vm.bank && (
          // Les coordonnées de paiement ne doivent jamais être coupées en deux.
          <View style={styles.panel} wrap={false}>
            <Text style={styles.label}>{vm.bank.kindLabel.toUpperCase()}</Text>
            {vm.bank.rows.map((row) => (
              <View key={row.label} style={styles.bankRow}>
                <Text style={styles.bankLabel}>{row.label}</Text>
                <Text style={[styles.strong, { fontSize: 8.5 }]}>{row.value}</Text>
              </View>
            ))}
          </View>
        )}

        {(vm.notes || vm.terms) && (
          <View style={styles.panel}>
            {vm.notes && <Text style={styles.small}>{vm.notes}</Text>}
            {vm.terms && (
              <Text style={[styles.small, vm.notes ? { marginTop: 6 } : {}]}>{vm.terms}</Text>
            )}
          </View>
        )}

        {vm.legalNotes.length > 0 && (
          <View style={styles.panel}>
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
                  <Text style={styles.strong}>{vm.company.signatureName}</Text>
                )}
                {vm.company.signatureRole && <Text style={styles.small}>{vm.company.signatureRole}</Text>}
              </View>
            </View>
          </View>
        )}

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${vm.footer || vm.company.name}   ·   ${pageNumber} / ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}
