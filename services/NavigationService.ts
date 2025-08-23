import { LocationCoords } from './LocationService';

export interface RouteOptions {
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  optimize?: 'time' | 'distance' | 'fuel';
  mode?: 'driving' | 'walking' | 'transit';
  language?: 'en' | 'my';
}

export interface RouteResult {
  coordinates: LocationCoords[];
  distance: string;
  duration: string;
  instructions: NavigationInstruction[];
  bounds: {
    northeast: LocationCoords;
    southwest: LocationCoords;
  };
  polylineEncoded: string;
}

export interface NavigationInstruction {
  text: string;
  distance: string;
  duration: string;
  maneuver: string;
  coordinates: LocationCoords;
  streetName?: string;
  exitNumber?: string;
}

export interface TrafficInfo {
  severity: 'low' | 'medium' | 'high' | 'severe';
  description: string;
  delay: string;
}

export class NavigationService {
  private static readonly API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  private static readonly DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';
  private static readonly DISTANCE_MATRIX_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';

  /**
   * Calculate route between origin and destination
   */
  static async calculateRoute(
    origin: LocationCoords,
    destination: LocationCoords,
    options: RouteOptions = {}
  ): Promise<RouteResult | null> {
    try {
      if (!this.API_KEY) {
        throw new Error('Google Maps API key not configured');
      }

      const params = new URLSearchParams({
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
        mode: options.mode || 'driving',
        language: options.language || 'en',
        region: 'MM', // Myanmar region
        key: this.API_KEY,
      });

      // Add route preferences
      const avoidOptions = [];
      if (options.avoidTolls) avoidOptions.push('tolls');
      if (options.avoidHighways) avoidOptions.push('highways');
      if (avoidOptions.length > 0) {
        params.append('avoid', avoidOptions.join('|'));
      }

      // Add optimization
      if (options.optimize === 'distance') {
        params.append('optimize', 'distance');
      }

      const response = await fetch(`${this.DIRECTIONS_URL}?${params}`);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Directions API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
      }

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];

