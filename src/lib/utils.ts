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
