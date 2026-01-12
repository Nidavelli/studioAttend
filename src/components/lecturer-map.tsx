"use client";

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import React, { useEffect, useRef } from 'react';
import type { Location } from '@/app/page';

// Leaflet's icon URLs are not correctly resolved by default in Next.js.
// This code manually sets the paths to the marker icons.
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// This is a workaround for a known issue with Leaflet and Webpack.
// It manually configures the default icon paths.
const defaultIcon = L.icon({
    iconUrl: markerIcon.src,
    iconRetinaUrl: markerIcon2x.src,
    shadowUrl: markerShadow.src,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = defaultIcon;

interface LecturerMapProps {
  location: Location;
  radius: number;
}

export function LecturerMap({ location, radius }: LecturerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      // Initialize the map only if it hasn't been created yet
      mapInstanceRef.current = L.map(mapRef.current, {
        center: [location.latitude, location.longitude],
        zoom: 16,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapInstanceRef.current);
    }

    if (mapInstanceRef.current) {
        // Update center and view
        const newCenter: L.LatLngTuple = [location.latitude, location.longitude];
        mapInstanceRef.current.setView(newCenter);

        // Update or create marker
        if (markerRef.current) {
            markerRef.current.setLatLng(newCenter);
        } else {
            markerRef.current = L.marker(newCenter).addTo(mapInstanceRef.current);
        }

        // Update or create circle
        if (circleRef.current) {
            circleRef.current.setLatLng(newCenter).setRadius(radius);
        } else {
            circleRef.current = L.circle(newCenter, {
                radius: radius,
                pathOptions: { color: 'blue', fillColor: 'blue', fillOpacity: 0.1 },
            }).addTo(mapInstanceRef.current);
        }
    }
    
    // Cleanup function to destroy the map instance
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
  }, [location, radius]);

  return <div ref={mapRef} style={{ height: '100%', width: '100%' }} />;
}
