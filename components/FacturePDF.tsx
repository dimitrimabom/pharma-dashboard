'use client';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Styles PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1f2937',
    backgroundColor: '#ffffff'
  },
  header: {
    borderBottom: '2px solid #059669',
    paddingBottom: 15,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  logoIcon: {
    fontSize: 18,
    color: '#059669',
    marginRight: 6
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827'
  },
  invoiceTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
    textAlign: 'right'
  },
  invoiceSubtitle: {
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 2
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  col: {
    flex: 1,
    paddingRight: 10
  },
  colRight: {
    flex: 1,
    paddingLeft: 10,
    alignItems: 'flex-end'
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: 4,
    marginBottom: 6
  },
  infoText: {
    fontSize: 10,
    marginBottom: 3,
    color: '#374151'
  },
  infoTextBold: {
    fontWeight: 'bold',
    color: '#111827'
  },
  table: {
    marginTop: 10,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden'
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    fontWeight: 'bold',
    fontSize: 9,
    color: '#4b5563'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
    fontSize: 9
  },
  colDesc: { width: '45%', padding: 8 },
  colQty: { width: '15%', padding: 8, textAlign: 'center' },
  colPrice: { width: '20%', padding: 8, textAlign: 'right' },
  colTotal: { width: '20%', padding: 8, textAlign: 'right', fontWeight: 'bold' },
  
  totalsContainer: {
    marginTop: 20,
    alignSelf: 'flex-end',
    width: '45%'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    fontSize: 9
  },
  totalRowBold: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1.5,
    borderColor: '#059669',
    marginTop: 4,
    fontSize: 11,
    fontWeight: 'bold',
    color: '#059669'
  },
  totalLabel: {
    color: '#4b5563'
  },
  totalLabelBold: {
    fontWeight: 'bold'
  },
  totalVal: {
    fontWeight: 'bold',
    color: '#111827',
    fontFamily: 'Courier'
  },
  totalValBold: {
    color: '#059669',
    fontFamily: 'Courier'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
    paddingTop: 10,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 7,
    color: '#9ca3af',
    textAlign: 'center'
  }
});

interface FacturePDFProps {
  commandeId: number;
  creeLe: string;
  pharmacieNom: string;
  patientNom: string;
  patientTel: string;
}

// Fonction utilitaire pour générer des articles déterministes d'une commande
export function getCommandeItems(orderId: number) {
  const mod = orderId % 3;
  if (mod === 0) {
    return [
      { designation: "Doliprane 1000mg (Boîte)", quantite: 2, prixUnitaire: 1500 },
      { designation: "Paracétamol 500mg (Boîte)", quantite: 1, prixUnitaire: 1000 }
    ];
  } else if (mod === 1) {
    return [
      { designation: "Amoxicilline 500mg (Boîte)", quantite: 3, prixUnitaire: 2500 },
      { designation: "Vitamine C Orange (Tube)", quantite: 2, prixUnitaire: 1200 }
    ];
  } else {
    return [
      { designation: "Spasfon Lyoc 80mg (Boîte)", quantite: 2, prixUnitaire: 2200 },
      { designation: "Efferalgan Vitamine C (Tube)", quantite: 1, prixUnitaire: 1800 }
    ];
  }
}

export default function FacturePDF({
  commandeId,
  creeLe,
  pharmacieNom,
  patientNom,
  patientTel
}: FacturePDFProps) {
  const items = getCommandeItems(commandeId);
  
  // Calculs financiers
  const totalHT = items.reduce((sum, item) => sum + (item.quantite * item.prixUnitaire), 0);
  const tvaRate = 0.1925; // 19.25% TVA camerounaise
  const totalTVA = Math.round(totalHT * tvaRate);
  const totalTTC = totalHT + totalTVA;

  const dateFormatee = new Date(creeLe).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Document title={`Facture_CMD-${commandeId}`}>
      <Page size="A4" style={styles.page}>
        {/* EN-TÊTE */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>✚</Text>
            <Text style={styles.logoText}>PharmaGeo</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>BON DE COMMANDE</Text>
            <Text style={styles.invoiceSubtitle}>ID Commande: #CMD-{commandeId}</Text>
          </View>
        </View>

        {/* COORDONNÉES */}
        <View style={styles.grid}>
          {/* Émetteur (Pharmacie) */}
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Officine Emettrice</Text>
            <Text style={[styles.infoText, styles.infoTextBold]}>{pharmacieNom}</Text>
            <Text style={styles.infoText}>Réseau Partenaire PharmaGeo</Text>
            <Text style={styles.infoText}>Cameroun</Text>
          </View>

          {/* Destinataire (Patient) */}
          <View style={styles.colRight}>
            <Text style={styles.sectionTitle}>Destinataire (Patient)</Text>
            <Text style={[styles.infoText, styles.infoTextBold]}>{patientNom}</Text>
            <Text style={styles.infoText}>Téléphone: {patientTel || 'N/A'}</Text>
            <Text style={styles.infoText}>Date: {dateFormatee}</Text>
          </View>
        </View>

        {/* TABLEAU DES ARTICLES */}
        <View style={styles.table}>
          {/* En-tête */}
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>Désignation</Text>
            <Text style={styles.colQty}>Qté</Text>
            <Text style={styles.colPrice}>Prix Unitaire</Text>
            <Text style={styles.colTotal}>Total (FCFA)</Text>
          </View>
          
          {/* Lignes */}
          {items.map((item, idx) => (
            <View style={styles.tableRow} key={idx}>
              <Text style={styles.colDesc}>{item.designation}</Text>
              <Text style={styles.colQty}>{item.quantite}</Text>
              <Text style={styles.colPrice}>{item.prixUnitaire.toLocaleString()} FCFA</Text>
              <Text style={styles.colTotal}>{(item.quantite * item.prixUnitaire).toLocaleString()} FCFA</Text>
            </View>
          ))}
        </View>

        {/* TOTALS */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Hors Taxes (HT) :</Text>
            <Text style={styles.totalVal}>{totalHT.toLocaleString()} FCFA</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TVA (19.25%) :</Text>
            <Text style={styles.totalVal}>{totalTVA.toLocaleString()} FCFA</Text>
          </View>
          <View style={styles.totalRowBold}>
            <Text style={[styles.totalLabel, styles.totalLabelBold]}>Total TTC :</Text>
            <Text style={styles.totalValBold}>{totalTTC.toLocaleString()} FCFA</Text>
          </View>
        </View>

        {/* PIED DE PAGE */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            PharmaGeo - Solution de traçabilité et de logistique médicale en temps réel.
          </Text>
          <Text style={[styles.footerText, { marginTop: 2 }]}>
            Document officiel généré à la volée par la console officine.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
