'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

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

  // Champs du formulaire de création de pharmacie
  const [nomPharmacie, setNomPharmacie] = useState('');
  const [adresse, setAdresse] = useState('');
  const [telephone, setTelephone] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // Gestion des stocks
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [listeMedicaments, setListeMedicaments] = useState<Medicament[]>([]);
  const [selectedMedId, setSelectedMedId] = useState('');
  const [quantiteStock, setQuantiteStock] = useState('');

  // 1. Vérifier si ce pharmacien possède déjà une pharmacie enregistrée
  const checkPharmacie = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Chercher la pharmacie liée à ce pharmacien via la table intermédiaire
    const { data: lien, error } = await supabase
      .from('pharmacie_personnel')
      .select('pharmacie_id, pharmacies (*)')
      .eq('pharmacien_id', user.id)
      .maybeSingle();

    if (lien && lien.pharmacies) {
      const dataPharmacie = lien.pharmacies as any;
      setPharmacie(dataPharmacie);
      fetchStocks(dataPharmacie.id);
      fetchCatalogueMedicaments();
    } else {
      setLoading(false);
    }
  };

  // 2. Récupérer le catalogue global des médicaments pour le menu déroulant
  const fetchCatalogueMedicaments = async () => {
    const { data } = await supabase.from('medicaments').select('id, nom').order('nom');
    if (data) setListeMedicaments(data);
  };

  // 3. Récupérer le stock actuel de cette pharmacie
  const fetchStocks = async (pharmacieId: number) => {
    const { data, error } = await supabase
      .from('stocks')
      .select('id, medicament_id, quantite, medicaments(nom)')
      .eq('pharmacie_id', pharmacieId);

    if (data) setStocks(data as any);
  };

  useEffect(() => {
    checkPharmacie();
  }, []);

  // 5. ACTION : Mettre à jour ou ajouter un produit dans le stock
  const gererStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacie || !selectedMedId || !quantiteStock) return;

    const { error } = await supabase
      .from('stocks')
      .upsert({
        pharmacie_id: pharmacie.id,
        medicament_id: parseInt(selectedMedId),
        quantite: parseInt(quantiteStock)
      }, { onConflict: 'pharmacie_id,medicament_id' }); // Évite les doublons, met à jour si ça existe déjà

    if (error) {
      alert(`Erreur de stock : ${error.message}`);
    } else {
      setQuantiteStock('');
      fetchStocks(pharmacie.id);
    }
  };

  if (loading) return <p className="text-center text-gray-500">Chargement de votre espace...</p>;

  // --- RENDU ÉTAPE A : LE PHARMACIEN N'A PAS ENCORE CONFIGURÉ SA PHARMACIE ---
  if (!pharmacie) {
    return (
      <div className="max-w-xl mx-auto bg-white p-8 rounded-xl shadow-sm border text-center text-gray-800">
        <h2 className="text-xl font-bold text-gray-900 mb-2">🏬 Accès en attente d'affectation</h2>
        <p className="text-sm text-gray-600">
          Votre compte n'est rattaché à aucune officine pour le moment. 
          Veuillez contacter l'Administrateur Général pour qu'il vous affecte à votre pharmacie depuis l'onglet "Structures & Comptes".
        </p>
      </div>
    );
  }

  // --- RENDU ÉTAPE B : LA PHARMACIE EXISTE, ON GÈRE LES STOCKS ---
  return (
    <div className="max-w-5xl mx-auto text-gray-800">
      <div className="mb-8 p-6 bg-white rounded-xl border flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{pharmacie.nom}</h2>
          <p className="text-sm text-gray-500">📍 {pharmacie.adresse || 'Aucune adresse renseignée'} | 📞 {pharmacie.telephone || 'Pas de numéro'}</p>
        </div>
        <span className="px-3 py-1 bg-green-100 text-green-700 font-semibold text-xs rounded-full">Officine Active</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* FORMULAIRE D'AJOUT AU STOCK */}
        <div className="bg-white p-6 rounded-xl border h-fit">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Mettre à jour un Stock</h3>
          <form onSubmit={gererStock} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Sélectionner le médicament</label>
              <select required value={selectedMedId} onChange={(e) => setSelectedMedId(e.target.value)} className="w-full p-2.5 border rounded-lg text-gray-900 bg-white">
                <option value="">-- Choisir un produit --</option>
                {listeMedicaments.map((med) => (
                  <option key={med.id} value={med.id}>{med.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Quantité actuellement en rayon</label>
              <input type="number" required min="0" placeholder="Ex: 50" value={quantiteStock} onChange={(e) => setQuantiteStock(e.target.value)} className="w-full p-2.5 border rounded-lg text-gray-900 bg-white" />
            </div>
            <button type="submit" className="w-full bg-green-600 text-white p-2.5 rounded-lg font-medium hover:bg-green-700 transition">
              Enregistrer le stock
            </button>
          </form>
        </div>

        {/* LISTE DES STOCKS DE LA PHARMACIE */}
        <div className="md:col-span-2 bg-white rounded-xl border overflow-hidden">
          <div className="p-6 border-b bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-700">Vos produits en rayon ({stocks.length})</h3>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-gray-400 text-xs font-semibold uppercase bg-gray-50/50">
                <th className="p-4">Médicament</th>
                <th className="p-4 w-32">Quantité en stock</th>
                <th className="p-4 w-32">Disponibilité</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {stocks.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-400">Votre stock est vide. Ajoutez vos premiers médicaments.</td>
                </tr>
              ) : (
                stocks.map((stk) => (
                  <tr key={stk.id} className="hover:bg-gray-50/50">
                    <td className="p-4 font-medium text-gray-900">{stk.medicaments?.nom}</td>
                    <td className="p-4 text-gray-600 font-mono font-bold">{stk.quantite} boîtes</td>
                    <td className="p-4">
                      {stk.quantite > 0 ? (
                        <span className="px-2.5 py-0.5 bg-green-50 text-green-700 text-xs font-semibold rounded-full">En stock</span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-red-50 text-red-700 text-xs font-semibold rounded-full">Rupture</span>
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
  );
}