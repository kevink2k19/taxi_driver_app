import * as Location from 'expo-location';
import { Alert } from 'react-native';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface LocationOptions {
  accuracy?: Location.Accuracy;
  timeInterval?: number;
  distanceInterval?: number;
}

export class LocationService {
  private static locationSubscription: Location.LocationSubscription | null = null;
  private static isTracking = false;

  /**
   * Request location permissions from user
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      // Request foreground location permission
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'This app needs location access to provide navigation services.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Location.requestForegroundPermissionsAsync() },
          ]
        );
        return false;
      }

      // Request background location permission for navigation
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        Alert.alert(
          'Background Location',
          'For turn-by-turn navigation, please allow background location access.',
          [{ text: 'OK' }]
        );
        // Continue without background permission - foreground is sufficient for basic functionality
      }

      return true;
    } catch (error) {
      console.error('Permission request failed:', error);
      Alert.alert('Error', 'Failed to request location permissions');
      return false;
    }
  }

  /**
   * Get current location once
   */
  static async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 10000, // Accept cached location up to 10 seconds old
        timeout: 15000,    // Timeout after 15 seconds
      });

      return location;
    } catch (error) {
      console.error('Failed to get current location:', error);
      Alert.alert('Location Error', 'Unable to get your current location. Please check your GPS settings.');
      return null;
    }
  }

  /**
   * Start continuous location tracking
   */
  static async startLocationTracking(
    callback: (location: Location.LocationObject) => void,
    options: LocationOptions = {}
  ): Promise<boolean> {
    try {
      if (this.isTracking) {
        console.warn('Location tracking is already active');
        return true;
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return false;

      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: options.accuracy || Location.Accuracy.High,
          timeInterval: options.timeInterval || 5000,  // Update every 5 seconds
          distanceInterval: options.distanceInterval || 10, // Update every 10 meters
        },
        (location) => {
          callback(location);
        }
      );

      this.isTracking = true;
      console.log('Location tracking started successfully');
      return true;
    } catch (error) {
      console.error('Failed to start location tracking:', error);
      Alert.alert('Tracking Error', 'Unable to start location tracking');
      return false;
    }
  }

  /**
   * Stop location tracking
   */
  static stopLocationTracking(): void {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
      this.isTracking = false;
      console.log('Location tracking stopped');
    }
  }

  /**
   * Check if location services are enabled
   */
  static async isLocationEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      console.error('Failed to check location services:', error);
      return false;
    }
  }

  /**
   * Get location accuracy status
   */
  static async getLocationAccuracy(): Promise<Location.Accuracy> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        return Location.Accuracy.High;
      }
      return Location.Accuracy.Low;
    } catch (error) {
      console.error('Failed to get location accuracy:', error);
      return Location.Accuracy.Low;
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  static calculateDistance(
    coord1: LocationCoords,
    coord2: LocationCoords
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (coord1.latitude * Math.PI) / 180;
    const φ2 = (coord2.latitude * Math.PI) / 180;
    const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Calculate bearing between two coordinates
   */
  static calculateBearing(
    coord1: LocationCoords,
    coord2: LocationCoords
  ): number {
    const φ1 = (coord1.latitude * Math.PI) / 180;
    const φ2 = (coord2.latitude * Math.PI) / 180;
    const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360; // Normalize to 0-360 degrees
  }

  /**
   * Check if user is currently tracking location
   */
  static isCurrentlyTracking(): boolean {
    return this.isTracking;
  }
}