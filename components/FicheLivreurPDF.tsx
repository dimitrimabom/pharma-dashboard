'use client';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1f2937',
    backgroundColor: '#ffffff'
  },
  header: {
    borderBottom: '2px solid #059669',
    paddingBottom: 15,
    marginBottom: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  logoIcon: {
    fontSize: 20,
    color: '#059669',
    marginRight: 6
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827'
  },
  docTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#059669',
    textAlign: 'right'
  },
  docSubtitle: {
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 2
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'uppercase',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: 4,
    marginBottom: 8,
    marginTop: 15
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15
  },
  col: {
    flex: 1,
    paddingRight: 10
  },
  infoText: {
    fontSize: 10,
    marginBottom: 4,
    color: '#4b5563'
  },
  infoTextBold: {
    fontWeight: 'bold',
    color: '#111827'
  },
  credentialsBox: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 15,
    marginVertical: 15
  },
  credentialsTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  credentialLine: {
    flexDirection: 'row',
    marginBottom: 5,
    fontSize: 10
  },
  credentialLabel: {
    width: 120,
    color: '#4b5563',
    fontWeight: 'bold'
  },
  credentialVal: {
    fontFamily: 'Courier',
    fontWeight: 'bold',
    color: '#111827'
  },
  instructionBox: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 8,
    padding: 15,
    marginVertical: 15
  },
  instructionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#065f46',
    marginBottom: 6
  },
  instructionStep: {
    fontSize: 9,
    color: '#047857',
    marginBottom: 4,
    lineHeight: 1.4
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 50,
    right: 50,
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

interface FicheLivreurPDFProps {
  nom: string;
  telephone: string;
  email: string;
  motDePasseAffiche: string;
  pharmacieNom?: string;
  dateCreation: string;
}

export default function FicheLivreurPDF({
  nom,
  telephone,
  email,
  motDePasseAffiche,
  pharmacieNom,
  dateCreation
}: FicheLivreurPDFProps) {
  const dateFormatee = new Date(dateCreation).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Document title={`Fiche_Livreur_${nom.replace(/\s+/g, '_')}`}>
      <Page size="A4" style={styles.page}>
        {/* EN-TÊTE */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>✚</Text>
            <Text style={styles.logoText}>PharmaGeo</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>FICHE D&apos;ACTIVATION LIVREUR</Text>
            <Text style={styles.docSubtitle}>Générée le : {dateFormatee}</Text>
          </View>
        </View>

        {/* PROFIL DU LIVREUR */}
        <Text style={styles.sectionTitle}>Profil de l&apos;Agent</Text>
        <View style={styles.grid}>
          <View style={styles.col}>
            <Text style={styles.infoText}>Nom complet : <Text style={styles.infoTextBold}>{nom}</Text></Text>
            <Text style={styles.infoText}>Téléphone : <Text style={styles.infoTextBold}>{telephone}</Text></Text>
            <Text style={styles.infoText}>Rôle assigné : <Text style={styles.infoTextBold}>LIVREUR MOBILE</Text></Text>
          </View>
          {pharmacieNom && (
            <View style={styles.col}>
              <Text style={styles.infoText}>Structure recruteuse : <Text style={styles.infoTextBold}>{pharmacieNom}</Text></Text>
              <Text style={styles.infoText}>Réseau partenaire : <Text style={styles.infoTextBold}>PharmaGeo Cameroun</Text></Text>
            </View>
          )}
        </View>

        {/* IDENTIFIANTS DE CONNEXION */}
        <View style={styles.credentialsBox}>
          <Text style={styles.credentialsTitle}>Identifiants de Connexion Sécurisés</Text>
          <View style={styles.credentialLine}>
            <Text style={styles.credentialLabel}>Adresse E-mail :</Text>
            <Text style={styles.credentialVal}>{email}</Text>
          </View>
          <View style={styles.credentialLine}>
            <Text style={styles.credentialLabel}>Mot de passe temporaire :</Text>
            <Text style={styles.credentialVal}>{motDePasseAffiche}</Text>
          </View>
        </View>

        {/* CONSIGNES ET INSTRUCTIONS */}
        <View style={styles.instructionBox}>
          <Text style={styles.instructionTitle}>Instructions d&apos;Activation de l&apos;Application Mobile :</Text>
          <Text style={styles.instructionStep}>
            1. Téléchargez et ouvrez l&apos;application mobile &quot;PharmaGeo Livreur&quot; sur votre smartphone.
          </Text>
          <Text style={styles.instructionStep}>
            2. Connectez-vous en saisissant l&apos;adresse e-mail et le mot de passe temporaire mentionnés ci-dessus.
          </Text>
          <Text style={styles.instructionStep}>
            3. Dès votre première connexion, l&apos;application vous demandera de modifier votre mot de passe temporaire pour définir un nouveau mot de passe personnel et hautement sécurisé.
          </Text>
          <Text style={styles.instructionStep}>
            4. Autorisez l&apos;application à accéder à vos coordonnées GPS en arrière-plan. Cela permettra au radar et aux pharmacies de vous localiser pour vous attribuer des courses de livraison à proximité.
          </Text>
        </View>

        {/* PIED DE PAGE */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            PharmaGeo - Plateforme connectée de traçabilité médicale et livraison express.
          </Text>
          <Text style={[styles.footerText, { marginTop: 2 }]}>
            Cette fiche contient des données confidentielles. Ne la partagez pas avec des tiers.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
