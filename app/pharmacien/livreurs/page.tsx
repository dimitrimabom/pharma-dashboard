'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { Bike, UserPlus, Phone, Mail, Lock, Loader2, Download, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import FicheLivreurPDF from '@/components/FicheLivreurPDF';

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

interface Livreur {
  id: string;
  nom: string;
  telephone: string;
  cree_le: string;
}

interface Pharmacie {
  id: number;
  nom: string;
}

export default function PharmacienLivreursPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [pharmacie, setPharmacie] = useState<Pharmacie | null>(null);
  const [livreurs, setLivreurs] = useState<Livreur[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulaire de recrutement
  const [email, setEmail] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [loadingRecruit, setLoadingRecruit] = useState(false);

  // État de succès (pour téléchargement PDF)
  const [createdDriver, setCreatedDriver] = useState<{
    nom: string;
    telephone: string;
    email: string;
    password: string;
  } | null>(null);

  const [password, setPassword] = useState(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let pass = 'PG-';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  });

  // Générer un mot de passe temporaire fort
  const generateTempPassword = useCallback(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let pass = 'PG-';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  }, []);

  const fetchLivreurs = useCallback(async (active?: { current: boolean }) => {
    const { data, error } = await supabase
      .from('profils')
      .select('id, nom, telephone, cree_le')
      .eq('role', 'LIVREUR')
      .order('cree_le', { ascending: false });

    if (active && !active.current) return;

    if (error) {
      console.error('Erreur lors du chargement des livreurs :', error.message);
    } else {
      setLivreurs(data || []);
    }
  }, []);

  const checkPharmacie = useCallback(async (active?: { current: boolean }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (active && !active.current) return;

    try {
      const { data: lien } = await supabase
        .from('pharmacie_personnel')
        .select('pharmacie_id, pharmacies (id, nom)')
        .eq('pharmacien_id', user.id)
        .maybeSingle();

      if (active && !active.current) return;

      const lienTyped = lien as unknown as { pharmacie_id: number; pharmacies: Pharmacie | null } | null;
      if (lienTyped && lienTyped.pharmacies) {
        setPharmacie(lienTyped.pharmacies);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!active || active.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const active = { current: true };
    setTimeout(() => {
      if (active.current) {
        setIsMounted(true);
      }
    }, 0);

    const loadData = async () => {
      await checkPharmacie(active);
      await fetchLivreurs(active);
    };

    loadData();

    return () => {
      active.current = false;
    };
  }, [checkPharmacie, fetchLivreurs]);

  const handleRecruter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !nom || !telephone) return;
    setLoadingRecruit(true);
    setCreatedDriver(null);

    // 1. Créer le compte Auth via authTempClient
    const { error } = await authTempClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          nom: nom,
          telephone: telephone,
          role: 'LIVREUR',
          email_verified: true, // Pré-activé
        }
      }
    });

    if (error) {
      alert(`Erreur d'enregistrement : ${error.message}`);
      setLoadingRecruit(false);
      return;
    }

    // 2. Envoyer la notification d'accueil par Resend
    try {
      await fetch('/app/../api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: 'Bienvenue dans la flotte PharmaGeo !',
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1f2937;">
              <h2 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px;">Bienvenue sur PharmaGeo !</h2>
              <p>Bonjour <strong>${nom}</strong>,</p>
              <p>Vous venez d'être recruté en tant que livreur partenaire par <strong>${pharmacie?.nom || 'notre officine'}</strong>.</p>
              <p>Voici vos identifiants pour vous connecter à l'application mobile de livraison :</p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
                <p style="margin: 5px 0;"><strong>Adresse E-mail :</strong> ${email}</p>
                <p style="margin: 5px 0;"><strong>Mot de passe temporaire :</strong> ${password}</p>
              </div>
              <p>Lors de votre première connexion, l'application mobile vous demandera de modifier votre mot de passe pour des raisons de sécurité.</p>
              <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="font-size: 11px; color: #9ca3af; text-align: center;">© 2026 PharmaGeo. Service de messagerie automatique.</p>
            </div>
          `
        })
      });
    } catch (mailErr) {
      console.error(mailErr);
    }

    // 3. Succès et stockage pour affichage du PDF
    setCreatedDriver({
      nom,
      telephone,
      email,
      password
    });

    setNom('');
    setEmail('');
    setTelephone('');
    generateTempPassword(); // Générer le prochain mot de passe
    setLoadingRecruit(false);
    fetchLivreurs(); // Recharger la liste
    alert("Le livreur a été enregistré avec succès ! Téléchargez sa fiche d'activation ci-dessous.");
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto p-12 text-center flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600 mb-3" size={24} />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Chargement de votre flotte...</p>
      </div>
    );
  }

  if (!pharmacie) {
    return (
      <div className="max-w-xl mx-auto bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 text-center text-zinc-800 dark:text-zinc-100 transition-colors flex flex-col items-center justify-center">
        <Bike className="text-emerald-600 mb-3 animate-pulse" size={36} />
        <h2 className="text-lg font-bold text-zinc-955 dark:text-white mb-2">Accès en attente d&apos;affectation</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Votre compte n&apos;est pas rattaché à une officine active. Veuillez contacter l&apos;Administrateur Général pour lier votre compte de personnel.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-zinc-800 dark:text-zinc-100 transition-colors">
      
      {/* BANDEAU SUPERIEUR */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-955 dark:text-white">Gestion de la Flotte de Livreurs</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Espace de recrutement et suivi des agents de livraison pour l&apos;officine : <strong className="text-emerald-600 dark:text-emerald-400">{pharmacie.nom}</strong>.
        </p>
      </div>

      {/* POPUP DE TELECHARGEMENT EN CAS DE CRÉATION RÉUSSIE */}
      {createdDriver && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-start space-x-3">
            <CheckCircle className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Compte créé avec succès pour {createdDriver.nom}</h4>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1 max-w-xl">
                Téléchargez la fiche d&apos;activation ci-contre. Elle contient les identifiants temporaires et les consignes que le livreur devra lire pour se connecter à son application mobile.
              </p>
            </div>
          </div>
          {isMounted && (
            <div className="flex-shrink-0">
              <PDFDownloadLink
                document={
                  <FicheLivreurPDF
                    nom={createdDriver.nom}
                    telephone={createdDriver.telephone}
                    email={createdDriver.email}
                    motDePasseAffiche={createdDriver.password}
                    pharmacieNom={pharmacie.nom}
                    dateCreation={new Date().toISOString()}
                  />
                }
                fileName={`Fiche_Livreur_${createdDriver.nom.replace(/\s+/g, '_')}.pdf`}
                className="inline-flex items-center space-x-1.5 px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-[0.98] cursor-pointer"
              >
                {({ loading }) => (
                  <>
                    <Download size={14} className={loading ? 'animate-bounce' : ''} />
                    <span>{loading ? 'Fiche en cours...' : 'Fiche d\'activation (PDF)'}</span>
                  </>
                )}
              </PDFDownloadLink>
            </div>
          )}
        </div>
      )}

      {/* PANNEAUX DE CONTROLE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* FORMULAIRE DE RECRUTEMENT */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus size={16} className="text-emerald-600" /> Recruter un Agent
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Enregistrez un nouveau coursier de confiance dans la flotte.</p>
          </div>
          
          <form onSubmit={handleRecruter} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Nom complet de l&apos;agent</label>
              <input
                type="text"
                required
                placeholder="Ex: Jean-Pierre Eto'o"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-950 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">N° de Téléphone</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-450 text-xs">
                  <Phone size={13} />
                </span>
                <input
                  type="tel"
                  required
                  placeholder="Ex: 699001122"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-955 transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Adresse E-mail</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-450 text-xs">
                  <Mail size={13} />
                </span>
                <input
                  type="email"
                  required
                  placeholder="Ex: livreur@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white bg-white dark:bg-zinc-955 transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Mot de passe temporaire</label>
                <button
                  type="button"
                  onClick={generateTempPassword}
                  title="Générer un autre mot de passe"
                  className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={10} /> Générer
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-450 text-xs">
                  <Lock size={13} />
                </span>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white bg-zinc-50 dark:bg-zinc-955/60 transition font-mono"
                />
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200/50 dark:border-yellow-900/30 p-3.5 rounded-xl flex items-start gap-2 text-yellow-800 dark:text-yellow-400 text-[11px] leading-relaxed">
              <AlertCircle className="flex-shrink-0 mt-0.5" size={14} />
              <p>Le livreur recevra ses identifiants par e-mail via notre service Resend, mais il est recommandé de télécharger et lui imprimer sa fiche d&apos;activation.</p>
            </div>

            <button
              type="submit"
              disabled={loadingRecruit}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl font-semibold text-sm transition shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loadingRecruit ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Recrutement en cours...</span>
                </>
              ) : (
                <span>Recruter le livreur</span>
              )}
            </button>
          </form>
        </div>

        {/* LISTE DE LA FLOTTE GENERALE */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden">
          <div className="p-5 border-b border-zinc-200/50 dark:border-zinc-800/50">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Bike size={16} className="text-emerald-600" /> Livreurs Actifs ({livreurs.length})
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Livreurs opérationnels connectés sur la plateforme.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950/40 border-b border-zinc-200/40 dark:border-zinc-800/40 text-zinc-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="p-4">Agent</th>
                  <th className="p-4">Téléphone</th>
                  <th className="p-4">Date de recrutement</th>
                  <th className="p-4 text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-sm">
                {livreurs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-zinc-400 dark:text-zinc-500 text-xs">Aucun agent livreur inscrit pour le moment.</td>
                  </tr>
                ) : (
                  livreurs.map((liv) => (
                    <tr key={liv.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-955/10 transition">
                      <td className="p-4">
                        <div className="font-semibold text-zinc-900 dark:text-white">{liv.nom}</div>
                        <div className="text-[10px] font-mono text-zinc-450 mt-0.5">ID: {liv.id.slice(0, 8)}...</div>
                      </td>
                      <td className="p-4 font-mono text-zinc-700 dark:text-zinc-350">{liv.telephone || 'Non spécifié'}</td>
                      <td className="p-4 text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(liv.cree_le).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="p-4 text-right">
                        <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 text-[10px] font-extrabold uppercase rounded-md border border-blue-200/50 dark:border-blue-900/30">
                          Opérationnel
                        </span>
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
