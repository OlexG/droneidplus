import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Platform, PermissionsAndroid } from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

interface DroneMapProps {
  dronePath: Coordinate[];  // Array of coordinates for the drone's path
}

const DroneMap: React.FC<DroneMapProps> = ({ dronePath }) => {
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);

  useEffect(() => {
    async function requestLocationPermission() {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message: 'This app requires access to your location to display the map.',
              buttonPositive: 'OK',
            }
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('Location permission denied');
            return;
          }
        } catch (err) {
          console.warn(err);
        }
      }
    }
    requestLocationPermission();

    Geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => console.error('Error getting location', error),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  }, []);

  const initialLocation: Coordinate = userLocation || { latitude: 37.78825, longitude: -122.4324 };

  const region: Region = {
    latitude: initialLocation.latitude,
    longitude: initialLocation.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <MapView style={styles.map} region={region} showsUserLocation>
      {dronePath.length > 0 && (
        <>
          <Polyline coordinates={dronePath} strokeColor="#007AFF" strokeWidth={3} />
          <Marker coordinate={dronePath[dronePath.length - 1]}>
            <View style={styles.droneMarker}>
              <View style={styles.droneIcon}>
                <Text style={styles.droneIconText}>🚁</Text>
              </View>
            </View>
          </Marker>
        </>
      )}
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  droneMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 3,
  },
  droneIcon: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  droneIconText: {
    fontSize: 28,
  },
});

export default DroneMap;
