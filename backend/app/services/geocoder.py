import time
import logging
import requests
from typing import Optional, Tuple
from ..config import settings

logger = logging.getLogger("pharmashield.geocoder")

class Geocoder:
    """
    Geocoding service using Google Maps API (if key available) 
    or falling back to OpenStreetMap's Nominatim.
    """
    def __init__(self):
        self.google_key = settings.GOOGLE_MAPS_API_KEY
        self.nominatim_url = "https://nominatim.openstreetmap.org/search"
        self.google_url = "https://maps.googleapis.com/maps/api/geocode/json"
        self.headers = {
            "User-Agent": "PharmaShield-MapAnalytics/1.0"
        }

    def get_coordinates(self, location_name: str) -> Optional[Tuple[float, float]]:
        """
        Fetches latitude and longitude for a given location name.
        """
        if self.google_key:
            return self._google_geocode(location_name)
        return self._nominatim_geocode(location_name)

    def _google_geocode(self, location_name: str) -> Optional[Tuple[float, float]]:
        """Geocoding via Google Maps API."""
        try:
            params = {
                "address": location_name,
                "key": self.google_key
            }
            logger.info(f"Google Geocoding: {location_name}")
            response = requests.get(self.google_url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if data.get("status") == "OK" and data.get("results"):
                loc = data["results"][0]["geometry"]["location"]
                lat, lng = loc["lat"], loc["lng"]
                logger.info(f"Google found coords for {location_name}: {lat}, {lng}")
                return lat, lng
            else:
                logger.warning(f"Google Geocoding failed for {location_name}: {data.get('status')}")
                return None
        except Exception as e:
            logger.error(f"Google Geocoding exception for {location_name}: {e}")
            return None

    def _nominatim_geocode(self, location_name: str) -> Optional[Tuple[float, float]]:
        """Geocoding via Nominatim (with rate limiting)."""
        try:
            params = {
                "q": location_name,
                "format": "json",
                "limit": 1
            }
            logger.info(f"Nominatim Geocoding: {location_name}")
            response = requests.get(self.nominatim_url, params=params, headers=self.headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if data and len(data) > 0:
                lat = float(data[0]["lat"])
                lon = float(data[0]["lon"])
                logger.info(f"Nominatim found coords for {location_name}: {lat}, {lon}")
                return lat, lon
            else:
                logger.warning(f"No coordinates found via Nominatim for {location_name}")
                return None
        except Exception as e:
            logger.error(f"Nominatim Geocoding failed for {location_name}: {e}")
            return None
        finally:
            # Respect Nominatim's 1 request per second usage policy
            time.sleep(1.1)

    def geocode_batch(self, locations: list[str]) -> dict[str, Tuple[float, float]]:
        """
        Geocodes a list of locations and returns a dictionary mapping name to coordinates.
        """
        results = {}
        for loc in locations:
            coords = self.get_coordinates(loc)
            if coords:
                results[loc] = coords
        return results

# Singleton instance
geocoder = Geocoder()
