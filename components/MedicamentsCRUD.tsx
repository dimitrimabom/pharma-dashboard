'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Medicament {
  id: number;
  nom: string;
  prix_indicatif: number;
}

export default function MedicamentsCRUD() {
  const [medicaments, setMedicaments] = useState<Medicament[]>([]);
  const [nom, setNom] = useState('');
  const [prix, setPrix] = useState('');
  
  // États pour la modification (Update)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingNom, setEditingNom] = useState('');
  const [editingPrix, setEditingPrix] = useState('');

  // 1. READ : Récupérer les médicaments depuis Supabase
  const fetchMedicaments = async () => {
    const { data, error } = await supabase
      .from('medicaments')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) {
      console.error(error);
    } else {
      setMedicaments(data || []);
    }
  };

  useEffect(() => {
    fetchMedicaments();
  }, []);

  // 2. CREATE : Ajouter un médicament
  const ajouterMedicament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom || !prix) return;

    const { error } = await supabase
      .from('medicaments')
      .insert([{ nom, prix_indicatif: parseFloat(prix) }]);

    if (error) {
      alert(`Erreur lors de l'ajout : ${error.message}`);
    } else {
      setNom('');
      setPrix('');
      fetchMedicaments(); // Recharger la liste
    }
  };

  // 3. UPDATE : Activer le mode édition pour une ligne
  const demarrerEdition = (med: Medicament) => {
    setEditingId(med.id);
    setEditingNom(med.nom);
    setEditingPrix(med.prix_indicatif.toString());
  };

  // 3. UPDATE : Enregistrer les modifications dans Supabase
  const sauvegarderEdition = async (id: number) => {
    if (!editingNom || !editingPrix) return;

    const { error } = await supabase
      .from('medicaments')
      .update({ nom: editingNom, prix_indicatif: parseFloat(editingPrix) })
      .eq('id', id);

    if (error) {
      alert(`Erreur lors de la modification : ${error.message}`);
    } else {
      setEditingId(null);
      fetchMedicaments();
    }
  };

  // 4. DELETE : Supprimer un médicament du catalogue
  const supprimerMedicament = async (id: number) => {
    if (!confirm('Voulez-vous vraiment supprimer ce médicament du catalogue global ?')) return;

    const { error } = await supabase
      .from('medicaments')
      .delete()
      .eq('id', id);

    if (error) {
      alert(`Erreur lors de la suppression : ${error.message}`);
    } else {
      fetchMedicaments();
    }
  };

  return (
    <div className="max-w-5xl mx-auto text-gray-800">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Catalogue Global des Médicaments</h2>
        <p className="text-sm text-gray-500">Ajoutez et gérez les produits disponibles pour l'ensemble du réseau PharmaGeo.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* FORMULAIRE DE CRÉATION (CREATE) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border h-fit">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Nouveau Médicament</h3>
          <form onSubmit={ajouterMedicament} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Nom du produit</label>
              <input
                type="text"
                placeholder="Ex: Paracétamol 500mg"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-gray-950 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Prix indicatif (FCFA)</label>
              <input
                type="number"
                placeholder="Ex: 1500"
                value={prix}
                onChange={(e) => setPrix(e.target.value)}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-gray-955 bg-white"
              />
            </div>
            <button type="submit" className="w-full bg-green-600 text-white p-2.5 rounded-lg font-medium hover:bg-green-700 transition">
              Ajouter au catalogue
            </button>
          </form>
        </div>

        {/* TABLEAU D'AFFICHAGE (READ, UPDATE, DELETE) */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-700">Liste des Médicaments ({medicaments.length})</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-gray-400 text-xs uppercase font-semibold bg-gray-50/50">
                  <th className="p-4 w-16">ID</th>
                  <th className="p-4">Désignation</th>
                  <th className="p-4 w-32">Prix</th>
                  <th className="p-4 w-40 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {medicaments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-400">Aucun médicament disponible.</td>
                  </tr>
                ) : (
                  medicaments.map((med) => (
                    <tr key={med.id} className="hover:bg-gray-50/70 transition">
                      <td className="p-4 font-mono text-gray-400">#{med.id}</td>
                      
                      {/* Cellule Nom */}
                      <td className="p-4">
                        {editingId === med.id ? (
                          <input
                            type="text"
                            value={editingNom}
                            onChange={(e) => setEditingNom(e.target.value)}
                            className="w-full p-1.5 border rounded focus:ring-2 focus:ring-green-500 outline-none text-gray-950 bg-white"
                          />
                        ) : (
                          <span className="font-medium text-gray-900">{med.nom}</span>
                        )}
                      </td>

                      {/* Cellule Prix */}
                      <td className="p-4">
                        {editingId === med.id ? (
                          <input
                            type="number"
                            value={editingPrix}
                            onChange={(e) => setEditingPrix(e.target.value)}
                            className="w-full p-1.5 border rounded focus:ring-2 focus:ring-green-500 outline-none text-gray-955 bg-white"
                          />
                        ) : (
                          <span className="text-gray-600 font-medium">{med.prix_indicatif} FCFA</span>
                        )}
                      </td>

                      {/* Boutons d'actions */}
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        {editingId === med.id ? (
                          <>
                            <button onClick={() => sauvegarderEdition(med.id)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium transition">
                              Sauver
                            </button>
                            <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-xs font-medium transition">
                              Annuler
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => demarrerEdition(med)} className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-xs font-medium transition">
                              Modifier
                            </button>
                            <button onClick={() => supprimerMedicament(med.id)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-xs font-medium transition">
                              Supprimer
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}