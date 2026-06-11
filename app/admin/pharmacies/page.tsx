'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Pharmacie {
  id: number;
  nom: string;
  adresse: string;
  telephone: string;
  position: {
    type: string;
    coordinates: number[];
  } | null;
}

export default function AdminPharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<Pharmacie[]>([]);
  const [loading, setLoading] = useState(true);

  // États formulaire
  const [nom, setNom] = useState('');
  const [adresse, setAdresse] = useState('');
  const [telephone, setTelephone] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [loadingForm, setLoadingForm] = useState(false);

  const fetchPharmacies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pharmacies')
      .select('*')
      .order('id', { ascending: false });
    
    if (error) {
      console.error(error.message);
    } else {
      setPharmacies(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    const init = async () => {
      if (active) {
        await fetchPharmacies();
      }
    };
    init();
    return () => {
      active = false;
    };
  }, []);

  const handleCreerPharmacie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom || !lat || !lng) return;
    setLoadingForm(true);

    const wktPoint = `POINT(${parseFloat(lng)} ${parseFloat(lat)})`;

    const { error } = await supabase.from('pharmacies').insert([
      { nom, adresse, telephone, position: wktPoint }
    ]);

    setLoadingForm(false);

    if (error) {
      alert(`Erreur lors de la création : ${error.message}`);
    } else {
      alert('Pharmacie créée avec succès !');
      setNom('');
      setAdresse('');
      setTelephone('');
      setLat('');
      setLng('');
      fetchPharmacies();
    }
  };

  const handleSupprimerPharmacie = async (id: number) => {
    if (!confirm("Voulez-vous vraiment retirer cette pharmacie partenaire ? Ses stocks associés seront également affectés.")) return;

    const { error } = await supabase
      .from('pharmacies')
      .delete()
      .eq('id', id);

    if (error) {
      alert(`Erreur lors de la suppression : ${error.message}`);
    } else {
      fetchPharmacies();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-zinc-850 dark:text-zinc-100 transition-colors">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white">Gestion des Pharmacies Partenaires</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Enregistrez de nouvelles officines dans le réseau et gérez la base géographique.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* FORMULAIRE D'ENREGISTREMENT */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Nouvelle Officine</h3>
          
          <form onSubmit={handleCreerPharmacie} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Nom de l&apos;officine</label>
              <input 
                type="text" 
                placeholder="Ex: Pharmacie du Palais" 
                required 
                value={nom} 
                onChange={(e) => setNom(e.target.value)} 
                className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-950 transition" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Adresse / Localisation</label>
              <input 
                type="text" 
                placeholder="Ex: Akwa, Face Boulangerie, Douala" 
                value={adresse} 
                onChange={(e) => setAdresse(e.target.value)} 
                className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-950 transition" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Téléphone de l&apos;officine</label>
              <input 
                type="tel" 
                placeholder="Ex: 677777777" 
                value={telephone} 
                onChange={(e) => setTelephone(e.target.value)} 
                className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-950 transition" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Latitude</label>
                <input 
                  type="number" 
                  step="any" 
                  placeholder="Ex: 4.0503" 
                  required 
                  value={lat} 
                  onChange={(e) => setLat(e.target.value)} 
                  className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-950 transition" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Longitude</label>
                <input 
                  type="number" 
                  step="any" 
                  placeholder="Ex: 9.7679" 
                  required 
                  value={lng} 
                  onChange={(e) => setLng(e.target.value)} 
                  className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-950 transition" 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loadingForm}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl font-semibold text-sm transition shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loadingForm ? 'Création...' : 'Créer la Pharmacie'}
            </button>
          </form>
        </div>

        {/* LISTE DES PHARMACIES */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-zinc-200/50 dark:border-zinc-800/50">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
              Pharmacies partenaires ({pharmacies.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200/50 dark:border-zinc-800/50 text-zinc-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider bg-zinc-50/50 dark:bg-zinc-950/20">
                  <th className="p-4">Désignation</th>
                  <th className="p-4">Adresse</th>
                  <th className="p-4">Téléphone</th>
                  <th className="p-4">GPS (Lat, Lng)</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-400">Chargement...</td>
                  </tr>
                ) : pharmacies.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-400">Aucune pharmacie enregistrée.</td>
                  </tr>
                ) : (
                  pharmacies.map((pharm) => {
                    const hasCoords = pharm.position && Array.isArray(pharm.position.coordinates);
                    const latStr = hasCoords ? pharm.position!.coordinates[1].toFixed(5) : '-';
                    const lngStr = hasCoords ? pharm.position!.coordinates[0].toFixed(5) : '-';

                    return (
                      <tr key={pharm.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/10 transition">
                        <td className="p-4 font-semibold text-zinc-900 dark:text-white">{pharm.nom}</td>
                        <td className="p-4 text-zinc-650 dark:text-zinc-350">{pharm.adresse || 'N/A'}</td>
                        <td className="p-4 text-zinc-650 dark:text-zinc-350 font-mono text-xs">{pharm.telephone || 'N/A'}</td>
                        <td className="p-4 text-zinc-500 font-mono text-xs">
                          {hasCoords ? `${latStr}, ${lngStr}` : 'Non défini'}
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => handleSupprimerPharmacie(pharm.id)}
                            className="px-2 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/45 text-red-650 dark:text-red-400 rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            Retirer
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
