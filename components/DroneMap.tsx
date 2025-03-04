import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

interface DroneMapProps {
  userLocation: Coordinate; // current user location
  dronePath: Coordinate[];  // array of coordinates for the drone
}

const DroneMap: React.FC<DroneMapProps> = ({ userLocation, dronePath }) => {
  // Define an initial region centered on the user's location.
  const region: Region = {
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <MapView style={styles.map} initialRegion={region} showsUserLocation>
      {/* Drone path as a polyline */}
      {dronePath.length > 0 && (
        <Polyline
          coordinates={dronePath}
          strokeColor="#007AFF"
          strokeWidth={3}
        />
      )}
      {/* Drone marker: place it at the last coordinate of the drone path */}
      {dronePath.length > 0 && (
        <Marker coordinate={dronePath[dronePath.length - 1]}>
          <View style={styles.droneMarker}>
            <View style={styles.droneIcon}>
              <Text style={styles.droneIconText}>🚁</Text>
            </View>
          </View>
        </Marker>
      )}
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  droneMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  droneIcon: {
    backgroundColor: '#fff',
    padding: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  droneIconText: {
    fontSize: 24,
  },
});

export default DroneMap;
