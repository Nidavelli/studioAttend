"use client";

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import type { Location } from '@/app/page';

// Leaflet's icon URLs are not correctly resolved by default in Next.js.
// This code manually sets the paths to the marker icons.
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;  
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon.src,
    iconRetinaUrl: markerIcon2x.src,
    shadowUrl: markerShadow.src,
});


interface LecturerMapProps {
  location: Location;
  radius: number;
}

export function LecturerMap({ location, radius }: LecturerMapProps) {
  const position: [number, number] = [location.latitude, location.longitude];

  return (
    <MapContainer center={position} zoom={16} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position} />
      <Circle 
        center={position} 
        radius={radius}
        pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }} 
      />
    </MapContainer>
  );
}
