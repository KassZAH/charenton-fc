export function buildItineraryUrl(address: string | null, mapsUrl: string | null): string | null {
  if (mapsUrl) return mapsUrl;
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return null;
}
