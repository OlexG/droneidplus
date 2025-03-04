import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { OpenDroneIdType, Message, BasicId, Location, OperatorID } from '../utils/parsing';
import DroneMap, { Coordinate } from './DroneMap';

interface DroneDetailsProps {
  device: { id: string; name: string };
  messages: Message<any>[];
}

const DroneDetails: React.FC<DroneDetailsProps> = ({ device, messages }) => {
  // Group latest message by type. Later messages override earlier ones.
  const latestByType = messages.reduce((acc, msg) => {
    acc[msg.header.type] = msg;
    return acc;
  }, {} as { [key in OpenDroneIdType]?: Message<any> });

  const basicMsg = latestByType[OpenDroneIdType.BASIC_ID];
  const locationMsg = latestByType[OpenDroneIdType.LOCATION];
  const operatorMsg = latestByType[OpenDroneIdType.OPERATOR_ID];

  const basicData = basicMsg ? (basicMsg.payload as BasicId) : null;
  const locationData = locationMsg ? (locationMsg.payload as Location) : null;
  const operatorData = operatorMsg ? (operatorMsg.payload as OperatorID) : null;

  // Build a drone path from all location messages
  const droneLocations: Coordinate[] = messages
    .filter(msg => msg.header.type === OpenDroneIdType.LOCATION)
    .map((msg: Message<Location>) => ({
      latitude: msg.payload.droneLat * 1e-7,
      longitude: msg.payload.droneLon * 1e-7,
    }));

  // For demonstration, we set a fixed user location. In a real app, get this from device geolocation.
  const userLocation: Coordinate = { latitude: 37.78825, longitude: -122.4324 };

  // State to control map modal visibility
  const [mapVisible, setMapVisible] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Drone Details</Text>
      <Text style={styles.label}>Device ID:</Text>
      <Text style={styles.value}>{device.id}</Text>
      <Text style={styles.label}>Name:</Text>
      <Text style={styles.value}>{device.name}</Text>

      {basicData ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Identification</Text>
          <Text style={styles.label}>ID Type:</Text>
          <Text style={styles.value}>{basicData.idType}</Text>
          <Text style={styles.label}>UA Type:</Text>
          <Text style={styles.value}>{basicData.uaType}</Text>
          <Text style={styles.label}>UAS ID:</Text>
          <Text style={styles.value}>{basicData.uasId.toString('utf8')}</Text>
        </View>
      ) : (
        <Text style={styles.error}>No Basic Identification data available.</Text>
      )}

      {locationData ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location Information</Text>
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>{locationData.status}</Text>
          <Text style={styles.label}>Latitude:</Text>
          <Text style={styles.value}>
            {(locationData.droneLat * 1e-7).toFixed(7)}
          </Text>
          <Text style={styles.label}>Longitude:</Text>
          <Text style={styles.value}>
            {(locationData.droneLon * 1e-7).toFixed(7)}
          </Text>
          <Text style={styles.label}>Altitude (calculated):</Text>
          <Text style={styles.value}>
            {(locationData.height / 2 - 1000).toFixed(2)} m
          </Text>
          <Text style={styles.label}>Horizontal Speed:</Text>
          <Text style={styles.value}>
            {locationData.speedMult === 0
              ? (locationData.speedHori * 0.25).toFixed(2)
              : (locationData.speedHori * 0.75 + 255 * 0.25).toFixed(2)} m/s
          </Text>
          <Text style={styles.label}>Vertical Speed:</Text>
          <Text style={styles.value}>
            {(locationData.speedVert * 0.5).toFixed(2)} m/s
          </Text>
        </View>
      ) : (
        <Text style={styles.error}>No Location data available.</Text>
      )}

      {operatorData ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Operator Information</Text>
          <Text style={styles.label}>Operator ID:</Text>
          <Text style={styles.value}>
            {operatorData.operatorId.toString('utf8')}
          </Text>
        </View>
      ) : (
        <Text style={styles.error}>No Operator ID data available.</Text>
      )}

      <Text style={styles.label}>Total Messages Received:</Text>
      <Text style={styles.value}>{messages.length}</Text>

      <TouchableOpacity style={styles.mapButton} onPress={() => setMapVisible(true)}>
        <Text style={styles.mapButtonText}>View Map</Text>
      </TouchableOpacity>

      <Modal visible={mapVisible} animationType="slide" onRequestClose={() => setMapVisible(false)}>
        <View style={{ flex: 1 }}>
          <DroneMap userLocation={userLocation} dronePath={droneLocations} />
          <TouchableOpacity style={styles.closeButton} onPress={() => setMapVisible(false)}>
            <Text style={styles.closeButtonText}>Close Map</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  label: { fontSize: 16, fontWeight: '600', marginTop: 10 },
  value: { fontSize: 16 },
  section: { marginVertical: 15, padding: 10, backgroundColor: '#f9f9f9', borderRadius: 5 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 5 },
  error: { fontSize: 16, color: 'red', marginTop: 10 },
  mapButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  mapButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  closeButton: {
    padding: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    margin: 20,
    borderRadius: 5,
  },
  closeButtonText: { color: '#fff', fontSize: 18 },
});

export default DroneDetails;
