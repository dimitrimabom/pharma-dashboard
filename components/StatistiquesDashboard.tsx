'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Stats {
  totalMedicaments: number;
  totalPharmacies: number;
  totalLivreurs: number;
  commandesEnAttente: number;
  commandesLivrees: number;
  produitsEnRupture: number;
}

export default function StatistiquesDashboard({ role }: { role: string }) {
  const [stats, setStats] = useState<Stats>({
    totalMedicaments: 0,
    totalPharmacies: 0,
    totalLivreurs: 0,
    commandesEnAttente: 0,
    commandesLivrees: 0,
    produitsEnRupture: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. STATS POUR L'ADMINISTRATEUR GÉNÉRAL
    if (role === 'ADMIN') {
      const { count: medCount } = await supabase.from('medicaments').select('*', { count: 'exact', head: true });
      const { count: pharmCount } = await supabase.from('pharmacies').select('*', { count: 'exact', head: true });
      const { count: livreurCount } = await supabase.from('profils').select('*', { count: 'exact', head: true }).eq('role', 'LIVREUR');
      const { count: attenteCount } = await supabase.from('livraisons').select('*', { count: 'exact', head: true }).eq('statut', 'EN_ATTENTE');
      const { count: livreeCount } = await supabase.from('livraisons').select('*', { count: 'exact', head: true }).eq('statut', 'LIVRE');

      setStats({
        totalMedicaments: medCount || 0,
        totalPharmacies: pharmCount || 0,
        totalLivreurs: livreurCount || 0,
        commandesEnAttente: attenteCount || 0,
        commandesLivrees: livreeCount || 0,
        produitsEnRupture: 0, // Concerne plutôt les pharmacies individuellement
      });
    } 
    
    // 2. STATS POUR UN PHARMACIEN (Filtre sur son officine)
    else if (role === 'PHARMACIEN') {
      const { data: lien } = await supabase.from('pharmacie_personnel').select('pharmacie_id').eq('pharmacien_id', user.id).maybeSingle();
      
      if (lien) {
        const { count: attenteCount } = await supabase.from('livraisons').select('*', { count: 'exact', head: true }).eq('pharmacie_id', lien.pharmacie_id).eq('statut', 'EN_ATTENTE');
        const { count: livreeCount } = await supabase.from('livraisons').select('*', { count: 'exact', head: true }).eq('pharmacie_id', lien.pharmacie_id).eq('statut', 'LIVRE');
        
        // Compter les produits de cette pharmacie qui ont une quantité égale à 0 (Rupture)
        const { count: ruptureCount } = await supabase.from('stocks').select('*', { count: 'exact', head: true }).eq('pharmacie_id', lien.pharmacie_id).eq('quantite', 0);
        // Compter le nombre total de références en rayon
        const { count: totalRayon } = await supabase.from('stocks').select('*', { count: 'exact', head: true }).eq('pharmacie_id', lien.pharmacie_id);

        setStats({
          totalMedicaments: totalRayon || 0,
          totalPharmacies: 0,
          totalLivreurs: 0,
          commandesEnAttente: attenteCount || 0,
          commandesLivrees: livreeCount || 0,
          produitsEnRupture: ruptureCount || 0,
        });
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();

    // Synchronisation en temps réel si une commande change de statut
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'livraisons' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stocks' }, () => fetchStats())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role]);

  if (loading) return <div className="h-20 animate-pulse bg-gray-200 rounded-xl mb-6"></div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 text-gray-800">
      {role === 'ADMIN' ? (
        <>
          {/* CARTES ADMIN */}
          <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl text-2xl">📦</div>
            <div>
              <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Catalogue Global</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.totalMedicaments} Médicaments</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl text-2xl">🏬</div>
            <div>
              <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Partenaires visibles</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.totalPharmacies} Officines</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl text-2xl">🚴</div>
            <div>
              <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Flotte Réseau</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.totalLivreurs} Agents Actifs</h3>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* CARTES PHARMACIEN */}
          <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-2xl">📋</div>
            <div>
              <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Références gérées</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.totalMedicaments} Produits</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-2xl">⚠️</div>
            <div>
              <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Alertes Rupture</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.produitsEnRupture} En Alerte</h3>
            </div>
          </div>
        </>
      )}

      {/* CARTES FLUX (COMMUNES MAIS FILTRÉES) */}
      <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center space-x-4">
        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl text-2xl">⏳</div>
        <div>
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Demandes en attente</p>
          <h3 className="text-2xl font-bold text-gray-900">{stats.commandesEnAttente} Commandes</h3>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center space-x-4">
        <div className="p-3 bg-teal-50 text-teal-600 rounded-xl text-2xl">✅</div>
        <div>
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Courses Terminées</p>
          <h3 className="text-2xl font-bold text-gray-900">{stats.commandesLivrees} Livrées</h3>
        </div>
      </div>
    </div>
  );
}