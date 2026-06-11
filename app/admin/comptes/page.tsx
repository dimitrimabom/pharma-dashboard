'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

interface Pharmacie {
  id: number;
  nom: string;
}

// Client d'authentification temporaire pour éviter de déconnecter l'admin actif
const authTempClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

export default function AdminComptesPage() {
  const [pharmacies, setPharmacies] = useState<Pharmacie[]>([]);
  const [loading, setLoading] = useState(false);

  // États du formulaire
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [role, setRole] = useState('PHARMACIEN');
  const [selectedPharmacieId, setSelectedPharmacieId] = useState('');

  useEffect(() => {
    let active = true;
    const loadPharmacies = async () => {
      const { data } = await supabase.from('pharmacies').select('id, nom').order('nom');
      if (active && data) {
        setPharmacies(data);
      }
    };
    loadPharmacies();
    return () => {
      active = false;
    };
  }, []);

  const handleCreerCompte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !nom) return;
    setLoading(true);

    // Enregistrement via le client temporaire
    const { data, error } = await authTempClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          nom: nom,
          telephone: telephone,
          role: role,
        }
      }
    });

    if (error) {
      alert(`Erreur lors de la création : ${error.message}`);
      setLoading(false);
      return;
    }

    const newUserId = data.user?.id;

    // Si c'est un pharmacien et qu'une pharmacie est sélectionnée, créer la liaison
    if (role === 'PHARMACIEN' && selectedPharmacieId && newUserId) {
      const { error: linkError } = await supabase
        .from('pharmacie_personnel')
        .insert([{
          pharmacie_id: parseInt(selectedPharmacieId),
          pharmacien_id: newUserId
        }]);

      if (linkError) {
        console.error("Erreur de liaison à l'officine :", linkError);
      }
    }

    setLoading(false);
    alert(`Compte ${role} créé avec succès !`);

    // Réinitialisation
    setEmail('');
    setPassword('');
    setNom('');
    setTelephone('');
    setSelectedPharmacieId('');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 text-zinc-850 dark:text-zinc-100 transition-colors">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white">Gestion des Comptes Équipe</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Enregistrez de nouveaux pharmaciens ou administrateurs généraux.</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Créer un Compte</h3>
        
        <form onSubmit={handleCreerCompte} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Nom complet</label>
            <input 
              type="text" 
              placeholder="Ex: Dr. Dimitri Mabom" 
              required 
              value={nom} 
              onChange={(e) => setNom(e.target.value)} 
              className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-950 transition" 
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Téléphone</label>
            <input 
              type="tel" 
              placeholder="Ex: 699999999" 
              value={telephone} 
              onChange={(e) => setTelephone(e.target.value)} 
              className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-950 transition" 
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Adresse Email</label>
            <input 
              type="email" 
              placeholder="Ex: pharmacien@pharmageo.com" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-950 transition" 
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Mot de passe temporaire</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-950 transition" 
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Rôle du compte</label>
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value)} 
              className="w-full p-2.5 border border-zinc-200 dark:border-zinc-805 rounded-xl outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-950 transition focus:ring-2 focus:ring-emerald-500"
            >
              <option value="PHARMACIEN">Pharmacien (Affecté à une officine)</option>
              <option value="ADMIN">Nouvel Administrateur Général</option>
              <option value="LIVREUR">Livreur (Agent de livraison)</option>
            </select>
          </div>

          {role === 'PHARMACIEN' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Affecter à quelle Pharmacie ?</label>
              <select 
                value={selectedPharmacieId} 
                onChange={(e) => setSelectedPharmacieId(e.target.value)} 
                className="w-full p-2.5 border border-zinc-200 dark:border-zinc-805 rounded-xl outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-950 transition focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Choisir une pharmacie partenaire --</option>
                {pharmacies.map((p) => (
                  <option key={p.id} value={p.id}>{p.nom}</option>
                ))}
              </select>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl font-semibold text-sm transition shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Création en cours...' : 'Enregistrer le Profil'}
          </button>
        </form>
      </div>
    </div>
  );
}
