'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PDFDownloadLink } from '@react-pdf/renderer';
import FacturePDF, { getCommandeItems } from '@/components/FacturePDF';
import { Loader2, Bike, FileText } from 'lucide-react';

interface Commande {
  id: number;
  statut: string;
  cree_le: string;
  patient: { nom: string; telephone: string } | null;
  patient_id: string;
  livreur: { nom: string; telephone: string } | null;
}

export default function PharmacienHistoriquePage() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [pharmacieNom, setPharmacieNom] = useState('Votre Officine');
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    let active = true;
    setTimeout(() => {
      if (active) {
        setIsClient(true);
      }
    }, 0);
    return () => {
      active = false;
    };
  }, []);

  const fetchHistorique = async (active?: { current: boolean }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (active && !active.current) return;

    try {
      // 1. Récupérer le lien pharmacie
      const { data: lien } = await supabase
        .from('pharmacie_personnel')
        .select('pharmacie_id, pharmacies ( nom )')
        .eq('pharmacien_id', user.id)
        .maybeSingle();

      const lienTyped = lien as unknown as { pharmacie_id: number; pharmacies: { nom: string } | null } | null;
      if (!lienTyped) {
        if (active && !active.current) return;
        setCommandes([]);
        setLoading(false);
        return;
      }

      const pharmData = lienTyped.pharmacies;
      if (pharmData) {
        if (!active || active.current) {
          setPharmacieNom(pharmData.nom);
        }
      }

      // 2. Charger les livraisons livrées (statut === 'LIVRE')
      const { data: livraisonsData, error: livraisonsError } = await supabase
        .from('livraisons')
        .select('id, statut, cree_le, patient_id, livreur_id')
        .eq('pharmacie_id', lienTyped.pharmacie_id)
        .eq('statut', 'LIVRE')
        .order('id', { ascending: false });

      if (active && !active.current) return;

      if (livraisonsError) {
        console.error(livraisonsError.message);
        setLoading(false);
        return;
      }

      if (!livraisonsData || livraisonsData.length === 0) {
        setCommandes([]);
        setLoading(false);
        return;
      }

      // 3. Batch fetch profiles
      const profileIds = Array.from(
        new Set(
          [
            ...livraisonsData.map(cmd => cmd.patient_id),
            ...livraisonsData.map(cmd => cmd.livreur_id)
          ].filter(Boolean)
        )
      );

      const profilesMap = new Map<string, { nom: string; telephone: string }>();
      if (profileIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profils')
          .select('id, nom, telephone')
          .in('id', profileIds);

        if (active && !active.current) return;

        if (profilesData) {
          profilesData.forEach(p => {
            profilesMap.set(p.id, { nom: p.nom, telephone: p.telephone });
          });
        }
      }

      // 4. Reconstruire
      const formattedCommandes: Commande[] = livraisonsData.map((cmd) => {
        const patientInfo = cmd.patient_id ? profilesMap.get(cmd.patient_id) : null;
        const livreurInfo = cmd.livreur_id ? profilesMap.get(cmd.livreur_id) : null;

        return {
          id: cmd.id,
          statut: cmd.statut,
          cree_le: cmd.cree_le,
          patient: patientInfo ? { nom: patientInfo.nom, telephone: patientInfo.telephone } : { nom: 'Patient Inconnu', telephone: '' },
          patient_id: cmd.patient_id,
          livreur: livreurInfo ? { nom: livreurInfo.nom, telephone: livreurInfo.telephone } : null
        };
      });

      if (active && !active.current) return;
      setCommandes(formattedCommandes);
    } catch (err) {
      console.error(err);
    } finally {
      if (!active || active.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const active = { current: true };
    setTimeout(() => {
      if (active.current) {
        fetchHistorique(active);
      }
    }, 0);
    return () => {
      active.current = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 text-center text-zinc-500 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600 mb-3" size={24} />
        <p className="text-sm">Chargement des archives...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-zinc-850 dark:text-zinc-100 transition-colors">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white">Historique & Factures</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Consultez vos ventes passées et téléchargez les duplicatas de factures PDF.</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-zinc-200/50 dark:border-zinc-800/50">
          <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Archives des commandes livrées ({commandes.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950/40 border-b border-zinc-200/40 dark:border-zinc-800/40 text-zinc-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-4">ID Commande</th>
                <th className="p-4">Patient</th>
                <th className="p-4">Livreur</th>
                <th className="p-4">Date de livraison</th>
                <th className="p-4 text-center">Montant TTC</th>
                <th className="p-4 text-right">Facturation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-sm">
              {commandes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-400 dark:text-zinc-500 text-xs">Aucun historique de livraison terminée.</td>
                </tr>
              ) : (
                commandes.map((cmd) => {
                  const items = getCommandeItems(cmd.id);
                  const ht = items.reduce((s, i) => s + (i.quantite * i.prixUnitaire), 0);
                  const ttc = ht + Math.round(ht * 0.1925);
                  
                  return (
                    <tr key={cmd.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/10 transition">
                      <td className="p-4 font-mono font-bold text-zinc-900 dark:text-white">#CMD-{cmd.id}</td>
                      <td className="p-4">
                        <div className="font-semibold text-zinc-950 dark:text-white">{cmd.patient?.nom}</div>
                        <div className="text-[10px] font-mono text-zinc-400 mt-0.5">{cmd.patient?.telephone}</div>
                      </td>
                      <td className="p-4 text-zinc-650 dark:text-zinc-350">
                        {cmd.livreur ? (
                          <div className="flex items-center space-x-1.5">
                            <Bike size={14} className="text-emerald-650" />
                            <span className="font-semibold">{cmd.livreur.nom}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic">Remise directe</span>
                        )}
                      </td>
                      <td className="p-4 text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(cmd.cree_le).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="p-4 text-center font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {ttc.toLocaleString()} FCFA
                      </td>
                      <td className="p-4 text-right">
                        {isClient && (
                          <PDFDownloadLink
                            document={
                              <FacturePDF
                                commandeId={cmd.id}
                                creeLe={cmd.cree_le}
                                pharmacieNom={pharmacieNom}
                                patientNom={cmd.patient?.nom || 'Patient'}
                                patientTel={cmd.patient?.telephone || ''}
                              />
                            }
                            fileName={`Facture_CMD-${cmd.id}.pdf`}
                            className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-650 dark:text-zinc-300 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center space-x-1"
                          >
                            {({ loading }) => (loading ? (
                              <span>Génération...</span>
                            ) : (
                              <>
                                <FileText size={12} />
                                <span>Duplicata</span>
                              </>
                            ))}
                          </PDFDownloadLink>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
