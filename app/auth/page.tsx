'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Sparkles, Activity } from 'lucide-react';

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
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCodeInput, setVerificationCodeInput] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      // 1. INSCRIPTION
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nom: nom,
            telephone: telephone,
            role: role,
            verification_code: generatedCode,
            email_verified: false,
          }
        }
      });

      if (error) {
        alert(`Erreur d'inscription : ${error.message}`);
      } else {
        // Envoi du code via l'API Resend
        try {
          await fetch('/app/../api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: email,
              subject: 'Votre code de vérification PharmaGeo',
              html: `
                <div style="font-family: sans-serif; padding: 20px; color: #1f2937;">
                  <h2 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px;">Bienvenue sur PharmaGeo !</h2>
                  <p>Bonjour <strong>${nom}</strong>,</p>
                  <p>Merci de vous être inscrit sur notre plateforme de supervision. Veuillez utiliser le code de vérification ci-dessous pour valider votre adresse e-mail et activer votre compte :</p>
                  <div style="background-color: #f3f4f6; padding: 15px; border-radius: 12px; font-size: 28px; font-weight: bold; letter-spacing: 6px; text-align: center; margin: 25px 0; color: #059669; border: 1px solid #e5e7eb;">
                    ${generatedCode}
                  </div>
                  <p>Ce code est valide pendant 15 minutes. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.</p>
                  <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                  <p style="font-size: 11px; color: #9ca3af; text-align: center;">© 2026 PharmaGeo. Service de messagerie automatique.</p>
                </div>
              `
            })
          });
          setShowVerification(true);
          alert('Compte créé ! Un code de vérification à 6 chiffres a été envoyé par e-mail.');
        } catch (mailErr) {
          console.error("Erreur d'envoi d'e-mail :", mailErr);
          setShowVerification(true);
        }
      }
    } else {
      // 2. CONNEXION
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert(`Erreur de connexion : ${error.message}`);
      } else if (data.user) {
        const isVerified = data.user.user_metadata?.email_verified;

        if (isVerified === false) {
          // Bloquer l'accès, générer un nouveau code de vérification et l'envoyer
          const newCode = Math.floor(100000 + Math.random() * 900000).toString();
          await supabase.auth.updateUser({
            data: { verification_code: newCode }
          });

          try {
            await fetch('/app/../api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: email,
                subject: 'Votre code de vérification PharmaGeo',
                html: `
                  <div style="font-family: sans-serif; padding: 20px; color: #1f2937;">
                    <h2 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px;">Vérification de connexion PharmaGeo</h2>
                    <p>Bonjour,</p>
                    <p>Votre adresse e-mail n'est pas encore validée. Veuillez utiliser le code ci-dessous pour confirmer votre compte :</p>
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 12px; font-size: 28px; font-weight: bold; letter-spacing: 6px; text-align: center; margin: 25px 0; color: #059669; border: 1px solid #e5e7eb;">
                      ${newCode}
                    </div>
                    <p>Ce code est valide pendant 15 minutes.</p>
                    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                    <p style="font-size: 11px; color: #9ca3af; text-align: center;">© 2026 PharmaGeo.</p>
                  </div>
                `
              })
            });
            setShowVerification(true);
            alert("Veuillez vérifier votre compte. Un code de validation vous a été envoyé.");
          } catch (mailErr) {
            console.error("Erreur d'envoi d'e-mail :", mailErr);
            setShowVerification(true);
          }
          setLoading(false);
          return;
        } else {
          window.location.replace('/');
          return;
        }
      }
    }
    setLoading(false);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert("Session utilisateur introuvable. Veuillez vous reconnecter.");
      setShowVerification(false);
      setLoading(false);
      return;
    }

    const expectedCode = user.user_metadata?.verification_code;

    if (verificationCodeInput.trim() === expectedCode) {
      const { error } = await supabase.auth.updateUser({
        data: { email_verified: true }
      });

      if (error) {
        alert(`Erreur de validation : ${error.message}`);
      } else {
        alert("Votre adresse e-mail a été validée avec succès !");
        window.location.replace('/');
        return;
      }
    } else {
      alert("Code de vérification incorrect. Veuillez réessayer.");
    }
    setLoading(false);
  };

  const handleResendCode = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Veuillez d'abord vous connecter avec vos identifiants.");
      setLoading(false);
      return;
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    await supabase.auth.updateUser({
      data: { verification_code: newCode }
    });

    try {
      await fetch('/app/../api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.email,
          subject: 'Votre nouveau code de vérification PharmaGeo',
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1f2937;">
              <h2 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px;">Nouveau Code de Vérification</h2>
              <p>Bonjour <strong>${user.user_metadata?.nom || ''}</strong>,</p>
              <p>Voici votre nouveau code de vérification à saisir pour valider votre compte :</p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 12px; font-size: 28px; font-weight: bold; letter-spacing: 6px; text-align: center; margin: 25px 0; color: #059669; border: 1px solid #e5e7eb;">
                ${newCode}
              </div>
              <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="font-size: 11px; color: #9ca3af; text-align: center;">© 2026 PharmaGeo.</p>
            </div>
          `
        })
      });
      alert('Un nouveau code de vérification a été envoyé à votre adresse e-mail.');
    } catch (mailErr) {
      console.error(mailErr);
      alert("Erreur lors de l'envoi du code.");
    }
    setLoading(false);
  };

  if (showVerification) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex text-zinc-900 dark:text-zinc-50 font-sans transition-colors duration-300">
        <div className="w-full flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md space-y-6 relative z-10 bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg text-center">
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                Vérification de l&apos;adresse e-mail
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Saisissez le code à 6 chiffres envoyé par e-mail.
              </p>
            </div>

            <form onSubmit={handleVerifyCode} className="space-y-5">
              <div className="space-y-1">
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={verificationCodeInput}
                  onChange={(e) => setVerificationCodeInput(e.target.value)}
                  placeholder="000000"
                  className="w-full p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-2xl font-bold tracking-[8px] text-center text-zinc-900 dark:text-white bg-white dark:bg-zinc-955 shadow-sm transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 text-white p-3.5 rounded-xl font-semibold hover:bg-emerald-500 active:scale-[0.98] transition shadow-lg shadow-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm cursor-pointer"
              >
                {loading ? 'Validation en cours...' : 'Valider mon compte'}
              </button>
            </form>

            <div className="flex flex-col items-center gap-3 pt-4 border-t border-zinc-105 dark:border-zinc-900 text-sm">
              <button
                type="button"
                onClick={handleResendCode}
                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 hover:underline font-semibold transition cursor-pointer"
              >
                Renvoyer le code
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowVerification(false);
                  supabase.auth.signOut();
                }}
                className="text-zinc-500 hover:text-zinc-400 hover:underline font-semibold transition cursor-pointer"
              >
                Annuler et se déconnecter
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex text-zinc-900 dark:text-zinc-50 font-sans transition-colors duration-300">
      {/* SECTION GAUCHE : Visuel immersif (Caché sur mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-tr from-emerald-800 via-green-600 to-teal-700 relative overflow-hidden flex-col justify-between p-12 text-white border-r border-emerald-900/10">
        {/* Cercles de fond décoratifs flous */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

        {/* Logo */}
        <div className="flex items-center space-x-2.5 z-10">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg shadow-black/5 animate-pulse-glow">
            <span className="text-xl font-bold text-white">✚</span>
          </div>
          <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">PharmaGeo</span>
        </div>

        {/* Message principal et Illustration flottante */}
        <div className="my-auto space-y-8 z-10 max-w-lg">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-xs font-semibold tracking-wide text-emerald-100 uppercase">
            <Sparkles size={12} className="text-emerald-300 animate-pulse" /> <span>Système de Supervision Connecté</span>
          </div>
          <h1 className="text-4xl xl:text-5xl font-black leading-tight tracking-tight">
            Pilotez votre réseau d&apos;officines en temps réel.
          </h1>
          <p className="text-emerald-100/80 leading-relaxed text-sm xl:text-base">
            Gérez vos stocks de médicaments, suivez les courses de vos livreurs sur carte interactive et simplifiez la liaison des comptes pharmaciens depuis une plateforme centralisée et moderne.
          </p>

          {/* Mini Dashboard Preview Mockup */}
          <div className="p-5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl space-y-3.5 animate-float">
            <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
              <span className="text-xs font-bold tracking-wider uppercase text-emerald-300 flex items-center gap-1.5">
                <Activity size={12} className="animate-pulse" /> Activité Réseau
              </span>
              <span className="text-[10px] font-semibold bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">Live Sync</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                <span className="block text-lg font-black text-white">99.8%</span>
                <span className="text-[9px] text-emerald-200/60 uppercase font-medium">Disponibilité</span>
              </div>
              <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                <span className="block text-lg font-black text-white">12 ms</span>
                <span className="text-[9px] text-emerald-200/60 uppercase font-medium">Temps Réponse</span>
              </div>
              <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                <span className="block text-lg font-black text-white">+2.4k</span>
                <span className="text-[9px] text-emerald-200/60 uppercase font-medium">Courses/mois</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-emerald-200/50 z-10">
          © 2026 PharmaGeo Inc. Tous droits réservés.
        </div>
      </div>

      {/* SECTION DROITE : Formulaire d'authentification */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        {/* Cercles de fond décoratifs flous en mode sombre/clair */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="text-center lg:text-left space-y-2">
            <div className="lg:hidden flex items-center justify-center space-x-2.5 mb-6">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <span className="text-base font-bold text-white">✚</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-emerald-600">PharmaGeo</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              {isSignUp ? 'Créer un compte' : 'Bon retour parmi nous'}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {isSignUp 
                ? 'Enregistrez votre officine ou rejoignez le réseau général' 
                : 'Connectez-vous pour accéder à votre console de supervision'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {isSignUp && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Nom Complet / Nom de l&apos;officine</label>
                  <input
                    type="text"
                    required
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-900 shadow-sm transition"
                    placeholder="Ex: Pharmacie du Centre"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Téléphone</label>
                  <input
                    type="tel"
                    required
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    className="w-full p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-900 shadow-sm transition"
                    placeholder="Ex: 690000000"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Votre Rôle</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-900 shadow-sm transition"
                  >
                    <option value="PHARMACIEN">Pharmacien (Gérer une officine)</option>
                    <option value="ADMIN">Administrateur Général</option>
                  </select>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Adresse Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-900 shadow-sm transition"
                placeholder="pharmacien@email.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Mot de passe</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-900 shadow-sm transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white p-3.5 rounded-xl font-semibold hover:bg-emerald-500 active:scale-[0.98] transition shadow-lg shadow-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Traitement en cours...</span>
                </>
              ) : (
                <span>{isSignUp ? "Créer mon compte" : "Se connecter"}</span>
              )}
            </button>
          </form>

          <div className="text-center text-sm pt-4 border-t border-zinc-100 dark:border-zinc-900">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 hover:underline font-semibold transition cursor-pointer"
            >
              {isSignUp ? 'Déjà un compte ? Se connecter' : "Pas encore de compte ? S'inscrire"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}