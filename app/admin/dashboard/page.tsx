'use client';
import StatistiquesDashboard from '@/components/StatistiquesDashboard';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Panel d'accueil */}
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-900 dark:to-zinc-950 p-6 rounded-2xl text-white shadow-sm flex flex-col justify-between relative overflow-hidden border border-zinc-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-2 relative z-10">
          <h2 className="text-2xl font-black tracking-tight">Vue d&apos;ensemble du Réseau</h2>
          <p className="text-xs text-zinc-400 max-w-xl">
            Suivez les indicateurs clés à l&apos;échelle nationale : chiffre d&apos;affaires, statut de la flotte des livreurs et niveau de couverture géographique.
          </p>
        </div>
      </div>

      {/* Cartes de statistiques globales */}
      {/* Note: StatistiquesDashboard contient déjà le rendu pour le rôle ADMIN ou PHARMACIEN */}
      {/* Nous l'intègrerons séparément, ou nous pouvons le forcer si nous le souhaitons. */}
      {/* StatistiquesDashboard gère déjà le filtre role="ADMIN" dans son code */}
      <div>
        <h3 className="text-xs font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest mb-4">Statistiques Globales</h3>
        <StatistiquesDashboard role="ADMIN" />
      </div>
    </div>
  );
}
