'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function RootRedirector() {
  const router = useRouter();

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = '/auth';
          return;
        }

        // Récupérer le rôle
        const { data, error } = await supabase
          .from('profils')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error("Erreur de récupération du rôle pour redirection :", error.message);
        }

        if (data && data.role === 'ADMIN') {
          router.replace('/admin/dashboard');
        } else {
          // Par défaut pour le rôle PHARMACIEN ou de secours
          router.replace('/pharmacien/dashboard');
        }
      } catch (err) {
        console.error("Erreur critique d'aiguillage :", err);
        window.location.href = '/auth';
      }
    };

    handleRedirect();
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-zinc-500">
      <div className="text-center space-y-3 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600 mb-1" size={24} />
        <p className="text-sm font-semibold">Redirection vers votre espace...</p>
      </div>
    </div>
  );
}