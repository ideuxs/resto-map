// src/services/geocode.ts
import * as Location from 'expo-location';

/* export const geoFromAddress = async (address: string) => {
  const res = await Location.geocodeAsync(address);
  if (!res?.length) throw new Error('Adresse introuvable');
  return { lat: res[0].latitude, lng: res[0].longitude };
}; */
export async function geoFromAddress(address: string):
  Promise<{ lat: number; lng: number } | undefined> {
  const res = await Location.geocodeAsync(address);
  return res.length
    ? { lat: res[0].latitude, lng: res[0].longitude }
    : undefined;
}
