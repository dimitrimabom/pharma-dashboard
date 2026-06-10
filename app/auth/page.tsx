'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false); // Mode Connexion par défaut
  
  // Champs communs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Champs spécifiques à l'inscription
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [role, setRole] = useState('PHARMACIEN'); // Rôle par défaut sur le Dashboard

  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      // 1. INSCRIPTION
      const { data, error } = await supabase.auth.signUp({
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
        alert(`Erreur d'inscription : ${error.message}`);
      } else {
        alert('Inscription réussie ! Vous pouvez maintenant vous connecter.');
        setIsSignUp(false);
      }
    } else {
      // 2. CONNEXION
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert(`Erreur de connexion : ${error.message}`);
      } else {
        // On utilise la redirection standard du navigateur maintenant que le middleware ne bloque plus
        window.location.replace('/');
        return;
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 text-gray-800">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-gray-950 mb-2">
          {isSignUp ? 'Créer un compte Admin/Pharmacie' : 'Connexion Dashboard'}
        </h2>
        <p className="text-sm text-center text-gray-500 mb-6">PharmaGeo Management System</p>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Nom Complet / Nom de l'officine</label>
                <input
                  type="text"
                  required
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-gray-900 bg-white"
                  placeholder="Ex: Pharmacie du Centre"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Téléphone</label>
                <input
                  type="tel"
                  required
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-gray-900 bg-white"
                  placeholder="Ex: 690000000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Votre Rôle</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-gray-900 bg-white"
                >
                  <option value="PHARMACIEN">Pharmacien (Gérer une officine)</option>
                  <option value="ADMIN">Administrateur Général</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Adresse Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-gray-900 bg-white"
              placeholder="pharmacien@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Mot de passe</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-gray-900 bg-white"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white p-3 rounded-lg font-medium hover:bg-green-700 transition disabled:bg-gray-400"
          >
            {loading ? 'Chargement...' : isSignUp ? "S'inscrire" : 'Se connecter'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-green-600 hover:underline font-medium"
          >
            {isSignUp ? 'Déjà un compte ? Se connecter' : "Pas encore de compte ? S'inscrire"}
          </button>
        </div>
      </div>
    </div>
  );
}