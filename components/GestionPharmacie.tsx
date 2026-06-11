'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Store, MapPin, Phone, Search } from 'lucide-react';

interface Pharmacie {
  id: number;
  nom: string;
  adresse: string;
  telephone: string;
}

interface Medicament {
  id: number;
  nom: string;
}

interface Stock {
  id: number;
  medicament_id: number;
  quantite: number;
  medicaments: { nom: string };
}

export default function GestionPharmacie() {
  const [pharmacie, setPharmacie] = useState<Pharmacie | null>(null);
  const [loading, setLoading] = useState(true);

  // Gestion des stocks
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [listeMedicaments, setListeMedicaments] = useState<Medicament[]>([]);
  const [selectedMedId, setSelectedMedId] = useState('');
  const [quantiteStock, setQuantiteStock] = useState('');

  // Autocomplete recherche médicament
  const [medSearchQuery, setMedSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Filtrer la liste des stocks affichés
  const [stockSearchQuery, setStockSearchQuery] = useState('');

  // 3. Récupérer le stock actuel de cette pharmacie
  const fetchStocks = useCallback(async (pharmacieId: number, active?: { current: boolean }) => {
    const { data } = await supabase
      .from('stocks')
      .select('id, medicament_id, quantite, medicaments(nom)')
      .eq('pharmacie_id', pharmacieId)
      .order('id', { ascending: false });

    if (active && !active.current) return;
    if (data) setStocks(data as unknown as Stock[]);
  }, []);

  // 2. Récupérer le catalogue global des médicaments
  const fetchCatalogueMedicaments = useCallback(async (active?: { current: boolean }) => {
    const { data } = await supabase.from('medicaments').select('id, nom').order('nom');
    if (active && !active.current) return;
    if (data) setListeMedicaments(data);
  }, []);

  // 1. Vérifier si ce pharmacien possède déjà une pharmacie enregistrée
  const checkPharmacie = useCallback(async (active?: { current: boolean }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (active && !active.current) return;

    try {
      const { data: lien } = await supabase
        .from('pharmacie_personnel')
        .select('pharmacie_id, pharmacies (*)')
        .eq('pharmacien_id', user.id)
        .maybeSingle();

      if (active && !active.current) return;

      const lienTyped = lien as unknown as { pharmacie_id: number; pharmacies: Pharmacie | null } | null;
      if (lienTyped && lienTyped.pharmacies) {
        const dataPharmacie = lienTyped.pharmacies;
        setPharmacie(dataPharmacie);
        await fetchStocks(dataPharmacie.id, active);
        await fetchCatalogueMedicaments(active);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!active || active.current) {
        setLoading(false);
      }
    }
  }, [fetchStocks, fetchCatalogueMedicaments]);

  useEffect(() => {
    const active = { current: true };
    setTimeout(() => {
      if (active.current) {
        checkPharmacie(active);
      }
    }, 0);
    return () => {
      active.current = false;
    };
  }, [checkPharmacie]);

  // 4. ACTION : Mettre à jour ou ajouter un produit dans le stock
  const gererStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacie || !selectedMedId || !quantiteStock) return;

    const { error } = await supabase
      .from('stocks')
      .upsert({
        pharmacie_id: pharmacie.id,
        medicament_id: parseInt(selectedMedId),
        quantite: parseInt(quantiteStock)
      }, { onConflict: 'pharmacie_id,medicament_id' });

    if (error) {
      alert(`Erreur de stock : ${error.message}`);
    } else {
      setQuantiteStock('');
      setSelectedMedId('');
      setMedSearchQuery('');
      fetchStocks(pharmacie.id);
    }
  };

  // 5. ACTION : Ajuster la quantité (+ / -) en un clic
  const ajusterQuantite = async (medicamentId: number, quantiteActuelle: number, ajustement: number) => {
    if (!pharmacie) return;
    const nouvelleQuantite = Math.max(0, quantiteActuelle + ajustement);

    const { error } = await supabase
      .from('stocks')
      .upsert({
        pharmacie_id: pharmacie.id,
        medicament_id: medicamentId,
        quantite: nouvelleQuantite
      }, { onConflict: 'pharmacie_id,medicament_id' });

    if (error) {
      console.error("Erreur d'ajustement :", error.message);
    } else {
      fetchStocks(pharmacie.id);
    }
  };

  // 6. ACTION : Supprimer définitivement un médicament du stock
  const retirerDuStock = async (stockId: number) => {
    if (!confirm('Voulez-vous vraiment retirer ce médicament de vos rayons ?')) return;

    const { error } = await supabase
      .from('stocks')
      .delete()
      .eq('id', stockId);

    if (error) {
      alert(`Erreur de suppression : ${error.message}`);
    } else if (pharmacie) {
      fetchStocks(pharmacie.id);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto p-12 text-center flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600 mb-3" size={24} />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Chargement de votre espace officine...</p>
      </div>
    );
  }

  // --- LE PHARMACIEN N'A PAS ENCORE D'OFFICINE RATTACHÉE ---
  if (!pharmacie) {
    return (
      <div className="max-w-xl mx-auto bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 text-center text-zinc-800 dark:text-zinc-100 transition-colors flex flex-col items-center justify-center">
        <Store className="text-emerald-600 mb-3" size={36} />
        <h2 className="text-lg font-bold text-zinc-950 dark:text-white mb-2">Accès en attente d&apos;affectation</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Votre compte n&apos;est rattaché à aucune officine pour le moment. 
          Veuillez contacter l&apos;Administrateur Général pour qu&apos;il vous affecte à votre pharmacie depuis l&apos;onglet &quot;Structures &amp; Comptes&quot;.
        </p>
      </div>
    );
  }

  // Filtrer les médicaments pour le sélecteur d'ajout
  const medFiltrésDropdown = listeMedicaments.filter(med => 
    med.nom.toLowerCase().includes(medSearchQuery.toLowerCase())
  );

  // Filtrer les stocks du tableau
  const stocksFiltrés = stocks.filter(stk => 
    stk.medicaments?.nom?.toLowerCase().includes(stockSearchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-zinc-850 dark:text-zinc-100 transition-colors">
      {/* BANDEAU SUPÉRIEUR PHARMACIE */}
      <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white">{pharmacie.nom}</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center flex-wrap gap-x-2 gap-y-1">
            <span className="flex items-center gap-1"><MapPin size={12} className="text-zinc-400" /> {pharmacie.adresse || 'Aucune adresse renseignée'}</span>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <span className="flex items-center gap-1"><Phone size={12} className="text-zinc-400" /> {pharmacie.telephone || 'Pas de numéro'}</span>
          </p>
        </div>
        <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] uppercase rounded-full border border-emerald-200/50 dark:border-emerald-900/30 w-fit">
          Officine Active
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* FORMULAIRE MISE À JOUR DE STOCK */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 space-y-4">
          <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Mettre à jour un Stock</h3>
          
          <form onSubmit={gererStock} className="space-y-4">
            <div className="space-y-1 relative">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Rechercher le médicament</label>
              <input
                type="text"
                placeholder="Taper pour rechercher..."
                value={medSearchQuery}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => {
                  setMedSearchQuery(e.target.value);
                  setShowDropdown(true);
                  if (selectedMedId) setSelectedMedId(''); // Réinitialise si l'utilisateur re-saisit
                }}
                className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-900 shadow-sm transition"
              />
              
              {showDropdown && medSearchQuery.length >= 0 && (
                <div className="absolute z-20 w-full mt-1.5 max-h-48 overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl shadow-xl divide-y divide-zinc-100 dark:divide-zinc-850">
                  {medFiltrésDropdown.length === 0 ? (
                    <div className="p-3 text-xs text-zinc-400 text-center">Aucun médicament trouvé</div>
                  ) : (
                    medFiltrésDropdown.map((med) => (
                      <button
                        key={med.id}
                        type="button"
                        onClick={() => {
                          setSelectedMedId(med.id.toString());
                          setMedSearchQuery(med.nom);
                          setShowDropdown(false);
                        }}
                        className="w-full text-left p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-xs font-semibold transition text-zinc-900 dark:text-white cursor-pointer"
                      >
                        {med.nom}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Quantité actuellement en rayon</label>
              <input
                type="number"
                required
                min="0"
                placeholder="Ex: 50"
                value={quantiteStock}
                onChange={(e) => setQuantiteStock(e.target.value)}
                className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-900 shadow-sm transition"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={!selectedMedId}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 text-white disabled:text-zinc-400 dark:disabled:text-zinc-500 p-2.5 rounded-xl font-semibold text-sm transition shadow-sm active:scale-[0.98] cursor-pointer"
            >
              Enregistrer le stock
            </button>
          </form>
        </div>

        {/* LISTE DES STOCKS DE LA PHARMACIE */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden">
          
          {/* En-tête avec filtrage du stock en direct */}
          <div className="p-5 border-b border-zinc-200/50 dark:border-zinc-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
              Vos produits en rayon ({stocksFiltrés.length})
            </h3>

            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Rechercher dans votre stock..."
                value={stockSearchQuery}
                onChange={(e) => setStockSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-xs text-zinc-900 dark:text-white bg-zinc-50 dark:bg-zinc-950 transition"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200/50 dark:border-zinc-800/50 text-zinc-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider bg-zinc-50/50 dark:bg-zinc-950/20">
                  <th className="p-4">Médicament</th>
                  <th className="p-4 w-40 text-center">Quantité</th>
                  <th className="p-4 w-28 text-center">Disponibilité</th>
                  <th className="p-4 w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-sm">
                {stocksFiltrés.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                      {stockSearchQuery ? "Aucun médicament du stock ne correspond à votre recherche." : "Votre rayon est vide. Ajoutez vos premiers médicaments à gauche."}
                    </td>
                  </tr>
                ) : (
                  stocksFiltrés.map((stk) => (
                    <tr key={stk.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/10 transition">
                      {/* Nom médicament */}
                      <td className="p-4 font-semibold text-zinc-900 dark:text-white">{stk.medicaments?.nom}</td>
                      
                      {/* Quantité avec ajusteurs rapides */}
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-2.5">
                          <button
                            onClick={() => ajusterQuantite(stk.medicament_id, stk.quantite, -1)}
                            className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 font-black text-xs text-zinc-500 dark:text-zinc-400 transition cursor-pointer flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="w-16 text-center font-bold font-mono text-zinc-900 dark:text-white">
                            {stk.quantite}
                          </span>
                          <button
                            onClick={() => ajusterQuantite(stk.medicament_id, stk.quantite, 1)}
                            className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 font-black text-xs text-zinc-500 dark:text-zinc-400 transition cursor-pointer flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Statut disponibilité */}
                      <td className="p-4 text-center">
                        {stk.quantite > 0 ? (
                          <span className="px-2 py-0.5 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-[10px] font-bold uppercase rounded-md border border-green-200/50 dark:border-green-900/30">
                            En stock
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-[10px] font-bold uppercase rounded-md border border-red-200/50 dark:border-red-900/30">
                            Rupture
                          </span>
                        )}
                      </td>

                      {/* Bouton de retrait */}
                      <td className="p-4 text-right">
                        <button
                          onClick={() => retirerDuStock(stk.id)}
                          className="px-2 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/45 text-red-650 dark:text-red-400 rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          Retirer
                        </button>
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