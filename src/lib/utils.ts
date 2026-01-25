import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSimpleId(): string {
  if (typeof window === 'undefined') {
    return 'server-id';
  }
  const nav = window.navigator;
  const screen = window.screen;
  let deviceId = nav.userAgent.replace(/\D+/g, '');
  deviceId += (screen.height || 0).toString();
  deviceId += (screen.width || 0).toString();
  deviceId += (new Date().getTimezoneOffset()).toString();
  return deviceId;
}

/**
 * Calculates the distance between two geolocation coordinates using the Haversine formula.
 * @param coords1 - The first coordinates { lat, lng }.
 * @param coords2 - The second coordinates { lat, lng }.
 * @returns The distance in meters.
 */
export function haversineDistance(
  coords1: { lat: number; lng: number },
  coords2: { lat: number; lng: number }
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;

  const R = 6371e3; // Earth's radius in meters
  const dLat = toRad(coords2.lat - coords1.lat);
  const dLon = toRad(coords2.lng - coords1.lng);
  const lat1 = toRad(coords1.lat);
  const lat2 = toRad(coords2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
