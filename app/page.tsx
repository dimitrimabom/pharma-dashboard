'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import MedicamentsCRUD from '@/components/MedicamentsCRUD';
import GestionPharmacie from '@/components/GestionPharmacie';
import GestionLivreurs from '@/components/GestionLivreurs';
import SuiviCommandes from '@/components/SuiviCommandes';
import GestionComptes from '@/components/GestionComptes';
import StatistiquesDashboard from '@/components/StatistiquesDashboard';

import dynamic from 'next/dynamic';

const CarteSupervision = dynamic(() => import('@/components/CarteSupervision'), {
  ssr: false,
  loading: () => <p className="text-gray-500">Chargement de la carte...</p>
});

interface Profil {
  nom: string;
  role: string;
}

export default function HomePage() {
  const router = useRouter();
  const [profil, setProfil] = useState<Profil | null>(null);
  const [loading, setLoading] = useState(true);
  const [ongletActif, setOngletActif] = useState('medicaments');

  useEffect(() => {
    const checkUser = async () => {
      try {
        // 1. Vérification en direct via l'API Supabase
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          window.location.href = '/auth';
          return;
        }

        // 2. Récupération du profil (avec maybeSingle pour éviter le blocage si la ligne n'existe pas)
        const { data, error } = await supabase
          .from('profils')
          .select('nom, role')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error("Erreur lors de la récupération du profil:", error.message);
        }

        if (data) {
          setProfil(data);
        } else {
          // Profil de secours si l'utilisateur est inscrit dans Auth mais absent de la table profils
          setProfil({ nom: user.email || 'Utilisateur', role: 'PHARMACIEN' });
        }
        
      } catch (err) {
        console.error("Erreur critique système:", err);
      } finally {
        // Cette ligne s'exécute TOUJOURS, brisant le chargement infini
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-800">
        <div className="text-center">
          <div className="animate-spin text-2xl mb-2 inline-block">🔄</div>
          <p className="text-lg font-medium">Chargement du système...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* BARRE DE NAVIGATION BANDEAU SUPÉRIEUR */}
      <nav className="bg-white shadow-sm px-8 py-4 flex justify-between items-center border-b">
        <div className="flex items-center space-x-3">
          <span className="text-2xl font-black text-green-600 tracking-tight">PharmaGeo</span>
          <span className="px-2.5 py-0.5 bg-green-50 text-green-700 text-xs font-bold rounded-md uppercase border border-green-200">
            {profil?.role}
          </span>
        </div>
        <div className="flex items-center space-x-6">
          <span className="text-sm text-gray-600">Session active : <strong className="text-gray-900 font-semibold">{profil?.nom}</strong></span>
          <button onClick={handleLogout} className="text-xs bg-red-50 text-red-600 px-3 py-2 rounded-xl font-bold hover:bg-red-100 transition">
            Déconnexion
          </button>
        </div>
      </nav>

      {/* ZONE DE CONTENU PRINCIPALE */}
      <div className="p-8 max-w-7xl mx-auto">

        <StatistiquesDashboard role={profil?.role || 'PHARMACIEN'} />

        {profil?.role === 'ADMIN' ? (
          <div className="space-y-6">
            {/* Onglets de navigation exclusifs à l'Administrateur */}
            <div className="flex space-x-2 border-b pb-px">
              <button onClick={() => setOngletActif('medicaments')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${ongletActif === 'medicaments' ? 'border-green-600 text-green-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                📦 Catalogue Médicaments
              </button>
              <button onClick={() => setOngletActif('commandes')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${ongletActif === 'commandes' ? 'border-green-600 text-green-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                🛰️ Flux de Livraisons
              </button>
              <button onClick={() => setOngletActif('livreurs')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${ongletActif === 'livreurs' ? 'border-green-600 text-green-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                🚴 Flotte Livreurs
              </button>
              <button onClick={() => setOngletActif('comptes')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${ongletActif === 'comptes' ? 'border-green-600 text-green-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                ⚙️ Structures & Comptes
              </button>
              <button onClick={() => setOngletActif('carte')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${ongletActif === 'carte' ? 'border-green-600 text-green-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                🗺️ Carte Supervision
              </button>
            </div>

            {/* Affichage du composant sélectionné */}
            <div className="pt-2">
              {ongletActif === 'medicaments' && <MedicamentsCRUD />}
              {ongletActif === 'commandes' && <SuiviCommandes role="ADMIN" />}
              {ongletActif === 'livreurs' && <GestionLivreurs />}
              {ongletActif === 'comptes' && <GestionComptes />}
              {ongletActif === 'carte' && <CarteSupervision />}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Le Pharmacien voit son module d'officine/stocks */}
            <GestionPharmacie />
            
            {/* Et son propre tableau de commandes reçues en direct en dessous */}
            <div className="border-t pt-8">
              <SuiviCommandes role="PHARMACIEN" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}