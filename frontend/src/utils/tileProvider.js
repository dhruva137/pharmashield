/**
 * tileProvider.js — Picks the best India-compliant map tile source
 * from whichever API key is present in the environment.
 *
 * Priority: HERE → OlaMaps → Mappls → Bhuvan ISRO overlay → ArcGIS fallback
 * All show the correct Indian version of J&K per GoI official position.
 */

function isSet(val) {
  return val && !val.startsWith('YOUR_');
}

const HERE_KEY   = import.meta.env.VITE_HERE_KEY;
const OLA_KEY    = import.meta.env.VITE_OLA_KEY;
const MAPPLS_KEY = import.meta.env.VITE_MAPPLS_KEY;

/**
 * Returns { url, attribution, maxZoom } for use in Leaflet TileLayer
 * or CesiumJS UrlTemplateImageryProvider.
 */
export function getIndiaTileConfig() {
  if (isSet(HERE_KEY)) {
    return {
      name: 'HERE Maps',
      url: `https://maps.hereapi.com/v3/base/mc/{z}/{x}/{y}/png8?apikey=${HERE_KEY}&style=explore.day`,
      attribution: '&copy; HERE Maps',
      maxZoom: 20,
    };
  }

  if (isSet(OLA_KEY)) {
    return {
      name: 'Ola Maps',
      // Ola Maps raster tile endpoint
      url: `https://api.olamaps.io/tiles/v1/styles/default/tiles/{z}/{x}/{y}.png?api_key=${OLA_KEY}`,
      attribution: '&copy; Ola Maps',
      maxZoom: 18,
    };
  }

  if (isSet(MAPPLS_KEY)) {
    return {
      name: 'MapMyIndia',
      url: `https://mtiles.mappls.com/advancedmaps/v1/${MAPPLS_KEY}/map_sdk_tiles/{z}/{x}/{y}.png`,
      attribution: '&copy; MapMyIndia Mappls',
      maxZoom: 18,
    };
  }

  // No India key set — use ArcGIS satellite (free, no key) with Bhuvan overlay
  return {
    name: 'ArcGIS + Bhuvan',
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri World Imagery',
    maxZoom: 19,
    // Bhuvan ISRO overlay is added separately in both maps
  };
}

/**
 * True if a proper India-compliant key is configured.
 * When false, show a warning banner prompting the user to add a key.
 */
export const hasIndiaKey = isSet(HERE_KEY) || isSet(OLA_KEY) || isSet(MAPPLS_KEY);

/**
 * Bhuvan ISRO WMS overlay — always added on top as a border supplement.
 * Shows district/state boundaries per India's official cartography.
 * No API key required.
 */
export const BHUVAN_WMS = {
  url: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms',
  layers: 'india3',              // India state + district boundaries
  format: 'image/png',
  transparent: true,
  version: '1.1.1',
  attribution: '&copy; ISRO Bhuvan',
};
