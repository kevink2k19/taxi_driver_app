import { LocationCoords } from './LocationService';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  addressComponents: {
    streetNumber?: string;
    streetName?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  placeId?: string;
}

export interface PlaceSearchResult {
  placeId: string;
  name: string;
  address: string;
  coordinates: LocationCoords;
  rating?: number;
  priceLevel?: number;
  types: string[];
  photoUrl?: string;
}

export class GeocodeService {
  private static readonly API_KEY = 'AIzaSyBtinZ-NpA8cvnCJQKZ7NJwKl6QkV4o_Qg';
  private static readonly GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
  private static readonly PLACES_URL = 'https://maps.googleapis.com/maps/api/place';

  /**
   * Convert address to coordinates
   */
  static async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    try {
      if (!this.API_KEY) {
        throw new Error('Google Maps API key not configured');
      }

      const params = new URLSearchParams({
        address: address,
        components: 'country:MM', // Restrict to Myanmar
        key: this.API_KEY,
      });

      const response = await fetch(`${this.GEOCODE_URL}?${params}`);
      const data = await response.json();

      if (data.status !== 'OK') {
        console.warn(`Geocoding failed: ${data.status}`);
        return null;
      }

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;
        
        // Parse address components
        const addressComponents: GeocodeResult['addressComponents'] = {};
        result.address_components.forEach((component: any) => {
          const types = component.types;
          if (types.includes('street_number')) {
            addressComponents.streetNumber = component.long_name;
          } else if (types.includes('route')) {
            addressComponents.streetName = component.long_name;
          } else if (types.includes('locality') || types.includes('administrative_area_level_2')) {
            addressComponents.city = component.long_name;
          } else if (types.includes('administrative_area_level_1')) {
            addressComponents.state = component.long_name;
          } else if (types.includes('country')) {
            addressComponents.country = component.long_name;
          } else if (types.includes('postal_code')) {
            addressComponents.postalCode = component.long_name;
          }
        });

        return {
          latitude: location.lat,
          longitude: location.lng,
          formattedAddress: result.formatted_address,
          addressComponents,
          placeId: result.place_id,
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding failed:', error);
      return null;
    }
  }

  /**
   * Convert coordinates to address
   */
  static async reverseGeocode(latitude: number, longitude: number): Promise<GeocodeResult | null> {
    try {
      if (!this.API_KEY) {
        throw new Error('Google Maps API key not configured');
      }

      const params = new URLSearchParams({
        latlng: `${latitude},${longitude}`,
        key: this.API_KEY,
      });

      const response = await fetch(`${this.GEOCODE_URL}?${params}`);
      const data = await response.json();

      if (data.status !== 'OK') {
        console.warn(`Reverse geocoding failed: ${data.status}`);
        return null;
      }

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;

        return {
          latitude: location.lat,
          longitude: location.lng,
          formattedAddress: result.formatted_address,
          addressComponents: {}, // Parse if needed
          placeId: result.place_id,
        };
      }
      return null;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return null;
    }
  }

  /**
   * Search for places (POI, businesses, etc.)
   */
  static async searchPlaces(
    query: string,
    location?: LocationCoords,
    radius: number = 5000
  ): Promise<PlaceSearchResult[]> {
    try {
      if (!this.API_KEY) {
        throw new Error('Google Maps API key not configured');
      }

      const params = new URLSearchParams({
        query: query,
        key: this.API_KEY,
      });

      if (location) {
        params.append('location', `${location.latitude},${location.longitude}`);
        params.append('radius', radius.toString());
      } else {
        // Default to Myanmar if no location provided
        params.append('region', 'MM');
      }

      const response = await fetch(`${this.PLACES_URL}/textsearch/json?${params}`);
      const data = await response.json();

      if (data.status !== 'OK') {
        console.warn(`Places search failed: ${data.status}`);
        return [];
      }

      return data.results.map((place: any) => ({
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address,
        coordinates: {
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
        },
        rating: place.rating,
        priceLevel: place.price_level,
        types: place.types,
        photoUrl: place.photos?.[0] ? this.getPhotoUrl(place.photos[0].photo_reference) : undefined,
      }));
    } catch (error) {
      console.error('Places search failed:', error);
      return [];
    }
  }

  /**
   * Get autocomplete suggestions
   */
  static async getAutocompleteSuggestions(
    input: string,
    location?: LocationCoords
  ): Promise<{ placeId: string; description: string; types: string[] }[]> {
    try {
      if (!this.API_KEY) {
        throw new Error('Google Maps API key not configured');
      }

      const params = new URLSearchParams({
        input: input,
        components: 'country:mm',
        key: this.API_KEY,
      });

      if (location) {
        params.append('location', `${location.latitude},${location.longitude}`);
        params.append('radius', '10000'); // 10km radius
      }

      const response = await fetch(`${this.PLACES_URL}/autocomplete/json?${params}`);
      const data = await response.json();

      if (data.status !== 'OK') {
        console.warn(`Autocomplete failed: ${data.status}`);
        return [];
      }

      return data.predictions.map((prediction: any) => ({
        placeId: prediction.place_id,
        description: prediction.description,
        types: prediction.types,
      }));
    } catch (error) {
      console.error('Autocomplete failed:', error);
      return [];
    }
  }

  /**
   * Get place details by place ID
   */
  static async getPlaceDetails(placeId: string): Promise<GeocodeResult | null> {
    try {
      if (!this.API_KEY) {
        throw new Error('Google Maps API key not configured');
      }

      const params = new URLSearchParams({
        place_id: placeId,
        fields: 'geometry,formatted_address,address_components',
        key: this.API_KEY,
      });

      const response = await fetch(`${this.PLACES_URL}/details/json?${params}`);
      const data = await response.json();

      if (data.status !== 'OK' || !data.result) {
        return null;
      }

      const result = data.result;
      const location = result.geometry.location;

      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: result.formatted_address,
        addressComponents: {}, // Parse if needed
        placeId: placeId,
      };
    } catch (error) {
      console.error('Place details failed:', error);
      return null;
    }
  }

  /**
   * Get photo URL for place
   */
  private static getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
    return `${this.PLACES_URL}/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${this.API_KEY}`;
  }

  /**
   * Validate Myanmar address format
   */
  static validateMyanmarAddress(address: string): boolean {
    // Basic validation for Myanmar addresses
    const myanmarCities = [
      'yangon', 'mandalay', 'naypyidaw', 'bagan', 'inle', 'taunggyi',
      'mawlamyine', 'pathein', 'monywa', 'meiktila', 'myitkyina'
    ];

    const addressLower = address.toLowerCase();
    return myanmarCities.some(city => addressLower.includes(city)) || 
           addressLower.includes('myanmar') || 
           addressLower.includes('burma');
  }
}