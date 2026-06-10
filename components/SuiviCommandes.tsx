'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Commande {
  id: number;
  statut: string;
  cree_le: string;
  pharmacies: { nom: string };
  profils: { nom: string; telephone: string }; // Données du patient
}

export default function SuiviCommandes({ role }: { role: string }) {
  const [commandes, setCommandes] = useState<Commande[]>([]);

  // 1. Charger les commandes existantes
  const fetchCommandes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Récupérer d'abord les lignes brutes de la table livraisons
    let query = supabase.from('livraisons').select('*');

    // Si c'est un pharmacien, on filtre par sa pharmacie via la table intermédiaire
    if (role === 'PHARMACIEN') {
      const { data: lien } = await supabase
        .from('pharmacie_personnel')
        .select('pharmacie_id')
        .eq('pharmacien_id', user.id)
        .maybeSingle();
      
      if (lien) {
        query = query.eq('pharmacie_id', lien.pharmacie_id);
      } else {
        setCommandes([]);
        return;
      }
    }

    const { data: livraisonsData, error: livraisonsError } = await query.order('id', { ascending: false });

    if (livraisonsError) {
      console.error("Erreur livraisons:", livraisonsError.message);
      return;
    }

    if (!livraisonsData || livraisonsData.length === 0) {
      setCommandes([]);
      return;
    }

    // 2. Récupérer les informations complémentaires (Pharmacies et Profils) manuellement pour éviter le bug de jointure
    const commandesCompletes = await Promise.all(
      livraisonsData.map(async (cmd) => {
        // Charger la pharmacie
        const { data: pharm } = await supabase
          .from('pharmacies')
          .select('nom')
          .eq('id', cmd.pharmacie_id)
          .maybeSingle();

        // Charger le profil du patient
        const { data: patient } = await supabase
          .from('profils')
          .select('nom, telephone')
          .eq('id', cmd.patient_id)
          .maybeSingle();

        return {
          id: cmd.id,
          statut: cmd.statut,
          cree_le: cmd.cree_le,
          pharmacies: pharm ? { nom: pharm.nom } : { nom: 'Pharmacie Inconnue' },
          profils: patient ? { nom: patient.nom, telephone: patient.telephone } : { nom: 'Patient Inconnu', telephone: '' }
        };
      })
    );

    setCommandes(commandesCompletes);
  };

  useEffect(() => {
    fetchCommandes();

    // ⚡ 2. BRANCHEMENT AU TEMPS RÉEL SUPABASE (WebSocket)
    const abonnementCommandes = supabase
      .channel('suivi-livraisons-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'livraisons' },
        () => {
          fetchCommandes(); // Recharger automatiquement dès qu'un changement survient
        }
      )
      .subscribe();

    // Nettoyage de la connexion WebSocket quand on quitte la page
    return () => {
      supabase.removeChannel(abonnementCommandes);
    };
  }, [role]);

  const getBadgeColor = (statut: string) => {
    switch (statut) {
      case 'EN_ATTENTE': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'PREPARATION': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'EN_COURS': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'LIVRE': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border shadow-sm text-gray-800">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Suivi des Flux de Livraisons</h3>
          <p className="text-sm text-gray-500">Suivi en direct des commandes de médicaments et des courses des livreurs.</p>
        </div>
        <span className="flex h-3 w-3 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b text-gray-400 text-xs font-semibold uppercase">
              <th className="p-4">ID Commande</th>
              <th className="p-4">Pharmacie</th>
              <th className="p-4">Patient</th>
              <th className="p-4">Date de demande</th>
              <th className="p-4 text-right">Statut Livraison</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {commandes.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-400">Aucune commande ou livraison en cours.</td>
              </tr>
            ) : (
              commandes.map((cmd) => (
                <tr key={cmd.id} className="hover:bg-gray-50/50">
                  <td className="p-4 font-mono font-bold text-gray-900">#CMD-{cmd.id}</td>
                  <td className="p-4 text-gray-700">{cmd.pharmacies?.nom || 'Pharmacie Générale'}</td>
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{cmd.profils?.nom || 'Patient App'}</div>
                    <div className="text-xs text-gray-400">{cmd.profils?.telephone}</div>
                  </td>
                  <td className="p-4 text-gray-500">{new Date(cmd.cree_le).toLocaleString('fr-FR')}</td>
                  <td className="p-4 text-right">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getBadgeColor(cmd.statut)}`}>
                      {cmd.statut}
                    </span>
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