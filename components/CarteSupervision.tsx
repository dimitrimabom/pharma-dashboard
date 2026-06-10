'use client';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { supabase } from '@/lib/supabase';
import L from 'leaflet';

// Correction d'un bug célèbre de Leaflet avec Next.js (les icônes de marqueurs par défaut ne se chargent pas)
const iconPharmacie = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/881/881180.png', // Icône de croix verte
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

interface PharmacieGeo {
  id: number;
  nom: string;
  adresse: string;
  latitude: number;
  longitude: number;
}

export default function CarteSupervision() {
  const [pharmacies, setPharmacies] = useState<PharmacieGeo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPharmaciesGeo = async () => {
      // On récupère le nom, l'adresse et on extrait les coordonnées du point PostGIS st_astext
      const { data, error } = await supabase
        .from('pharmacies')
        .select('id, nom, adresse, position');

      if (error) {
        console.error("Erreur de récupération géo :", error.message);
        setLoading(false);
        return;
      }

      if (data) {
        // Formater les données PostGIS "POINT(Lng Lat)" en variables exploitables par Leaflet
        const pharmaciesFormatees = data.map((p: any) => {
          let lat = 3.8480; // Valeurs par défaut (Yaoundé, Cameroun)
          let lng = 11.5021;

          if (p.position && typeof p.position === 'string') {
            // Extraction des coordonnées depuis la chaîne "POINT(longitude latitude)"
            const coordString = p.position.replace('POINT(', '').replace(')', '');
            const [longitude, latitude] = coordString.split(' ');
            lat = parseFloat(latitude);
            lng = parseFloat(longitude);
          }

          return {
            id: p.id,
            nom: p.nom,
            adresse: p.adresse,
            latitude: lat,
            longitude: lng,
          };
        });

        setPharmacies(pharmaciesFormatees);
      }
      setLoading(false);
    };

    fetchPharmaciesGeo();
  }, []);

  if (loading) return <p className="text-gray-500">Génération de la carte de supervision...</p>;

  return (
    <div className="bg-white p-6 rounded-xl border shadow-sm text-gray-800">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">🗺️ Cartographie du Réseau Sanitaire</h3>
        <p className="text-sm text-gray-500">Supervision géographique des officines partenaires enregistrées sur PharmaGeo.</p>
      </div>

      {/* Conteneur de la carte centré par défaut sur le Cameroun (Yaoundé) */}
      <div className="h-[500px] w-full rounded-xl overflow-hidden border z-0">
        <MapContainer 
          center={[3.8480, 11.5021]} 
          zoom={12} 
          style={{ height: '100%', width: '100%' }}
        >
          {/* Tuiles OpenStreetMap gratuites */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Affichage dynamique des marqueurs de pharmacies */}
          {pharmacies.map((pharm) => (
            <Marker 
              key={pharm.id} 
              position={[pharm.latitude, pharm.longitude]} 
              icon={iconPharmacie}
            >
              <Popup>
                <div className="font-sans">
                  <h4 className="font-bold text-green-600 text-sm m-0">{pharm.nom}</h4>
                  <p className="text-xs text-gray-600 my-1">{pharm.adresse || 'Aucune adresse fournie'}</p>
                  <span className="text-[10px] font-mono text-gray-400">
                    Coords: {pharm.latitude.toFixed(4)}, {pharm.longitude.toFixed(4)}
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}