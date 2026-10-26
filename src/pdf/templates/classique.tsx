/* Modèle « Classique » — bandeau institutionnel, cadres nets, mentions complètes. */

import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { PdfViewModel } from "../view-model";
import { CompanyLogo } from "../company-logo";

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 42,
    paddingHorizontal: 0,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1A1815",
  },
  band: { paddingVertical: 12, paddingHorizontal: 36, flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 44, height: 44, objectFit: "contain" },
  bandName: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },
  bandSub: { fontSize: 8, color: "#FFFFFF", opacity: 0.85, marginTop: 1.5 },

  body: { paddingHorizontal: 36, paddingTop: 14 },

  topRow: { flexDirection: "row", justifyContent: "space-between", gap: 20 },
  block: { flex: 1 },
  blockTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.6,
    color: "#6B655C",
    marginBottom: 4,
  },
  strong: { fontFamily: "Helvetica-Bold" },
  line: { marginBottom: 1, lineHeight: 1.25 },
  muted: { color: "#6B655C" },

  titleBox: {
    borderWidth: 1,
    borderStyle: "solid",
    padding: 9,
    minWidth: 205,
  },
  docTitle: { fontSize: 15.5, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  docNumber: { fontSize: 10.5, fontFamily: "Helvetica-Bold", marginTop: 1.5 },
  dateRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 3 },

  rightColumn: { width: 250 },
  clientBox: {
    marginTop: 8,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#E3E0D9",
    padding: 9,
  },

  subjectRow: { marginTop: 10, flexDirection: "row", gap: 6, flexWrap: "wrap" },

  table: { marginTop: 9, borderWidth: 1, borderStyle: "solid", borderColor: "#E3E0D9" },
  thead: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8 },
  th: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#FFFFFF", letterSpacing: 0.4 },
  tr: {
    flexDirection: "row",
    paddingVertical: 4.5,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderStyle: "solid",
    borderColor: "#EDEAE4",
  },
  sectionRow: { paddingVertical: 4.5, paddingHorizontal: 8, backgroundColor: "#F4F2EE", borderTopWidth: 1, borderStyle: "solid", borderColor: "#EDEAE4" },
  cDesc: { flex: 1, paddingRight: 8 },
  cQty: { width: 52, textAlign: "right" },
  cUnit: { width: 46, textAlign: "left", paddingLeft: 6 },
  cPrice: { width: 76, textAlign: "right" },
  cVat: { width: 42, textAlign: "right" },
  cTotal: { width: 82, textAlign: "right" },
  desc: { fontSize: 8, color: "#6B655C", marginTop: 1.5, lineHeight: 1.25 },

  bottom: { flexDirection: "row", gap: 16, marginTop: 10, alignItems: "flex-start" },
  bottomLeft: { flex: 1 },
  totalsBox: { width: 250 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalRowStrong: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderTopWidth: 1,
    borderStyle: "solid",
    borderColor: "#E3E0D9",
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6.5,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  grandLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },
  grandValue: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },

  words: {
    marginTop: 9,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#F4F2EE",
    borderLeftWidth: 3,
    borderStyle: "solid",
  },

  panel: {
    marginTop: 8,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#E3E0D9",
    padding: 8,
  },
  /** Même cadre, mais aligné en haut de la colonne des totaux. */
  panelFlush: {
    marginTop: 0,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#E3E0D9",
    padding: 8,
  },
  panelTitle: { fontSize: 7.5, fontFamily: "Helvetica-Bold", letterSpacing: 0.6, marginBottom: 4 },
  bankRow: { flexDirection: "row", marginBottom: 1 },
  bankLabel: { width: 92, color: "#6B655C" },

  legal: { marginTop: 7, fontSize: 7.5, color: "#6B655C", lineHeight: 1.3 },

  signature: { marginTop: 12, alignItems: "flex-end" },
  signatureImg: { width: 104, height: 42, objectFit: "contain" },
  stampImg: { width: 78, height: 78, objectFit: "contain", opacity: 0.9 },

  footer: {
    position: "absolute",
    bottom: 16,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderStyle: "solid",
    borderColor: "#E3E0D9",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: "#969086",
  },
  draft: {
    position: "absolute",
    top: 300,
    left: 120,
    fontSize: 66,
    color: "#1A1815",
    opacity: 0.06,
    fontFamily: "Helvetica-Bold",
    transform: "rotate(-24deg)",
  },
});

