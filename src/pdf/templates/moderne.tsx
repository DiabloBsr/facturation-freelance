/* Modèle « Moderne » — colonne latérale colorée, grands titres, tableau aéré. */

import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { PdfViewModel } from "../view-model";
import { CompanyLogo } from "../company-logo";

const SIDEBAR = 168;

const styles = StyleSheet.create({
  page: { fontSize: 9, fontFamily: "Helvetica", color: "#1A1815", flexDirection: "row" },

  sidebar: { width: SIDEBAR, paddingTop: 34, paddingHorizontal: 20, paddingBottom: 30, height: "100%" },
  logo: { width: 62, height: 62, objectFit: "contain", marginBottom: 14 },
  sideName: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#FFFFFF", lineHeight: 1.25 },
  sideTag: { fontSize: 8, color: "#FFFFFF", opacity: 0.8, marginTop: 3, lineHeight: 1.35 },
  sideTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
    color: "#FFFFFF",
    opacity: 0.7,
    marginTop: 18,
    marginBottom: 5,
  },
  sideText: { fontSize: 8, color: "#FFFFFF", opacity: 0.92, lineHeight: 1.45 },
  sideStrong: { fontSize: 8, color: "#FFFFFF", fontFamily: "Helvetica-Bold", lineHeight: 1.45 },

  main: { flex: 1, paddingTop: 34, paddingHorizontal: 28, paddingBottom: 52 },

  docTitle: { fontSize: 26, fontFamily: "Helvetica-Bold", letterSpacing: -0.4 },
  docNumber: { fontSize: 10, color: "#6B655C", marginTop: 2 },

  headRow: { flexDirection: "row", justifyContent: "space-between", gap: 18, marginTop: 20 },
  label: { fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 0.7, color: "#969086" },
  strong: { fontFamily: "Helvetica-Bold" },
  muted: { color: "#6B655C" },
  line: { marginBottom: 1.5, lineHeight: 1.4 },

  dates: { minWidth: 150 },
  dateRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },

  subject: { marginTop: 18, fontSize: 11, fontFamily: "Helvetica-Bold", lineHeight: 1.35 },

  thead: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderStyle: "solid",
    paddingBottom: 6,
    marginTop: 18,
  },
  th: { fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 0.6 },
  tr: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderStyle: "solid",
    borderColor: "#EDEAE4",
  },
  cDesc: { flex: 1, paddingRight: 10 },
  cQty: { width: 56, textAlign: "right" },
  cPrice: { width: 80, textAlign: "right" },
  cVat: { width: 40, textAlign: "right" },
  cTotal: { width: 84, textAlign: "right" },
  desc: { fontSize: 8, color: "#6B655C", marginTop: 2.5, lineHeight: 1.4 },
  section: { paddingTop: 12, paddingBottom: 4 },

  totals: { marginTop: 16, marginLeft: "auto", width: 240 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3.5 },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 2,
    borderStyle: "solid",
  },
  grandLabel: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  grandValue: { fontSize: 15, fontFamily: "Helvetica-Bold" },

  words: { marginTop: 18, fontSize: 8.5, lineHeight: 1.5, color: "#3A352E" },

  notes: { marginTop: 16, fontSize: 8.5, lineHeight: 1.5, color: "#3A352E" },
  legal: { marginTop: 12, fontSize: 7.5, color: "#969086", lineHeight: 1.45 },

  signature: { marginTop: 22, flexDirection: "row", justifyContent: "flex-end", gap: 14, alignItems: "flex-end" },
  signatureImg: { width: 110, height: 44, objectFit: "contain" },
  stampImg: { width: 84, height: 84, objectFit: "contain" },

  footer: {
    position: "absolute",
    bottom: 20,
    left: SIDEBAR + 28,
    right: 28,
    fontSize: 7.5,
    color: "#969086",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  draft: {
    position: "absolute",
    top: 320,
    left: 60,
    fontSize: 60,
    opacity: 0.06,
    fontFamily: "Helvetica-Bold",
    transform: "rotate(-24deg)",
  },
});

