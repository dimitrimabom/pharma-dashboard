'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { Store, UserPlus } from 'lucide-react';

interface Pharmacie {
  id: number;
  nom: string;
}

// Client d'authentification secondaire non persistant
// Empêche la déconnexion automatique de l'admin en cours lors de l'enregistrement de nouveaux profils
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

export default function GestionComptes() {
  const [pharmacies, setPharmacies] = useState<Pharmacie[]>([]);
  
  // États formulaire Pharmacie
  const [nomPharmacie, setNomPharmacie] = useState('');
  const [adresse, setAdresse] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  // États formulaire Nouvel Utilisateur
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nomUser, setNomUser] = useState('');
  const [telephone, setTelephone] = useState('');
  const [role, setRole] = useState('PHARMACIEN');
  const [selectedPharmacieId, setSelectedPharmacieId] = useState('');

  const [loadingPharm, setLoadingPharm] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);

  const fetchPharmacies = async (active?: { current: boolean }) => {
    const { data } = await supabase.from('pharmacies').select('id, nom').order('nom');
    if (active && !active.current) return;
    if (data) setPharmacies(data);
  };

  useEffect(() => {
    const active = { current: true };
    setTimeout(() => {
      if (active.current) {
        fetchPharmacies(active);
      }
    }, 0);
    return () => {
      active.current = false;
    };
  }, []);

  // 1. AJOUTER UNE PHARMACIE
  const handleCreerPharmacie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomPharmacie || !lat || !lng) return;
    setLoadingPharm(true);

    const wktPoint = `POINT(${parseFloat(lng)} ${parseFloat(lat)})`;

    const { error } = await supabase.from('pharmacies').insert([
      { nom: nomPharmacie, adresse, position: wktPoint }
    ]);

    setLoadingPharm(false);

    if (error) {
      alert(`Erreur pharmacie : ${error.message}`);
    } else {
      alert('Pharmacie créée avec succès !');
      setNomPharmacie('');
      setAdresse('');
      setLat('');
      setLng('');
      fetchPharmacies();
    }
  };

  // 2. CRÉER UN COMPTE (ADMIN OU PHARMACIEN)
  const handleCreerCompte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !nomUser) return;
    setLoadingUser(true);

    // On utilise authTempClient à la place du client global
    // ce qui résout définitivement le bug de déconnexion de l'administrateur
    const { data, error } = await authTempClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          nom: nomUser,
          telephone: telephone,
          role: role,
          email_verified: true, // Automatiquement vérifié si créé par l'admin
        }
      }
    });

    if (error) {
      alert(`Erreur création compte : ${error.message}`);
      setLoadingUser(false);
      return;
    }

    const newUserId = data.user?.id;

    // Si c'est un pharmacien et qu'une pharmacie est sélectionnée, on crée le lien Many-to-Many
    if (role === 'PHARMACIEN' && selectedPharmacieId && newUserId) {
      const { error: linkError } = await supabase
        .from('pharmacie_personnel')
        .insert([{
          pharmacie_id: parseInt(selectedPharmacieId),
          pharmacien_id: newUserId
        }]);

      if (linkError) console.error("Erreur de liaison à l'officine :", linkError);
    }

    // Envoi du mail de bienvenue contenant les identifiants via l'API Resend
    try {
      await fetch('/app/../api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: 'Création de votre compte PharmaGeo',
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1f2937;">
              <h2 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px;">Bienvenue sur PharmaGeo !</h2>
              <p>Bonjour <strong>${nomUser}</strong>,</p>
              <p>Un administrateur a créé votre compte sur la plateforme PharmaGeo avec le rôle de <strong>${role}</strong>.</p>
              <p>Voici vos identifiants pour vous connecter à l'application :</p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
                <p style="margin: 5px 0;"><strong>Adresse Email :</strong> ${email}</p>
                <p style="margin: 5px 0;"><strong>Mot de passe temporaire :</strong> ${password}</p>
              </div>
              <p>Pour des raisons de sécurité, nous vous conseillons de modifier votre mot de passe dès votre première connexion.</p>
              <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="font-size: 11px; color: #9ca3af; text-align: center;">© 2026 PharmaGeo. Service de messagerie automatique.</p>
            </div>
          `
        })
      });
    } catch (mailErr) {
      console.error("Erreur d'envoi du mail de bienvenue :", mailErr);
    }

    setLoadingUser(false);
    alert(`Compte ${role} créé avec succès et e-mail d'activation envoyé !`);
    
    // Réinitialisation
    setEmail('');
    setPassword('');
    setNomUser('');
    setTelephone('');
    setSelectedPharmacieId('');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-zinc-850 dark:text-zinc-100 max-w-6xl mx-auto transition-colors">
      
      {/* FORMULAIRE CRÉATION PHARMACIE */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Store size={16} className="text-emerald-600" /> Enregistrer une Officine
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Ajouter une nouvelle pharmacie partenaire sur la plateforme.</p>
        </div>
        
        <form onSubmit={handleCreerPharmacie} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Nom de l&apos;officine</label>
            <input 
              type="text" 
              placeholder="Ex: Pharmacie de la Gare" 
              required 
              value={nomPharmacie} 
              onChange={(e) => setNomPharmacie(e.target.value)} 
              className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-950 transition" 
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Adresse / Quartier</label>
            <input 
              type="text" 
              placeholder="Ex: Boulevard de la Réunification, Douala" 
              value={adresse} 
              onChange={(e) => setAdresse(e.target.value)} 
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
            disabled={loadingPharm}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl font-semibold text-sm transition shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {loadingPharm ? 'Création...' : 'Créer la Pharmacie'}
          </button>
        </form>
      </div>

      {/* FORMULAIRE CRÉATION COMPTE */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <UserPlus size={16} className="text-emerald-600" /> Créer un Compte Équipe
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Ajouter un nouveau compte (Pharmacien ou Admin) sans fermer votre session.</p>
        </div>
        
        <form onSubmit={handleCreerCompte} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Nom complet</label>
            <input 
              type="text" 
              placeholder="Ex: Dr. Jean Dupont" 
              required 
              value={nomUser} 
              onChange={(e) => setNomUser(e.target.value)} 
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
                <option value="">-- Choisir une pharmacie --</option>
                {pharmacies.map((p) => (
                  <option key={p.id} value={p.id}>{p.nom}</option>
                ))}
              </select>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loadingUser} 
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl font-semibold text-sm transition shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {loadingUser ? 'Enregistrement...' : 'Enregistrer le Profil'}
          </button>
        </form>
      </div>

    </div>
  );
}