        return {
          coordinates: this.decodePolyline(route.overview_polyline.points),
          distance: leg.distance.text,
          duration: leg.duration.text,
          instructions: leg.steps.map((step: any) => ({
            text: this.cleanHtmlInstructions(step.html_instructions),
            distance: step.distance.text,
            duration: step.duration.text,
            maneuver: step.maneuver || 'straight',
            coordinates: {
              latitude: step.start_location.lat,
              longitude: step.start_location.lng,
            },
            streetName: this.extractStreetName(step.html_instructions),
          })),
          bounds: {
            northeast: route.bounds.northeast,
            southwest: route.bounds.southwest,
          },
          polylineEncoded: route.overview_polyline.points,
        };
      }
      return null;
    } catch (error) {
      console.error('Route calculation failed:', error);
      return null;
    }
  }

  /**
   * Get multiple route alternatives
   */
  static async getRouteAlternatives(
    origin: LocationCoords,
    destination: LocationCoords,
    options: RouteOptions = {}
  ): Promise<RouteResult[]> {
    try {
      const params = new URLSearchParams({
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
        mode: options.mode || 'driving',
        alternatives: 'true',
        language: options.language || 'en',
        region: 'MM',
        key: this.API_KEY!,
      });

      const response = await fetch(`${this.DIRECTIONS_URL}?${params}`);
      const data = await response.json();

      if (data.status !== 'OK' || !data.routes) {
        return [];
      }

      return data.routes.map((route: any) => {
        const leg = route.legs[0];
        return {
          coordinates: this.decodePolyline(route.overview_polyline.points),
          distance: leg.distance.text,
          duration: leg.duration.text,
          instructions: leg.steps.map((step: any) => ({
            text: this.cleanHtmlInstructions(step.html_instructions),
            distance: step.distance.text,
            duration: step.duration.text,
            maneuver: step.maneuver || 'straight',
            coordinates: {
              latitude: step.start_location.lat,
              longitude: step.start_location.lng,
            },
          })),
          bounds: {
            northeast: route.bounds.northeast,
            southwest: route.bounds.southwest,
          },
          polylineEncoded: route.overview_polyline.points,
        };
      });
    } catch (error) {
      console.error('Failed to get route alternatives:', error);
      return [];
    }
  }

  /**
   * Get estimated travel time with current traffic
   */
  static async getTrafficAwareETA(
    origin: LocationCoords,
    destination: LocationCoords
  ): Promise<{ duration: string; durationInTraffic: string; trafficInfo: TrafficInfo } | null> {
    try {
      const params = new URLSearchParams({
        origins: `${origin.latitude},${origin.longitude}`,
        destinations: `${destination.latitude},${destination.longitude}`,
        mode: 'driving',
        departure_time: 'now',
        traffic_model: 'best_guess',
        key: this.API_KEY!,
      });

      const response = await fetch(`${this.DISTANCE_MATRIX_URL}?${params}`);
      const data = await response.json();

      if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
        const element = data.rows[0].elements[0];
        const normalDuration = parseInt(element.duration.value);
        const trafficDuration = parseInt(element.duration_in_traffic?.value || element.duration.value);
        
        const delay = trafficDuration - normalDuration;
        const trafficSeverity = this.calculateTrafficSeverity(delay, normalDuration);

        return {
          duration: element.duration.text,
          durationInTraffic: element.duration_in_traffic?.text || element.duration.text,
          trafficInfo: {
            severity: trafficSeverity,
            description: this.getTrafficDescription(trafficSeverity),
            delay: delay > 60 ? `${Math.round(delay / 60)} min delay` : 'No delay',
          },
        };
      }
      return null;
    } catch (error) {
      console.error('Traffic ETA calculation failed:', error);
      return null;
    }
  }

  /**
   * Decode Google Maps polyline
   */
  private static decodePolyline(encoded: string): LocationCoords[] {
    const coordinates: LocationCoords[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let shift = 0;
      let result = 0;
      let byte;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const deltaLat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += deltaLat;

      shift = 0;
      result = 0;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const deltaLng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += deltaLng;

      coordinates.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return coordinates;
  }

  /**
   * Clean HTML from navigation instructions
   */
  private static cleanHtmlInstructions(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Replace HTML entities
      .trim();
  }

  /**
   * Extract street name from instructions
   */
  private static extractStreetName(html: string): string | undefined {
    const match = html.match(/on <b>(.*?)<\/b>/);
    return match ? match[1] : undefined;
  }

  /**
   * Calculate traffic severity based on delay
   */
  private static calculateTrafficSeverity(delay: number, normalDuration: number): TrafficInfo['severity'] {
    const delayPercentage = (delay / normalDuration) * 100;
    
    if (delayPercentage > 50) return 'severe';
    if (delayPercentage > 25) return 'high';
    if (delayPercentage > 10) return 'medium';
    return 'low';
  }

  /**
   * Get traffic description
   */
  private static getTrafficDescription(severity: TrafficInfo['severity']): string {
    switch (severity) {
      case 'severe':
        return 'Heavy traffic - significant delays expected';
      case 'high':
        return 'Moderate traffic - some delays possible';
      case 'medium':
        return 'Light traffic - minor delays';
      case 'low':
      default:
        return 'Clear roads - no delays';
    }
  }

  /**
   * Check if location is within Myanmar bounds
   */
  static isLocationInMyanmar(coords: LocationCoords): boolean {
    // Myanmar approximate bounds
    const myanmarBounds = {
      north: 28.5478,
      south: 9.4518,
      east: 101.1700,
      west: 92.1719,
    };

    return (
      coords.latitude >= myanmarBounds.south &&
      coords.latitude <= myanmarBounds.north &&
      coords.longitude >= myanmarBounds.west &&
      coords.longitude <= myanmarBounds.east
    );
  }
}