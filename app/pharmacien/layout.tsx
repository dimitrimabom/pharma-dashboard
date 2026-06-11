'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import { Loader2 } from 'lucide-react';

export default function PharmacienLayout({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ nom: string; role: string } | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = '/auth';
          return;
        }

        const { data, error } = await supabase
          .from('profils')
          .select('nom, role')
          .eq('id', user.id)
          .maybeSingle();

        if (error || !data || data.role !== 'PHARMACIEN') {
          console.warn("Accès Pharmacien non autorisé");
          window.location.href = '/'; // Redirige vers l'aiguillage racine
        } else {
          setProfile(data);
          setAuthorized(true);
        }
      } catch (err) {
        console.error("Erreur de validation Pharmacien :", err);
        window.location.href = '/';
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-zinc-500">
        <div className="text-center space-y-2 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-emerald-600 mb-1" size={24} />
          <p className="text-xs font-semibold">Vérification de la session officine...</p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300">
      <Sidebar role="PHARMACIEN" profile={profile} />
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* En-tête header officine */}
        <header className="sticky top-0 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md px-6 py-4 flex justify-between items-center border-b border-zinc-200/50 dark:border-zinc-800/50 z-20">
          <h1 className="text-sm font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
            Console Officine & Stocks
          </h1>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse-glow"></span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Connexion Live active</span>
          </div>
        </header>
        
        {/* Contenu principal */}
        <main className="p-6 sm:p-8 flex-1 w-full max-w-7xl mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
