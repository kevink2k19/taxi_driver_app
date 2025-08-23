import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, Platform, Text } from 'react-native';
import * as Location from 'expo-location';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

interface MapContainerProps {
  currentLocation: Location.LocationObject | null;
  destination?: { latitude: number; longitude: number };
  route?: { latitude: number; longitude: number }[];
  onLocationChange?: (location: Location.LocationObject) => void;
  showTraffic?: boolean;
  followUser?: boolean;
}

export default function MapContainer({
  currentLocation,
  destination,
  route,
  onLocationChange,
  showTraffic = true,
  followUser = true,
}: MapContainerProps) {
  const [region, setRegion] = useState({
    latitude: 16.8661, // Yangon coordinates
    longitude: 96.1951,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (currentLocation && mapReady && followUser) {
      const newRegion = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
      
      onLocationChange?.(currentLocation);
    }
  }, [currentLocation, mapReady, followUser]);

  // Fit route to screen when route changes
  useEffect(() => {
    if (route && route.length > 0 && mapReady) {
      mapRef.current?.fitToCoordinates(route, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [route, mapReady]);

  const handleMapReady = () => {
    setMapReady(true);
  };

  const handleRegionChange = (newRegion: any) => {
    setRegion(newRegion);
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <View style={styles.webMapPlaceholder}>
          <Text style={styles.webMapText}>Interactive maps are not available on web platform.</Text>
          <Text style={styles.webMapSubtext}>Use the mobile app for full navigation features.</Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={styles.map}
          region={region}
          onMapReady={handleMapReady}
          onRegionChangeComplete={handleRegionChange}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsCompass={true}
          showsTraffic={showTraffic}
          followsUserLocation={followUser}
          showsBuildings={true}
          showsIndoors={true}
          loadingEnabled={true}
        >
          <View style={styles.nativeMapContainer}>
            <Text style={styles.mapStatusText}>
              {currentLocation ? 'GPS Connected' : 'Connecting to GPS...'}
            </Text>
            {currentLocation && (
              <Text style={styles.coordinatesText}>
                {currentLocation.coords.latitude.toFixed(6)}, {currentLocation.coords.longitude.toFixed(6)}
              </Text>
            )}
          </View>
        </MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  webMapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    margin: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  webMapText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  webMapSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  nativeMapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5F3FF',
    borderRadius: 12,
    margin: 16,
    padding: 20,
  },
  mapStatusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  coordinatesText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
});