export function ClassiqueTemplate({ vm }: { vm: PdfViewModel }) {
  const accent = vm.accent;

  return (
    <Document
      title={`${vm.title} ${vm.number}`}
      author={vm.company.name}
      subject={vm.subject ?? undefined}
    >
      <Page size="A4" style={styles.page} wrap>
        {vm.isDraft && <Text style={styles.draft} fixed>BROUILLON</Text>}

        {/* Bandeau d'en-tête */}
        <View style={[styles.band, { backgroundColor: accent }]} fixed>
          <CompanyLogo vm={vm} accent={vm.accent} size={44} style={styles.logo} />
          <View>
            <Text style={styles.bandName}>{vm.company.tradeName || vm.company.name}</Text>
            {vm.company.tagline && (
              <Text style={styles.bandSub}>{vm.company.tagline}</Text>
            )}
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.topRow}>
            {/* Émetteur */}
            <View style={styles.block}>
              <Text style={styles.blockTitle}>ÉMETTEUR</Text>
              <Text style={[styles.line, styles.strong]}>
                {vm.company.name}
                {vm.company.legalForm ? ` — ${vm.company.legalForm}` : ""}
              </Text>
              {vm.company.addressLines.map((row, index) => (
                <Text key={index} style={styles.line}>
                  {row}
                </Text>
              ))}
              {vm.company.phone && <Text style={styles.line}>Tél. : {vm.company.phone}</Text>}
              {vm.company.mobile && <Text style={styles.line}>Mobile : {vm.company.mobile}</Text>}
              {vm.company.email && <Text style={styles.line}>{vm.company.email}</Text>}
              {vm.company.website && <Text style={styles.line}>{vm.company.website}</Text>}

              {vm.company.identifiers.length > 0 && (
                <View style={{ marginTop: 6 }}>
                  {vm.company.identifiers.map((identifier) => (
                    <Text key={identifier.label} style={[styles.line, styles.muted]}>
                      <Text style={styles.strong}>{identifier.label}</Text> : {identifier.value}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            {/* Colonne de droite : cartouche du document, puis destinataire.
                Les empiler libère toute une rangée de hauteur. */}
            <View style={styles.rightColumn}>
              <View style={[styles.titleBox, { borderColor: accent }]}>
                <Text style={[styles.docTitle, { color: accent }]}>{vm.title}</Text>
                <Text style={styles.docNumber}>N° {vm.number}</Text>
                <View style={{ marginTop: 6 }}>
                  {vm.dates.map((date) => (
                    <View key={date.label} style={styles.dateRow}>
                      <Text style={styles.muted}>{date.label}</Text>
                      <Text style={styles.strong}>{date.value}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Destinataire */}
              <View style={styles.clientBox}>
            <Text style={[styles.blockTitle, { color: accent }]}>
              {vm.endClient ? "FACTURÉ À (AGENCE)" : "FACTURÉ À"}
            </Text>
            <Text style={[styles.line, styles.strong]}>{vm.billTo.displayName}</Text>
            {vm.billTo.legalLine && <Text style={styles.line}>{vm.billTo.legalLine}</Text>}
            {vm.contactName && <Text style={styles.line}>À l&apos;attention de {vm.contactName}</Text>}
            {vm.billTo.addressLines.map((row, index) => (
              <Text key={index} style={styles.line}>
                {row}
              </Text>
            ))}
            {vm.billTo.email && <Text style={styles.line}>{vm.billTo.email}</Text>}
            {vm.billTo.identifiers.map((identifier) => (
              <Text key={identifier.label} style={[styles.line, styles.muted]}>
                {identifier.label} : {identifier.value}
              </Text>
            ))}

                {vm.endClient && (
                  <View style={{ marginTop: 8, borderTopWidth: 1, borderStyle: "solid", borderColor: "#E3E0D9", paddingTop: 6 }}>
                    <Text style={styles.blockTitle}>POUR LE COMPTE DE</Text>
                    <Text style={[styles.line, styles.strong]}>{vm.endClient.name}</Text>
                    {vm.endClient.addressLines.slice(0, 2).map((row, index) => (
                      <Text key={index} style={styles.line}>
                        {row}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Objet */}
          {(vm.subject || vm.purchaseOrder || vm.missionTitle) && (
            <View style={styles.subjectRow}>
              {vm.subject && (
                <Text>
                  <Text style={styles.strong}>Objet : </Text>
                  {vm.subject}
                </Text>
              )}
              {vm.purchaseOrder && (
                <Text style={styles.muted}>
                  <Text style={styles.strong}>Bon de commande : </Text>
                  {vm.purchaseOrder}
                </Text>
              )}
            </View>
          )}

          {/* Tableau des prestations */}
          <View style={styles.table}>
            {/* `fixed` répète la ligne de titres en haut de chaque page. */}
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
                  <View key={index} style={styles.sectionRow} wrap={false}>
                    <Text style={[styles.strong, { color: accent }]}>{line.label}</Text>
                  </View>
                );
              }
              if (line.kind === "TEXT") {
                return (
                  <View key={index} style={styles.tr} wrap={false}>
                    <View style={styles.cDesc}>
                      <Text>{line.label}</Text>
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
                    {line.discount && (
                      <Text style={styles.desc}>Remise appliquée : {line.discount}</Text>
                    )}
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

          {/* Totaux */}
          <View style={styles.bottom} wrap={false}>
            {/* Colonne de gauche : les coordonnées de paiement, plutôt que du
                blanc perdu sous le tableau. */}
            <View style={styles.bottomLeft}>
              {vm.bank && (
                <View style={styles.panelFlush}>
                  <Text style={[styles.panelTitle, { color: accent }]}>
                    COORDONNÉES DE PAIEMENT — {vm.bank.kindLabel.toUpperCase()}
                  </Text>
                  {vm.bank.rows.map((row) => (
                    <View key={row.label} style={styles.bankRow}>
                      <Text style={styles.bankLabel}>{row.label}</Text>
                      <Text style={styles.strong}>{row.value}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Conditions et mentions légales : elles tiennent dans la même
                  colonne, en regard des totaux, plutôt que de pousser la
                  facture sur une seconde page. */}
              {(vm.notes || vm.terms) && (
                <View style={styles.panel}>
                  {vm.notes && <Text style={{ lineHeight: 1.35 }}>{vm.notes}</Text>}
                  {vm.terms && (
                    <Text style={[{ lineHeight: 1.35 }, vm.notes ? { marginTop: 5 } : {}]}>
                      {vm.terms}
                    </Text>
                  )}
                </View>
              )}

              {vm.legalNotes.length > 0 && (
                <View style={styles.legal}>
                  {vm.legalNotes.map((note, index) => (
                    <Text key={index}>{note}</Text>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.totalsBox}>
              {vm.totals.map((row, index) => (
                <View key={index} style={row.emphasis ? styles.totalRowStrong : styles.totalRow}>
                  <Text style={row.emphasis ? styles.strong : styles.muted}>{row.label}</Text>
                  <Text style={row.emphasis ? styles.strong : undefined}>{row.value}</Text>
                </View>
              ))}

              <View style={[styles.grandTotal, { backgroundColor: accent }]}>
                <Text style={styles.grandLabel}>{vm.grandTotalLabel}</Text>
                <Text style={styles.grandValue}>{vm.grandTotalValue}</Text>
              </View>

              {vm.paidSummary?.map((row) => (
                <View key={row.label} style={styles.totalRow}>
                  <Text style={styles.muted}>{row.label}</Text>
                  <Text style={styles.strong}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Montant en toutes lettres */}
          {vm.amountInWords && (
            <View style={[styles.words, { borderColor: accent }]}>
              <Text>
                <Text style={styles.strong}>
                  Arrêtée la présente {vm.title.toLowerCase()} à la somme de :{" "}
                </Text>
                {vm.amountInWords}.
              </Text>
            </View>
          )}

          {/* Signature et cachet */}
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
                  {vm.company.signatureRole && (
                    <Text style={styles.muted}>{vm.company.signatureRole}</Text>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text>{vm.footer || vm.company.name}</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
