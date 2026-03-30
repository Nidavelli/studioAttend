'use client';

import 'leaflet/dist/leaflet.css';
import React, { useEffect, useRef } from 'react';
import L, { type Map, type LatLngExpression } from 'leaflet';
import type { GeolocationCoordinates } from '@/app/page';

// Fix for default icon path issue with webpack
const defaultIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = defaultIcon;

export function GeofenceMap({
  center,
  radius,
  studentLocation,
}: {
  center: GeolocationCoordinates;
  radius: number;
  studentLocation?: GeolocationCoordinates;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const lecturerMarkerRef = useRef<L.Marker | null>(null);
  const studentMarkerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    // Initialize map
    if (mapContainerRef.current && !mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, { scrollWheelZoom: false }).setView([center.lat, center.lng], 16);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    const centerPosition: LatLngExpression = [center.lat, center.lng];

    // Update map view, marker, and circle
    map.setView(centerPosition, map.getZoom() || 16);

    if (lecturerMarkerRef.current) {
      lecturerMarkerRef.current.setLatLng(centerPosition);
    } else {
      lecturerMarkerRef.current = L.marker(centerPosition)
        .addTo(map)
        .bindPopup("Lecturer's Location");
    }

    if (circleRef.current) {
      circleRef.current.setLatLng(centerPosition);
      circleRef.current.setRadius(radius);
    } else {
      circleRef.current = L.circle(centerPosition, { radius, color: 'blue', fillColor: 'blue', fillOpacity: 0.2 }).addTo(map);
    }
    
    // Update student marker
    if (studentLocation) {
      const studentPosition: LatLngExpression = [studentLocation.lat, studentLocation.lng];
      if (studentMarkerRef.current) {
        studentMarkerRef.current.setLatLng(studentPosition);
      } else {
        studentMarkerRef.current = L.marker(studentPosition, { icon: defaultIcon })
          .addTo(map)
          .bindPopup("Your Location");
      }
    } else if (studentMarkerRef.current) {
      map.removeLayer(studentMarkerRef.current);
      studentMarkerRef.current = null;
    }
    
    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        // This check is to ensure we don't call remove() on an unmounted map instance.
        // It's a defensive check for React StrictMode, which can cause double-invokes.
        if (mapContainerRef.current && mapInstanceRef.current.getContainer()) {
             mapInstanceRef.current.remove();
             mapInstanceRef.current = null;
        }
      }
    };
  }, [center, radius, studentLocation]);

  return <div ref={mapContainerRef} style={{ height: '250px', width: '100%', borderRadius: '0.5rem' }} />;
}
