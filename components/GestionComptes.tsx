'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Pharmacie {
  id: number;
  nom: string;
}

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

  const [loading, setLoading] = useState(false);

  const fetchPharmacies = async () => {
    const { data } = await supabase.from('pharmacies').select('id, nom').order('nom');
    if (data) setPharmacies(data);
  };

  useEffect(() => {
    fetchPharmacies();
  }, []);

  // 1. AJOUTER UNE PHARMACIE
  const handleCreerPharmacie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomPharmacie || !lat || !lng) return;

    const wktPoint = `POINT(${parseFloat(lng)} ${parseFloat(lat)})`;

    const { error } = await supabase.from('pharmacies').insert([
      { nom: nomPharmacie, adresse, position: wktPoint }
    ]);

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
    setLoading(false);

    // ATTENTION : Pour qu'un admin crée un compte sans être déconnecté lui-même,
    // on utilise la fonction signUp classique de Supabase.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nom: nomUser,
          telephone: telephone,
          role: role,
        }
      }
    });

    if (error) {
      alert(`Erreur création compte : ${error.message}`);
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

    alert(`Compte ${role} créé avec succès !`);
    setEmail('');
    setPassword('');
    setNomUser('');
    setTelephone('');
    setSelectedPharmacieId('');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-gray-800 max-w-5xl mx-auto">
      
      {/* FORMULAIRE CRÉATION PHARMACIE */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">🏬 Enregistrer une Nouvelle Pharmacie</h3>
        <form onSubmit={handleCreerPharmacie} className="space-y-4">
          <input type="text" placeholder="Nom de l'officine" required value={nomPharmacie} onChange={(e) => setNomPharmacie(e.target.value)} className="w-full p-2.5 border rounded-lg text-gray-900 bg-white" />
          <input type="text" placeholder="Adresse / Quartier" value={adresse} onChange={(e) => setAdresse(e.target.value)} className="w-full p-2.5 border rounded-lg text-gray-900 bg-white" />
          <div className="grid grid-cols-2 gap-4">
            <input type="number" step="any" placeholder="Latitude" required value={lat} onChange={(e) => setLat(e.target.value)} className="w-full p-2.5 border rounded-lg text-gray-900 bg-white" />
            <input type="number" step="any" placeholder="Longitude" required value={lng} onChange={(e) => setLng(e.target.value)} className="w-full p-2.5 border rounded-lg text-gray-900 bg-white" />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white p-2.5 rounded-lg font-medium hover:bg-blue-700 transition">
            Créer la Pharmacie
          </button>
        </form>
      </div>

      {/* FORMULAIRE CRÉATION COMPTE (ADMIN / PHARMACIEN MULTIPLE) */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">👤 Créer un Compte Équipe</h3>
        <form onSubmit={handleCreerCompte} className="space-y-4">
          <input type="text" placeholder="Nom complet" required value={nomUser} onChange={(e) => setNomUser(e.target.value)} className="w-full p-2.5 border rounded-lg text-gray-900 bg-white" />
          <input type="tel" placeholder="Téléphone" value={telephone} onChange={(e) => setTelephone(e.target.value)} className="w-full p-2.5 border rounded-lg text-gray-900 bg-white" />
          <input type="email" placeholder="Adresse Email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2.5 border rounded-lg text-gray-900 bg-white" />
          <input type="password" placeholder="Mot de passe temporaire" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2.5 border rounded-lg text-gray-900 bg-white" />
          
          <div>
            <label className="block text-xs text-gray-400 mb-1">Rôle du compte</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-2.5 border rounded-lg text-gray-900 bg-white">
              <option value="PHARMACIEN">Pharmacien (Affecté à une officine)</option>
              <option value="ADMIN">Nouvel Administrateur Général</option>
            </select>
          </div>

          {role === 'PHARMACIEN' && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Affecter à quelle Pharmacie ? (Optionnel - Plus tard possible)</label>
              <select value={selectedPharmacieId} onChange={(e) => setSelectedPharmacieId(e.target.value)} className="w-full p-2.5 border rounded-lg text-gray-900 bg-white">
                <option value="">-- Choisir une pharmacie existante --</option>
                {pharmacies.map((p) => (
                  <option key={p.id} value={p.id}>{p.nom}</option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-green-600 text-white p-2.5 rounded-lg font-medium hover:bg-green-700 transition">
            Enregistrer le Profil
          </button>
        </form>
      </div>

    </div>
  );
}