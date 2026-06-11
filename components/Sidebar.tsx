'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  BarChart3, 
  Package, 
  Store, 
  User, 
  Map, 
  Navigation, 
  ClipboardList, 
  ShoppingCart, 
  History, 
  BookOpen, 
  LifeBuoy, 
  Activity, 
  LogOut,
  Bike
} from 'lucide-react';

interface SidebarProps {
  role: 'ADMIN' | 'PHARMACIEN';
  profile: {
    nom: string;
    role: string;
  } | null;
}

export default function Sidebar({ role, profile }: SidebarProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  // Définition des éléments de menu pour l'administrateur
  const adminMenuItems = [
    { name: "Dashboard Overview", path: "/admin/dashboard", icon: BarChart3 },
    { name: "Catalogue National", path: "/admin/catalogue", icon: Package },
    { name: "Gestion Pharmacies", path: "/admin/pharmacies", icon: Store },
    { name: "Gestion Comptes", path: "/admin/comptes", icon: User },
    { name: "Supervision Géo", path: "/admin/carte", icon: Map },
    { name: "Commandes Live", path: "/admin/commandes", icon: Navigation },
  ];

  // Définition des éléments de menu pour le pharmacien
  const pharmacienMenuItems = [
    { name: "Officine Overview", path: "/pharmacien/dashboard", icon: BarChart3 },
    { name: "Inventaire & Stock", path: "/pharmacien/stock", icon: ClipboardList },
    { name: "Flotte Livreurs", path: "/pharmacien/livreurs", icon: Bike },
    { name: "Guichet Commandes", path: "/pharmacien/commandes", icon: ShoppingCart },
    { name: "Historique & Factures", path: "/pharmacien/historique", icon: History },
  ];

  const menuItems = role === 'ADMIN' ? adminMenuItems : pharmacienMenuItems;

  const initials = profile?.nom
    ? profile.nom.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 text-zinc-350 flex flex-col justify-between h-screen sticky top-0 flex-shrink-0 z-30 transition-colors">
      {/* SECTION DU HAUT : Logo */}
      <div className="p-6">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition duration-300">
            <Activity className="text-white" size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tight text-white">PharmaGeo</span>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider -mt-0.5">Control Center</span>
          </div>
        </Link>
      </div>

      {/* SECTION DU MILIEU : Liens de navigation */}
      <div className="flex-1 px-4 py-2 space-y-7 overflow-y-auto">
        <div>
          <p className="text-[10px] font-bold text-zinc-650 uppercase tracking-widest px-3 mb-3">Menu</p>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-emerald-600/10 text-emerald-400 border-l-2 border-emerald-500 font-extrabold'
                      : 'hover:bg-zinc-800/50 hover:text-white'
                  }`}
                >
                  <IconComponent size={15} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Section technique / de soutien */}
        <div>
          <p className="text-[10px] font-bold text-zinc-650 uppercase tracking-widest px-3 mb-3">Assistance</p>
          <div className="space-y-1">
            <Link 
              href="https://pharmageo.com/docs" 
              target="_blank" 
              className="flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800/50 hover:text-white transition"
            >
              <BookOpen size={15} />
              <span>Guide Système</span>
            </Link>
            <Link 
              href="mailto:support@pharmageo.com" 
              className="flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800/50 hover:text-white transition"
            >
              <LifeBuoy size={15} />
              <span>Support Client</span>
            </Link>
          </div>
        </div>
      </div>

      {/* SECTION DU BAS : Utilisateur et Déconnexion */}
      <div className="p-4 border-t border-zinc-850 bg-zinc-950/40 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8.5 h-8.5 rounded-full bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-xs font-bold text-white shadow-inner">
              {initials}
            </div>
            <div className="flex flex-col min-w-0 max-w-[120px]">
              <span className="text-[11px] font-bold text-white truncate leading-tight">{profile?.nom || 'Utilisateur'}</span>
              <span className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">{profile?.role || role}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Se déconnecter"
            className="w-7 h-7 rounded-lg bg-zinc-800/40 hover:bg-red-950/20 text-zinc-500 hover:text-red-400 flex items-center justify-center border border-zinc-800 hover:border-red-950/40 transition cursor-pointer"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
