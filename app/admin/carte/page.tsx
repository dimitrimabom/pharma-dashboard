'use client';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const CarteSupervision = dynamic(() => import('@/components/CarteSupervision'), {
  ssr: false,
  loading: () => (
    <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 text-center text-zinc-500 flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-emerald-600 mb-3" size={24} />
      <p className="text-sm">Chargement de la cartographie...</p>
    </div>
  )
});

export default function AdminCartePage() {
  return (
    <div className="space-y-6">
      <CarteSupervision />
    </div>
  );
}
