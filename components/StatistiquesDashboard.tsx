'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Package,
  Store,
  Bike,
  ClipboardList,
  AlertTriangle,
  Clock,
  CheckCircle2
} from 'lucide-react';

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

  const fetchStats = useCallback(async (active?: { current: boolean }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (active && !active.current) return;

    try {
      if (role === 'ADMIN') {
        const { count: medCount } = await supabase.from('medicaments').select('*', { count: 'exact', head: true });
        const { count: pharmCount } = await supabase.from('pharmacies').select('*', { count: 'exact', head: true });
        const { count: livreurCount } = await supabase.from('profils').select('*', { count: 'exact', head: true }).eq('role', 'LIVREUR');
        const { count: attenteCount } = await supabase.from('livraisons').select('*', { count: 'exact', head: true }).eq('statut', 'EN_ATTENTE');
        const { count: livreeCount } = await supabase.from('livraisons').select('*', { count: 'exact', head: true }).eq('statut', 'LIVRE');

        if (active && !active.current) return;
        setStats({
          totalMedicaments: medCount || 0,
          totalPharmacies: pharmCount || 0,
          totalLivreurs: livreurCount || 0,
          commandesEnAttente: attenteCount || 0,
          commandesLivrees: livreeCount || 0,
          produitsEnRupture: 0,
        });
      }
      else if (role === 'PHARMACIEN') {
        const { data: lien } = await supabase.from('pharmacie_personnel').select('pharmacie_id').eq('pharmacien_id', user.id).maybeSingle();
        if (active && !active.current) return;

        if (lien) {
          const { count: attenteCount } = await supabase.from('livraisons').select('*', { count: 'exact', head: true }).eq('pharmacie_id', lien.pharmacie_id).eq('statut', 'EN_ATTENTE');
          const { count: livreeCount } = await supabase.from('livraisons').select('*', { count: 'exact', head: true }).eq('pharmacie_id', lien.pharmacie_id).eq('statut', 'LIVRE');
          const { count: ruptureCount } = await supabase.from('stocks').select('*', { count: 'exact', head: true }).eq('pharmacie_id', lien.pharmacie_id).eq('quantite', 0);
          const { count: totalRayon } = await supabase.from('stocks').select('*', { count: 'exact', head: true }).eq('pharmacie_id', lien.pharmacie_id);

          if (active && !active.current) return;
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
    } catch (err) {
      console.error("Erreur de récupération des stats:", err);
    } finally {
      if (!active || active.current) {
        setLoading(false);
      }
    }
  }, [role]);

  useEffect(() => {
    const active = { current: true };

    const loadData = async () => {
      await fetchStats(active);
    };

    loadData();

    // Synchronisation en temps réel si une commande ou un stock change
    const channel = supabase
      .channel('schema-db-stats-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'livraisons' }, () => {
        if (active.current) fetchStats(active);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stocks' }, () => {
        if (active.current) fetchStats(active);
      })
      .subscribe();

    return () => {
      active.current = false;
      supabase.removeChannel(channel);
    };
  }, [role, fetchStats]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(role === 'ADMIN' ? 5 : 4)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {role === 'ADMIN' ? (
        <>
          {/* CARTES ADMIN */}
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center space-x-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex-shrink-0">
              <Package size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-455 dark:text-zinc-500 uppercase tracking-wider">Catalogue Global</p>
              <h3 className="text-xl font-extrabold text-zinc-950 dark:text-white mt-0.5">{stats.totalMedicaments} <span className="text-xs font-normal text-zinc-500">Médicaments</span></h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center space-x-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl flex-shrink-0">
              <Store size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-455 dark:text-zinc-500 uppercase tracking-wider">Partenaires</p>
              <h3 className="text-xl font-extrabold text-zinc-950 dark:text-white mt-0.5">{stats.totalPharmacies} <span className="text-xs font-normal text-zinc-500">Officines</span></h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center space-x-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex-shrink-0">
              <Bike size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-455 dark:text-zinc-500 uppercase tracking-wider">Flotte Réseau</p>
              <h3 className="text-xl font-extrabold text-zinc-950 dark:text-white mt-0.5">{stats.totalLivreurs} <span className="text-xs font-normal text-zinc-500">Agents</span></h3>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* CARTES PHARMACIEN */}
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center space-x-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex-shrink-0">
              <ClipboardList size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-455 dark:text-zinc-500 uppercase tracking-wider">Références Gérées</p>
              <h3 className="text-xl font-extrabold text-zinc-950 dark:text-white mt-0.5">{stats.totalMedicaments} <span className="text-xs font-normal text-zinc-500">Produits</span></h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center space-x-4">
            <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl flex-shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-455 dark:text-zinc-500 uppercase tracking-wider">Alertes Rupture</p>
              <h3 className={`text-xl font-extrabold mt-0.5 ${stats.produitsEnRupture > 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-950 dark:text-white'}`}>
                {stats.produitsEnRupture} <span className="text-xs font-normal text-zinc-500">Ruptures</span>
              </h3>
            </div>
          </div>
        </>
      )}

      {/* CARTES FLUX */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center space-x-4">
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl flex-shrink-0">
          <Clock size={20} />
        </div>
        <div>
          <p className="text-[10px] font-bold text-zinc-455 dark:text-zinc-500 uppercase tracking-wider">Demandes en attente</p>
          <h3 className="text-xl font-extrabold text-zinc-950 dark:text-white mt-0.5">{stats.commandesEnAttente} <span className="text-xs font-normal text-zinc-500">Commandes</span></h3>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center space-x-4">
        <div className="p-3 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-xl flex-shrink-0">
          <CheckCircle2 size={20} />
        </div>
        <div>
          <p className="text-[10px] font-bold text-zinc-455 dark:text-zinc-500 uppercase tracking-wider">Courses Terminées</p>
          <h3 className="text-xl font-extrabold text-zinc-950 dark:text-white mt-0.5">{stats.commandesLivrees} <span className="text-xs font-normal text-zinc-500">Livrées</span></h3>
        </div>
      </div>
    </div>
  );
}