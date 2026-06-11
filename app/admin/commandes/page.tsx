'use client';
import SuiviCommandes from '@/components/SuiviCommandes';

export default function AdminCommandesPage() {
  return (
    <div className="space-y-6">
      <SuiviCommandes role="ADMIN" />
    </div>
  );
}
