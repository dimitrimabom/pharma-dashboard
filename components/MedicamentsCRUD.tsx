'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search } from 'lucide-react';

interface Medicament {
  id: number;
  nom: string;
  description?: string | null;
  prix_indicatif: number;
}

export default function MedicamentsCRUD() {
  const [medicaments, setMedicaments] = useState<Medicament[]>([]);
  const [nom, setNom] = useState('');
  const [prix, setPrix] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // États pour la modification (Update)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingNom, setEditingNom] = useState('');
  const [editingPrix, setEditingPrix] = useState('');
  const [editingDescription, setEditingDescription] = useState('');

  // 1. READ : Récupérer les médicaments depuis Supabase
  const fetchMedicaments = async (active?: { current: boolean }) => {
    const { data, error } = await supabase
      .from('medicaments')
      .select('*')
      .order('id', { ascending: true });
    
    if (active && !active.current) return;
    if (error) {
      console.error("Erreur de récupération :", error.message);
    } else {
      setMedicaments(data || []);
    }
  };

  useEffect(() => {
    const active = { current: true };
    setTimeout(() => {
      if (active.current) {
        fetchMedicaments(active);
      }
    }, 0);
    return () => {
      active.current = false;
    };
  }, []);

  // 2. CREATE : Ajouter un médicament
  const ajouterMedicament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom || !prix) return;

    const { error } = await supabase
      .from('medicaments')
      .insert([{ nom, description: description || null, prix_indicatif: parseFloat(prix) }]);

    if (error) {
      alert(`Erreur lors de l'ajout : ${error.message}`);
    } else {
      setNom('');
      setPrix('');
      setDescription('');
      fetchMedicaments(); // Recharger la liste
    }
  };

  // 3. UPDATE : Activer le mode édition pour une ligne
  const demarrerEdition = (med: Medicament) => {
    setEditingId(med.id);
    setEditingNom(med.nom);
    setEditingPrix(med.prix_indicatif.toString());
    setEditingDescription(med.description || '');
  };

  // 3. UPDATE : Enregistrer les modifications dans Supabase
  const sauvegarderEdition = async (id: number) => {
    if (!editingNom || !editingPrix) return;

    const { error } = await supabase
      .from('medicaments')
      .update({ 
        nom: editingNom, 
        description: editingDescription || null, 
        prix_indicatif: parseFloat(editingPrix) 
      })
      .eq('id', id);

    if (error) {
      alert(`Erreur lors de la modification : ${error.message}`);
    } else {
      setEditingId(null);
      setEditingDescription('');
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

  // Filtrer les médicaments selon la recherche
  const medicamentsFiltrés = medicaments.filter((med) =>
    med.nom.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-zinc-800 dark:text-zinc-100 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white">Catalogue Global des Médicaments</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Ajoutez et gérez les produits disponibles pour l&apos;ensemble du réseau PharmaGeo.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* FORMULAIRE DE CRÉATION (CREATE) */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 space-y-4">
          <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Nouveau Médicament</h3>
          
          <form onSubmit={ajouterMedicament} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Nom du produit</label>
              <input
                type="text"
                required
                placeholder="Ex: Paracétamol 500mg"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-900 shadow-sm transition"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Description du produit</label>
              <textarea
                placeholder="Ex: Antalgique contre la fièvre et la douleur..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-900 shadow-sm transition resize-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Prix indicatif (FCFA)</label>
              <input
                type="number"
                required
                min="0"
                placeholder="Ex: 1500"
                value={prix}
                onChange={(e) => setPrix(e.target.value)}
                className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-900 shadow-sm transition"
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl font-semibold text-sm transition shadow-sm active:scale-[0.98] cursor-pointer"
            >
              Ajouter au catalogue
            </button>
          </form>
        </div>

        {/* TABLEAU D'AFFICHAGE (READ, UPDATE, DELETE) */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden">
          
          {/* Header avec Barre de recherche */}
          <div className="p-5 border-b border-zinc-200/50 dark:border-zinc-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
              Liste des Médicaments ({medicamentsFiltrés.length})
            </h3>
            
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-xs text-zinc-900 dark:text-white bg-zinc-50 dark:bg-zinc-950 transition"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200/50 dark:border-zinc-800/50 text-zinc-400 dark:text-zinc-500 text-[10px] uppercase font-bold tracking-wider bg-zinc-50/50 dark:bg-zinc-950/20">
                  <th className="p-4 w-20">ID</th>
                  <th className="p-4">Désignation</th>
                  <th className="p-4 w-36">Prix indicatif</th>
                  <th className="p-4 w-44 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-sm">
                {medicamentsFiltrés.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                      {searchQuery ? "Aucun médicament ne correspond à votre recherche." : "Aucun médicament disponible dans le catalogue."}
                    </td>
                  </tr>
                ) : (
                  medicamentsFiltrés.map((med) => (
                    <tr key={med.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/10 transition">
                      <td className="p-4 font-mono text-xs text-zinc-400 dark:text-zinc-500">#{med.id}</td>
                      
                      {/* Cellule Nom & Description */}
                      <td className="p-4">
                        {editingId === med.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editingNom}
                              onChange={(e) => setEditingNom(e.target.value)}
                              className="w-full p-2 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-955 shadow-sm transition"
                              placeholder="Nom du produit"
                            />
                            <textarea
                              value={editingDescription}
                              onChange={(e) => setEditingDescription(e.target.value)}
                              className="w-full p-2 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-xs text-zinc-900 dark:text-white bg-white dark:bg-zinc-955 shadow-sm transition resize-none"
                              placeholder="Description du produit"
                              rows={2}
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="font-semibold text-zinc-900 dark:text-white">{med.nom}</div>
                            {med.description && (
                              <div className="text-xs text-zinc-450 dark:text-zinc-400 mt-0.5 line-clamp-2 max-w-sm">
                                {med.description}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Cellule Prix */}
                      <td className="p-4">
                        {editingId === med.id ? (
                          <input
                            type="number"
                            value={editingPrix}
                            onChange={(e) => setEditingPrix(e.target.value)}
                            className="w-full p-2 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-950 shadow-sm transition"
                          />
                        ) : (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                            {med.prix_indicatif.toLocaleString()} FCFA
                          </span>
                        )}
                      </td>

                      {/* Boutons d'actions */}
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        {editingId === med.id ? (
                          <>
                            <button 
                              onClick={() => sauvegarderEdition(med.id)} 
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                            >
                              Sauver
                            </button>
                            <button 
                              onClick={() => setEditingId(null)} 
                              className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                            >
                              Annuler
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => demarrerEdition(med)} 
                              className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-650 dark:text-zinc-350 rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              Modifier
                            </button>
                            <button 
                              onClick={() => supprimerMedicament(med.id)} 
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/45 text-red-650 dark:text-red-405 rounded-lg text-xs font-bold transition cursor-pointer"
                            >
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