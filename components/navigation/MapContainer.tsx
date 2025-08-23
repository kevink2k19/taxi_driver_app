import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

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
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState({
    latitude: 16.8661, // Yangon coordinates
    longitude: 96.1951,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (currentLocation && mapReady) {
      const newRegion = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      
      if (followUser) {
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);
      }
      
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
        mapType="standard"
        pitchEnabled={true}
        rotateEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
      >
        {/* Current Location Marker */}
        {currentLocation && (
          <Marker
            coordinate={{
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            }}
            title="Your Location"
            description="Current driver position"
            pinColor="#3B82F6"
            anchor={{ x: 0.5, y: 0.5 }}
          />
        )}

        {/* Destination Marker */}
        {destination && (
          <Marker
            coordinate={destination}
            title="Destination"
            description="Drop-off location"
            pinColor="#EF4444"
            anchor={{ x: 0.5, y: 1 }}
          />
        )}

        {/* Route Polyline */}
        {route && route.length > 0 && (
          <Polyline
            coordinates={route}
            strokeColor="#3B82F6"
            strokeWidth={6}
            strokePattern={[1]}
            lineCap="round"
            lineJoin="round"
          />
        )}
      </MapView>
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
});