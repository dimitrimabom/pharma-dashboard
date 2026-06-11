'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PDFDownloadLink } from '@react-pdf/renderer';
import FacturePDF, { getCommandeItems } from '@/components/FacturePDF';
import { Loader2, Inbox, FileText, Play, Truck, CheckCircle } from 'lucide-react';

interface Commande {
  id: number;
  statut: string;
  cree_le: string;
  patient: { nom: string; telephone: string } | null;
  patient_id: string;
  livreur: { nom: string; telephone: string } | null;
  livreur_id: string;
}

export default function PharmacienCommandesPage() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [selectedCmd, setSelectedCmd] = useState<Commande | null>(null);
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

  const fetchCommandes = async (active?: { current: boolean }) => {
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

      // 2. Charger les livraisons actives (statut !== 'LIVRE')
      const { data: livraisonsData, error: livraisonsError } = await supabase
        .from('livraisons')
        .select('id, statut, cree_le, patient_id, livreur_id')
        .eq('pharmacie_id', lienTyped.pharmacie_id)
        .neq('statut', 'LIVRE')
        .order('id', { ascending: false });

      if (active && !active.current) return;

      if (livraisonsError) {
        console.error(livraisonsError.message);
        setLoading(false);
        return;
      }

      if (!livraisonsData || livraisonsData.length === 0) {
        setCommandes([]);
        setSelectedCmd(null);
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

      // 4. Reconstruire commandes
      const formattedCommandes: Commande[] = livraisonsData.map((cmd) => {
        const patientInfo = cmd.patient_id ? profilesMap.get(cmd.patient_id) : null;
        const livreurInfo = cmd.livreur_id ? profilesMap.get(cmd.livreur_id) : null;

        return {
          id: cmd.id,
          statut: cmd.statut,
          cree_le: cmd.cree_le,
          patient: patientInfo ? { nom: patientInfo.nom, telephone: patientInfo.telephone } : { nom: 'Patient Inconnu', telephone: '' },
          patient_id: cmd.patient_id,
          livreur: livreurInfo ? { nom: livreurInfo.nom, telephone: livreurInfo.telephone } : null,
          livreur_id: cmd.livreur_id
        };
      });

      if (active && !active.current) return;
      setCommandes(formattedCommandes);
      
      // Sélectionner par défaut la première commande ou préserver la sélection
      if (formattedCommandes.length > 0) {
        setSelectedCmd(prev => {
          if (prev) {
            const updated = formattedCommandes.find(c => c.id === prev.id);
            return updated || formattedCommandes[0];
          }
          return formattedCommandes[0];
        });
      } else {
        setSelectedCmd(null);
      }
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
        fetchCommandes(active);
      }
    }, 0);

    const channel = supabase
      .channel('pharmacien-commandes-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'livraisons' }, () => {
        if (active.current) fetchCommandes(active);
      })
      .subscribe();

    return () => {
      active.current = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdateStatut = async (id: number, nouveauStatut: string) => {
    const { error } = await supabase
      .from('livraisons')
      .update({ statut: nouveauStatut })
      .eq('id', id);

    if (error) {
      alert(`Erreur : ${error.message}`);
    } else {
      fetchCommandes();
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 text-center text-zinc-500 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600 mb-3" size={24} />
        <p className="text-sm">Chargement du guichet de travail...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-zinc-850 dark:text-zinc-100 transition-colors">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white">Guichet des Commandes Live</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Traitement en temps réel des commandes reçues et facturation PDF.</p>
      </div>

      {commandes.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 p-12 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 text-center space-y-2 flex flex-col items-center justify-center">
          <Inbox size={32} className="text-zinc-300 dark:text-zinc-700 mb-1" />
          <h3 className="text-sm font-bold text-zinc-950 dark:text-white">Aucune commande active</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">Toutes les demandes de patients ont été livrées ou classées dans l&apos;historique.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-180px)] min-h-[500px]">
          
          {/* PANNEAU GAUCHE : Master List */}
          <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl flex flex-col overflow-hidden shadow-sm">
            <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/20 border-b border-zinc-200/50 dark:border-zinc-800/50">
              <h3 className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Demandes en attente ({commandes.length})</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {commandes.map((cmd) => {
                const isSelected = selectedCmd?.id === cmd.id;
                const dateStr = new Date(cmd.cree_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <button
                    key={cmd.id}
                    onClick={() => setSelectedCmd(cmd)}
                    className={`w-full text-left p-4 transition flex justify-between items-start cursor-pointer ${
                      isSelected 
                        ? 'bg-emerald-600/5 dark:bg-emerald-950/10 border-l-4 border-emerald-500' 
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-850'
                    }`}
                  >
                    <div className="space-y-1">
                      <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white">#CMD-{cmd.id}</span>
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{cmd.patient?.nom}</p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Reçue à {dateStr}</p>
                    </div>
                    <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full ${
                      cmd.statut === 'EN_ATTENTE' 
                        ? 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700' 
                        : cmd.statut === 'PREPARATION' 
                        ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-700'
                        : 'bg-blue-50 dark:bg-blue-950/20 text-blue-700'
                    }`}>
                      {cmd.statut}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PANNEAU DROIT : Detail View */}
          <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl flex flex-col overflow-hidden shadow-sm">
            {selectedCmd ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* En-tête détail */}
                <div className="p-5 border-b border-zinc-200/50 dark:border-zinc-800/50 flex justify-between items-start gap-4">
                  <div>
                    <span className="font-mono text-xs font-bold text-zinc-400">Détails de la demande</span>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mt-0.5">Commande #CMD-{selectedCmd.id}</h3>
                  </div>

                  {/* Bouton de téléchargement de la facture PDF */}
                  {isClient && (
                    <PDFDownloadLink
                      document={
                        <FacturePDF
                          commandeId={selectedCmd.id}
                          creeLe={selectedCmd.cree_le}
                          pharmacieNom={pharmacieNom}
                          patientNom={selectedCmd.patient?.nom || 'Patient'}
                          patientTel={selectedCmd.patient?.telephone || ''}
                        />
                      }
                      fileName={`Facture_CMD-${selectedCmd.id}.pdf`}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-[0.98] cursor-pointer flex items-center space-x-1.5"
                    >
                      {({ loading }) => (loading ? (
                        <span>Génération...</span>
                      ) : (
                        <>
                          <FileText size={14} />
                          <span>Télécharger la facture</span>
                        </>
                      ))}
                    </PDFDownloadLink>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Destinataire */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border border-zinc-200/40 dark:border-zinc-800/40 space-y-1">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">Patient destinataire</span>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">{selectedCmd.patient?.nom}</p>
                      <p className="text-xs font-mono text-zinc-500">{selectedCmd.patient?.telephone}</p>
                    </div>

                    <div className="p-4 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border border-zinc-200/40 dark:border-zinc-800/40 space-y-1">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">Livreur assigné</span>
                      {selectedCmd.livreur ? (
                        <>
                          <p className="text-sm font-bold text-zinc-900 dark:text-white">{selectedCmd.livreur.nom}</p>
                          <p className="text-xs font-mono text-zinc-500">{selectedCmd.livreur.telephone}</p>
                        </>
                      ) : (
                        <p className="text-xs font-bold text-zinc-450 dark:text-zinc-500 mt-1">En attente d&apos;affectation par l&apos;Admin</p>
                      )}
                    </div>
                  </div>

                  {/* Stepper horizontal visuel */}
                  <div className="space-y-3">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">Progression de la préparation</span>
                    <div className="flex items-center justify-between px-2 pt-2">
                      <div className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition ${
                          selectedCmd.statut === 'EN_ATTENTE' || selectedCmd.statut === 'PREPARATION' || selectedCmd.statut === 'EN_COURS'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-zinc-100 dark:bg-zinc-850 border-zinc-200 dark:border-zinc-800 text-zinc-400'
                        }`}>1</div>
                        <span className="text-[9px] font-bold mt-1">Reçue</span>
                      </div>
                      <div className="flex-1 h-0.5 bg-zinc-200 dark:bg-zinc-800 mx-2 -mt-4"></div>
                      <div className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition ${
                          selectedCmd.statut === 'PREPARATION' || selectedCmd.statut === 'EN_COURS'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-zinc-100 dark:bg-zinc-850 border-zinc-200 dark:border-zinc-800 text-zinc-400'
                        }`}>2</div>
                        <span className="text-[9px] font-bold mt-1">Préparation</span>
                      </div>
                      <div className="flex-1 h-0.5 bg-zinc-200 dark:bg-zinc-800 mx-2 -mt-4"></div>
                      <div className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition ${
                          selectedCmd.statut === 'EN_COURS'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-zinc-100 dark:bg-zinc-850 border-zinc-200 dark:border-zinc-800 text-zinc-400'
                        }`}>3</div>
                        <span className="text-[9px] font-bold mt-1">En cours</span>
                      </div>
                    </div>
                  </div>

                  {/* Liste des articles */}
                  <div className="space-y-3">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">Panier du client</span>
                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/50">
                      {getCommandeItems(selectedCmd.id).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 text-xs">
                          <div>
                            <p className="font-bold text-zinc-900 dark:text-white">{item.designation}</p>
                            <p className="text-[10px] text-zinc-550 dark:text-zinc-400 font-medium">Prix unitaire : {item.prixUnitaire.toLocaleString()} FCFA</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-zinc-950 dark:text-white">Qté: {item.quantite}</p>
                            <p className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{(item.quantite * item.prixUnitaire).toLocaleString()} FCFA</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Résumé des coûts */}
                  <div className="bg-zinc-50 dark:bg-zinc-950/30 p-4 rounded-xl border border-zinc-200/40 dark:border-zinc-800/40 space-y-2 text-xs">
                    {(() => {
                      const items = getCommandeItems(selectedCmd.id);
                      const ht = items.reduce((s, i) => s + (i.quantite * i.prixUnitaire), 0);
                      const tva = Math.round(ht * 0.1925);
                      const ttc = ht + tva;

                      return (
                        <>
                          <div className="flex justify-between text-zinc-550 dark:text-zinc-400">
                            <span>Montant HT :</span>
                            <span className="font-mono">{ht.toLocaleString()} FCFA</span>
                          </div>
                          <div className="flex justify-between text-zinc-550 dark:text-zinc-400">
                            <span>TVA (19.25%) :</span>
                            <span className="font-mono">{tva.toLocaleString()} FCFA</span>
                          </div>
                          <div className="flex justify-between font-bold text-sm text-emerald-600 dark:text-emerald-400 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                            <span>Total TTC :</span>
                            <span className="font-mono">{ttc.toLocaleString()} FCFA</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Barre d'actions en bas */}
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 flex gap-3">
                  {selectedCmd.statut === 'EN_ATTENTE' && (
                    <button
                      onClick={() => handleUpdateStatut(selectedCmd.id, 'PREPARATION')}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-bold transition active:scale-[0.98] cursor-pointer"
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        <Play size={14} /> Commencer la préparation
                      </span>
                    </button>
                  )}
                  {selectedCmd.statut === 'PREPARATION' && (
                    <button
                      onClick={() => handleUpdateStatut(selectedCmd.id, 'EN_COURS')}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-xs font-bold transition active:scale-[0.98] cursor-pointer"
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        <Truck size={14} /> Marquer comme Prêt à livrer
                      </span>
                    </button>
                  )}
                  {selectedCmd.statut === 'EN_COURS' && (
                    <button
                      onClick={() => handleUpdateStatut(selectedCmd.id, 'LIVRE')}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-xl text-xs font-bold transition active:scale-[0.98] cursor-pointer"
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        <CheckCircle size={14} /> Valider la remise (Livré)
                      </span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-400 text-xs">
                Sélectionnez une commande dans la liste pour voir ses détails.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
