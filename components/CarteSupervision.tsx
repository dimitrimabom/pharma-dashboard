'use client';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { supabase } from '@/lib/supabase';
import { Map, Phone, Loader2, Bike } from 'lucide-react';
import L from 'leaflet';

// Correction du bug de Leaflet avec Next.js (les icônes de marqueurs par défaut ne se chargent pas)
const iconPharmacie = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/881/881180.png', // Icône de croix verte
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

const iconLivreur = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3198/3198336.png', // Icône de livreur à moto
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

interface PharmacieGeo {
  id: number;
  nom: string;
  adresse: string;
  telephone: string;
  latitude: number;
  longitude: number;
}

interface PharmacieRow {
  id: number;
  nom: string;
  adresse: string | null;
  telephone: string | null;
  position: string | { type: string; coordinates: number[] } | null;
}

interface LivraisonGeo {
  id: number;
  statut: string;
  livreurNom: string;
  latitude: number;
  longitude: number;
}

interface LivraisonQueryRow {
  id: number;
  statut: string;
  position_livreur: string | { type: string; coordinates: number[] } | null;
  profils: { nom: string } | { nom: string }[] | null;
}

export default function CarteSupervision() {
  const [pharmacies, setPharmacies] = useState<PharmacieGeo[]>([]);
  const [livreursActifs, setLivreursActifs] = useState<LivraisonGeo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLivreursActifs = async (active?: { current: boolean }) => {
    try {
      const { data, error } = await supabase
        .from('livraisons')
        .select(`
          id,
          statut,
          position_livreur,
          profils:livreur_id ( nom )
        `)
        .eq('statut', 'EN_COURS');

      if (error) {
        console.error("Erreur de récupération livreurs actifs :", error.message);
        return;
      }

      if (active && !active.current) return;

      if (data) {
        const formattedLivreurs = (data as unknown as LivraisonQueryRow[])
          .filter((l) => l.position_livreur)
          .map((l) => {
            let lat = 0;
            let lng = 0;
            
            if (l.position_livreur && typeof l.position_livreur === 'object' && Array.isArray(l.position_livreur.coordinates)) {
              lng = l.position_livreur.coordinates[0];
              lat = l.position_livreur.coordinates[1];
            } 
            else if (typeof l.position_livreur === 'string') {
              const coordString = l.position_livreur.replace('POINT(', '').replace(')', '');
              const [longitude, latitude] = coordString.split(' ');
              lat = parseFloat(latitude);
              lng = parseFloat(longitude);
            }

            const profileData = l.profils;
            const nomLivreur = profileData ? (Array.isArray(profileData) ? profileData[0]?.nom : profileData.nom) : 'Livreur Inconnu';

            return {
              id: l.id,
              statut: l.statut,
              livreurNom: nomLivreur || 'Livreur Inconnu',
              latitude: lat,
              longitude: lng,
            };
          });

        setLivreursActifs(formattedLivreurs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const active = { current: true };

    const fetchPharmaciesGeo = async () => {
      const { data, error } = await supabase
        .from('pharmacies')
        .select('id, nom, adresse, telephone, position');

      if (error) {
        console.error("Erreur de récupération géo :", error.message);
        if (active.current) setLoading(false);
        return;
      }

      if (active.current && data) {
        const pharmaciesFormatees = (data as unknown as PharmacieRow[]).map((p) => {
          let lat = 4.0500; // Coordonnées par défaut de Douala
          let lng = 9.7000;

          if (p.position) {
            if (typeof p.position === 'object' && Array.isArray(p.position.coordinates)) {
              lng = p.position.coordinates[0];
              lat = p.position.coordinates[1];
            } 
            else if (typeof p.position === 'string') {
              const coordString = p.position.replace('POINT(', '').replace(')', '');
              const [longitude, latitude] = coordString.split(' ');
              lat = parseFloat(latitude);
              lng = parseFloat(longitude);
            }
          }

          return {
            id: p.id,
            nom: p.nom,
            adresse: p.adresse || 'Aucune adresse renseignée',
            telephone: p.telephone || 'Aucun numéro',
            latitude: lat,
            longitude: lng,
          };
        });

        setPharmacies(pharmaciesFormatees);
      }
    };

    const loadData = async () => {
      await fetchPharmaciesGeo();
      await fetchLivreursActifs(active);
      if (active.current) setLoading(false);
    };

    loadData();

    // Écouter les modifications des livraisons en temps réel (CDC)
    const realtimeTracking = supabase
      .channel('realtime-tracking-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'livraisons' },
        () => {
          if (active.current) {
            fetchLivreursActifs(active);
          }
        }
      )
      .subscribe();

    return () => {
      active.current = false;
      supabase.removeChannel(realtimeTracking);
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 text-center text-zinc-500 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600 mb-3" size={24} />
        <p className="text-sm">Génération de la carte de supervision...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm text-zinc-800 dark:text-zinc-100 transition-colors">
      <div className="mb-4 flex items-center space-x-2.5">
        <Map size={20} className="text-emerald-600 dark:text-emerald-500" />
        <div>
          <h3 className="text-lg font-bold text-zinc-955 dark:text-white leading-tight">Cartographie &amp; Suivi en Temps Réel</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Supervision géographique des pharmacies partenaires et des livreurs actifs à Douala.</p>
        </div>
      </div>

      {/* Conteneur de la carte Leaflet */}
      <div className="h-[480px] w-full rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 z-0">
        <MapContainer 
          center={[4.0500, 9.7000]} // Centré sur Douala, Cameroun
          zoom={12} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Marqueurs Pharmacies */}
          {pharmacies.map((pharm) => (
            <Marker 
              key={`pharm-${pharm.id}`} 
              position={[pharm.latitude, pharm.longitude]} 
              icon={iconPharmacie}
            >
              <Popup>
                <div className="font-sans p-1 space-y-1">
                  <h4 className="font-bold text-emerald-650 dark:text-emerald-500 text-sm m-0">{pharm.nom}</h4>
                  <p className="text-xs text-zinc-700 dark:text-zinc-650 m-0">{pharm.adresse}</p>
                  {pharm.telephone && (
                    <p className="text-[10px] text-zinc-500 font-medium m-0 flex items-center">
                      <Phone size={10} className="mr-1 text-zinc-400" />
                      <span>{pharm.telephone}</span>
                    </p>
                  )}
                  <div className="text-[9px] font-mono text-zinc-400 mt-1">
                    GPS: {pharm.latitude.toFixed(5)}, {pharm.longitude.toFixed(5)}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Marqueurs Livreurs Actifs */}
          {livreursActifs.map((liv) => (
            <Marker 
              key={`liv-${liv.id}`} 
              position={[liv.latitude, liv.longitude]} 
              icon={iconLivreur}
            >
              <Popup>
                <div className="font-sans p-1 space-y-1 text-zinc-800">
                  <h4 className="font-bold text-emerald-600 dark:text-emerald-500 text-sm m-0 flex items-center gap-1.5">
                    <Bike size={14} className="text-emerald-600" />
                    <span>{liv.livreurNom}</span>
                  </h4>
                  <p className="text-xs text-zinc-700 m-0 mt-0.5">Livraison active : <strong>#CMD-{liv.id}</strong></p>
                  <div className="mt-1">
                    <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-extrabold uppercase rounded border border-blue-200/50">
                      {liv.statut}
                    </span>
                  </div>
                  <div className="text-[9px] font-mono text-zinc-400 mt-1">
                    GPS: {liv.latitude.toFixed(5)}, {liv.longitude.toFixed(5)}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}