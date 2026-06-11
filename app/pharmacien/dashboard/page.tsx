'use client';
import StatistiquesDashboard from '@/components/StatistiquesDashboard';

export default function PharmacienDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Panel d'accueil */}
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-900 dark:to-zinc-950 p-6 rounded-2xl text-white shadow-sm flex flex-col justify-between relative overflow-hidden border border-zinc-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-2 relative z-10">
          <h2 className="text-2xl font-black tracking-tight">Espace Officine</h2>
          <p className="text-xs text-zinc-400 max-w-xl">
            Consultez les indicateurs locaux de votre pharmacie. Suivez vos ventes journalières, vos commandes en préparation, et anticipez les alertes de rupture de stock.
          </p>
        </div>
      </div>

      {/* Cartes de statistiques locales */}
      <div>
        <h3 className="text-xs font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest mb-4">Indicateurs de l&apos;Officine</h3>
        <StatistiquesDashboard role="PHARMACIEN" />
      </div>
    </div>
  );
}
