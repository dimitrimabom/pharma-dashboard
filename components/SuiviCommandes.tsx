'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Bike, Navigation, Loader2 } from 'lucide-react';

interface LivraisonsRow {
  id: number;
  statut: string;
  cree_le: string;
  patient_id: string | null;
  livreur_id: string | null;
  pharmacie_id: number;
  pharmacies: { nom: string } | null;
}

interface Commande {
  id: number;
  statut: string;
  cree_le: string;
  pharmacies: { nom: string } | null;
  patient: { nom: string; telephone: string } | null;
  livreur: { nom: string; telephone: string } | null;
  patient_id: string | null;
  livreur_id: string | null;
  pharmacie_id: number;
}

interface Livreur {
  id: string;
  nom: string;
}

export default function SuiviCommandes({ role }: { role: string }) {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [livreurs, setLivreurs] = useState<Livreur[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Charger les livreurs (pour l'administrateur uniquement)
  const fetchLivreurs = useCallback(async (active?: { current: boolean }) => {
    if (role !== 'ADMIN') return;
    const { data } = await supabase
      .from('profils')
      .select('id, nom')
      .eq('role', 'LIVREUR')
      .order('nom');
    
    if (active && !active.current) return;
    if (data) setLivreurs(data);
  }, [role]);

  // 2. Charger les commandes existantes
  const fetchCommandes = useCallback(async (active?: { current: boolean }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (active && !active.current) return;

    // A. Récupérer d'abord les lignes de la table livraisons et joindre la pharmacie
    let query = supabase
      .from('livraisons')
      .select(`
        id,
        statut,
        cree_le,
        pharmacie_id,
        patient_id,
        livreur_id,
        pharmacies ( nom )
      `);

    // Si c'est un pharmacien, on filtre par sa pharmacie via la table de liaison
    if (role === 'PHARMACIEN') {
      const { data: lien } = await supabase
         .from('pharmacie_personnel')
         .select('pharmacie_id')
         .eq('pharmacien_id', user.id)
         .maybeSingle();
      
      if (active && !active.current) return;

      if (lien) {
        query = query.eq('pharmacie_id', lien.pharmacie_id);
      } else {
        setCommandes([]);
        setLoading(false);
        return;
      }
    }

    const { data: livraisonsData, error: livraisonsError } = await query.order('id', { ascending: false });

    if (active && !active.current) return;

    if (livraisonsError) {
      console.error("Erreur livraisons:", livraisonsError.message);
      setLoading(false);
      return;
    }

    const typedLivraisons = (livraisonsData || []) as unknown as LivraisonsRow[];

    if (!typedLivraisons || typedLivraisons.length === 0) {
      setCommandes([]);
      setLoading(false);
      return;
    }

    // B. OPTIMISATION BATCH FETCH (Évite le bug N+1)
    const profileIds = Array.from(
      new Set(
        [
          ...typedLivraisons.map((cmd) => cmd.patient_id),
          ...typedLivraisons.map((cmd) => cmd.livreur_id)
        ].filter(Boolean)
      )
    );

    const profilesMap = new Map<string, { nom: string; telephone: string }>();
    if (profileIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profils')
        .select('id, nom, telephone')
        .in('id', profileIds);

      if (active && !active.current) return;

      if (profilesError) {
        console.error("Erreur batch profils:", profilesError.message);
      } else if (profilesData) {
        profilesData.forEach((p) => {
          profilesMap.set(p.id, { nom: p.nom, telephone: p.telephone });
        });
      }
    }

    // C. Reconstruire l'objet complet en mémoire
    const commandesCompletes: Commande[] = typedLivraisons.map((cmd) => {
      const patientInfo = cmd.patient_id ? profilesMap.get(cmd.patient_id) : null;
      const livreurInfo = cmd.livreur_id ? profilesMap.get(cmd.livreur_id) : null;
      const pharmaciesData = cmd.pharmacies;

      return {
        id: cmd.id,
        statut: cmd.statut,
        cree_le: cmd.cree_le,
        pharmacies: pharmaciesData ? { nom: pharmaciesData.nom } : { nom: 'Pharmacie Inconnue' },
        patient: patientInfo ? { nom: patientInfo.nom, telephone: patientInfo.telephone } : { nom: 'Patient Inconnu', telephone: '' },
        livreur: livreurInfo ? { nom: livreurInfo.nom, telephone: livreurInfo.telephone } : null,
        patient_id: cmd.patient_id,
        livreur_id: cmd.livreur_id,
        pharmacie_id: cmd.pharmacie_id,
      };
    });

    if (active && !active.current) return;
    setCommandes(commandesCompletes);
    setLoading(false);
  }, [role]);

  useEffect(() => {
    const active = { current: true };

    const loadData = async () => {
      await fetchCommandes(active);
      await fetchLivreurs(active);
    };

    loadData();

    // ⚡ BRANCHEMENT TEMPS RÉEL
    const abonnementCommandes = supabase
      .channel('suivi-livraisons-live-optimized')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'livraisons' },
        () => {
          if (active.current) fetchCommandes(active);
        }
      )
      .subscribe();

    return () => {
      active.current = false;
      supabase.removeChannel(abonnementCommandes);
    };
  }, [role, fetchCommandes, fetchLivreurs]);

  // 3. ACTION : Modifier le statut d'une livraison
  const handleStatutChange = async (livraisonId: number, nouveauStatut: string) => {
    const { error } = await supabase
      .from('livraisons')
      .update({ statut: nouveauStatut })
      .eq('id', livraisonId);

    if (error) {
      alert(`Erreur lors de la modification du statut : ${error.message}`);
    } else {
      fetchCommandes();
    }
  };

  // 4. ACTION : Assigner un livreur
  const handleLivreurAssign = async (livraisonId: number, livreurId: string) => {
    if (!livreurId) return;

    const { error } = await supabase
      .from('livraisons')
      .update({ 
        livreur_id: livreurId,
        statut: 'EN_COURS'
      })
      .eq('id', livraisonId);

    if (error) {
      alert(`Erreur d'affectation : ${error.message}`);
    } else {
      fetchCommandes();
    }
  };

  const getBadgeColor = (statut: string) => {
    switch (statut) {
      case 'EN_ATTENTE': return 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400 border-yellow-200/50 dark:border-yellow-900/30';
      case 'PREPARATION': return 'bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 border-orange-200/50 dark:border-orange-900/30';
      case 'EN_COURS': return 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/30';
      case 'LIVRE': return 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200/50 dark:border-green-900/30';
      default: return 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300';
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 text-center text-zinc-500 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600 mb-3" size={24} />
        <p className="text-sm">Chargement du flux des livraisons...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm text-zinc-800 dark:text-zinc-100 transition-colors">
      
      {/* HEADER DE SECTION */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-2.5">
          <Navigation size={18} className="text-emerald-600 dark:text-emerald-500" />
          <div>
            <h3 className="text-lg font-bold text-zinc-955 dark:text-white leading-tight">Suivi des Flux de Livraisons</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Suivi en direct des commandes de médicaments et des courses des livreurs.</p>
          </div>
        </div>
        <span className="flex h-3.5 w-3.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200/40 dark:border-zinc-800/40">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-955/40 border-b border-zinc-200/40 dark:border-zinc-800/40 text-zinc-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
              <th className="p-4">ID Commande</th>
              <th className="p-4">Pharmacie</th>
              <th className="p-4">Patient (Destinataire)</th>
              <th className="p-4">Livreur assigné</th>
              <th className="p-4">Date de demande</th>
              <th className="p-4 text-right">Statut & Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-sm">
            {commandes.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-400 dark:text-zinc-500 text-xs">Aucune commande ou livraison en cours.</td>
              </tr>
            ) : (
              commandes.map((cmd) => (
                <tr key={cmd.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-955/10 transition">
                  {/* ID */}
                  <td className="p-4 font-mono font-bold text-zinc-900 dark:text-white">#CMD-{cmd.id}</td>
                  
                  {/* Pharmacie */}
                  <td className="p-4 font-semibold text-zinc-850 dark:text-zinc-200">{cmd.pharmacies?.nom}</td>
                  
                  {/* Patient */}
                  <td className="p-4">
                    <div className="font-semibold text-zinc-950 dark:text-white">{cmd.patient?.nom}</div>
                    <div className="text-xs font-mono text-zinc-450 dark:text-zinc-450 mt-0.5">{cmd.patient?.telephone}</div>
                  </td>
                  
                  {/* Livreur */}
                  <td className="p-4">
                    {cmd.livreur ? (
                      <div className="flex flex-col space-y-0.5">
                        <div className="font-semibold text-zinc-900 dark:text-white flex items-center space-x-1.5">
                          <Bike size={14} className="text-emerald-600 dark:text-emerald-500" />
                          <span>{cmd.livreur.nom}</span>
                        </div>
                        <div className="text-xs font-mono text-zinc-450 dark:text-zinc-450 pl-5">{cmd.livreur.telephone}</div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {role === 'ADMIN' ? (
                          <select
                            defaultValue=""
                            onChange={(e) => handleLivreurAssign(cmd.id, e.target.value)}
                            className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-zinc-900 dark:text-white bg-white dark:bg-zinc-955 max-w-[170px]"
                          >
                            <option value="" disabled>-- Affecter livreur --</option>
                            {livreurs.map((liv) => (
                              <option key={liv.id} value={liv.id}>{liv.nom}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 text-[10px] font-bold uppercase rounded-md border border-red-200/50 dark:border-red-900/30">
                            Non assigné
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  
                  {/* Date */}
                  <td className="p-4 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {new Date(cmd.cree_le).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  
                  {/* Actions & Statut */}
                  <td className="p-4 text-right">
                    <div className="inline-flex flex-col items-end gap-1.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${getBadgeColor(cmd.statut)}`}>
                        {cmd.statut}
                      </span>
                      
                      <select
                        value={cmd.statut}
                        onChange={(e) => handleStatutChange(cmd.id, e.target.value)}
                        className="p-1 border border-zinc-200 dark:border-zinc-800 rounded-md text-[10px] font-bold text-zinc-505 dark:text-zinc-450 bg-white dark:bg-zinc-955 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      >
                        <option value="EN_ATTENTE">Attente</option>
                        <option value="PREPARATION">Préparation</option>
                        <option value="EN_COURS">En cours</option>
                        <option value="LIVRE">Livrée</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}