'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Livreur {
  id: string;
  nom: string;
  telephone: string;
  role: string;
}

export default function GestionLivreurs() {
  const [livreurs, setLivreurs] = useState<Livreur[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLivreurs = async (active?: { current: boolean }) => {
    // Récupérer les profils qui ont le rôle LIVREUR
    const { data, error } = await supabase
      .from('profils')
      .select('*')
      .eq('role', 'LIVREUR');

    if (active && !active.current) return;

    if (error) console.error(error);
    else setLivreurs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    const active = { current: true };
    setTimeout(() => {
      if (active.current) {
        fetchLivreurs(active);
      }
    }, 0);
    return () => {
      active.current = false;
    };
  }, []);

  if (loading) return <p className="text-gray-500">Chargement des livreurs...</p>;

  return (
    <div className="bg-white p-6 rounded-xl border shadow-sm text-gray-800">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">Gestion de la Flotte de Livreurs</h3>
        <p className="text-sm text-gray-500">Liste des agents de livraison enregistrés sur l&apos;application mobile.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b text-gray-400 text-xs font-semibold uppercase">
              <th className="p-4">Nom du livreur</th>
              <th className="p-4">Téléphone</th>
              <th className="p-4">ID Agent</th>
              <th className="p-4 text-right">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {livreurs.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-400">Aucun livreur inscrit pour le moment.</td>
              </tr>
            ) : (
              livreurs.map((livreur) => (
                <tr key={livreur.id} className="hover:bg-gray-50/50">
                  <td className="p-4 font-medium text-gray-900">{livreur.nom}</td>
                  <td className="p-4 text-gray-600">{livreur.telephone || 'Non renseigné'}</td>
                  <td className="p-4 font-mono text-xs text-gray-400">{livreur.id.slice(0, 8)}...</td>
                  <td className="p-4 text-right">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                      Opérationnel
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