export interface NormalizedWardProperties {
  wardName: string;
  wardCode: string;
  city: string;
}

/**
 * Normalizes the properties from raw GeoJSON into a standard format.
 */
export function normalizeWardProperties(city: string, rawProperties: any): NormalizedWardProperties {
  // Mumbai and Pune Datameet files use 'name' for the ward identifier
  const rawName = rawProperties?.name || 'Unknown Ward';
  
  let wardCode = rawName;
  let wardName = rawName;

  // Extract code and name if combined in strings like "Admin Ward 01 Aundh"
  if (city.toLowerCase() === 'pune') {
    const parts = rawName.split(' ');
    if (parts.length > 2) {
      wardCode = parts[2]; // e.g., "01"
      wardName = parts.slice(3).join(' '); // e.g., "Aundh"
    }
  }

  return {
    wardName,
    wardCode,
    city,
  };
}