export function ModerneTemplate({ vm }: { vm: PdfViewModel }) {
  const accent = vm.accent;

  return (
    <Document title={`${vm.title} ${vm.number}`} author={vm.company.name}>
      <Page size="A4" style={styles.page} wrap>
        {/* Colonne latérale : identité, identifiants, RIB */}
        <View style={[styles.sidebar, { backgroundColor: accent }]} fixed>
          <CompanyLogo vm={vm} accent={vm.accent} size={62} style={styles.logo} />
          <Text style={styles.sideName}>{vm.company.tradeName || vm.company.name}</Text>
          {vm.company.tagline && (
            <Text style={styles.sideTag}>{vm.company.tagline}</Text>
          )}

          <Text style={styles.sideTitle}>COORDONNÉES</Text>
          {vm.company.addressLines.map((row, index) => (
            <Text key={index} style={styles.sideText}>
              {row}
            </Text>
          ))}
          {vm.company.phone && <Text style={styles.sideText}>Tél. {vm.company.phone}</Text>}
          {vm.company.mobile && <Text style={styles.sideText}>Mob. {vm.company.mobile}</Text>}
          {vm.company.email && <Text style={styles.sideText}>{vm.company.email}</Text>}
          {vm.company.website && <Text style={styles.sideText}>{vm.company.website}</Text>}

          {vm.company.identifiers.length > 0 && (
            <>
              <Text style={styles.sideTitle}>IDENTIFIANTS</Text>
              {vm.company.identifiers.map((identifier) => (
                <Text key={identifier.label} style={styles.sideText}>
                  <Text style={styles.sideStrong}>{identifier.label}</Text> {identifier.value}
                </Text>
              ))}
            </>
          )}

          {vm.bank && (
            <>
              <Text style={styles.sideTitle}>{vm.bank.kindLabel.toUpperCase()}</Text>
              {vm.bank.rows.map((row) => (
                <Text key={row.label} style={styles.sideText}>
                  <Text style={styles.sideStrong}>{row.label}</Text>
                  {"\n"}
                  {row.value}
                </Text>
              ))}
            </>
          )}
        </View>

        {/* Contenu */}
        <View style={styles.main}>
          {vm.isDraft && <Text style={[styles.draft, { color: accent }]}>BROUILLON</Text>}

          <Text style={[styles.docTitle, { color: accent }]}>{vm.title}</Text>
          <Text style={styles.docNumber}>N° {vm.number}</Text>

          <View style={styles.headRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>
                {vm.endClient ? "FACTURÉ À (AGENCE)" : "FACTURÉ À"}
              </Text>
              <Text style={[styles.line, styles.strong, { marginTop: 4, fontSize: 10 }]}>
                {vm.billTo.displayName}
              </Text>
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
                  Pour le compte de{" "}
                  <Text style={styles.strong}>{vm.endClient.name}</Text>
                </Text>
              )}
            </View>

            <View style={styles.dates}>
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
            Conteneur du tableau : `fixed` ne répète alors la ligne de titres
            que sur les pages qu'occupe réellement le tableau.
          */}
          <View>
          <View style={[styles.thead, { borderColor: accent }]} fixed>
            <Text style={[styles.th, styles.cDesc, { color: accent }]}>DÉSIGNATION</Text>
            <Text style={[styles.th, styles.cQty, { color: accent }]}>QTÉ</Text>
            <Text style={[styles.th, styles.cPrice, { color: accent }]}>PRIX UNIT.</Text>
            {vm.showVatColumn && (
              <Text style={[styles.th, styles.cVat, { color: accent }]}>TVA</Text>
            )}
            <Text style={[styles.th, styles.cTotal, { color: accent }]}>TOTAL</Text>
          </View>

          {vm.lines.map((line, index) => {
            if (line.kind === "SECTION") {
              return (
                <View key={index} style={styles.section} wrap={false}>
                  <Text style={[styles.strong, { color: accent, fontSize: 10 }]}>{line.label}</Text>
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
                  <Text style={styles.strong}>{line.label}</Text>
                  {line.description && <Text style={styles.desc}>{line.description}</Text>}
                  {line.discount && <Text style={styles.desc}>Remise : {line.discount}</Text>}
                </View>
                <Text style={styles.cQty}>
                  {line.quantity} {line.unit}
                </Text>
                <Text style={styles.cPrice}>{line.unitPrice}</Text>
                {vm.showVatColumn && <Text style={styles.cVat}>{line.vatRate}</Text>}
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

            <View style={[styles.grand, { borderColor: accent }]}>
              <Text style={[styles.grandLabel, { color: accent }]}>{vm.grandTotalLabel}</Text>
              <Text style={[styles.grandValue, { color: accent }]}>{vm.grandTotalValue}</Text>
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
              <Text style={styles.strong}>
                Arrêtée la présente {vm.title.toLowerCase()} à la somme de :{" "}
              </Text>
              {vm.amountInWords}.
            </Text>
          )}

          {(vm.notes || vm.terms) && (
            <View style={styles.notes}>
              {vm.notes && <Text>{vm.notes}</Text>}
              {vm.terms && <Text style={vm.notes ? { marginTop: 6 } : undefined}>{vm.terms}</Text>}
            </View>
          )}

          {vm.legalNotes.length > 0 && (
            <View style={styles.legal}>
              {vm.legalNotes.map((note, index) => (
                <Text key={index}>{note}</Text>
              ))}
            </View>
          )}

          {(vm.company.signatureData || vm.company.stampData || vm.company.signatureName) && (
            <View style={styles.signature} wrap={false}>
              {vm.company.stampData && <Image src={vm.company.stampData} style={styles.stampImg} />}
              <View style={{ alignItems: "center" }}>
                {vm.company.signatureData && (
                  <Image src={vm.company.signatureData} style={styles.signatureImg} />
                )}
                {vm.company.signatureName && (
                  <Text style={styles.strong}>{vm.company.signatureName}</Text>
                )}
                {vm.company.signatureRole && (
                  <Text style={styles.muted}>{vm.company.signatureRole}</Text>
                )}
              </View>
            </View>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text>{vm.footer || vm.company.name}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
