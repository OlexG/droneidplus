import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  SafeAreaView,
} from 'react-native';
import {
  OpenDroneIdType,
  Message,
  BasicId,
  Location,
  OperatorID,
  UA_TYPE_MAPPING,
} from '../utils/parsing';
import DroneMap, {Coordinate} from './DroneMap';
import {
  validateLocation,
  validateBasicId,
  validateOperatorId,
} from '../utils/validation';

interface DroneDetailsProps {
  device: {id: string; name: string};
  messages: Message<any>[];
}

const DroneDetails: React.FC<DroneDetailsProps> = ({device, messages}) => {
  // Group latest message by type. Later messages override earlier ones.
  const latestByType = messages.reduce((acc, msg) => {
    if (msg?.header) {
      acc[msg.header.type] = msg;
    }
    return acc;
  }, {} as {[key in OpenDroneIdType]?: Message<any>});

  const getLatestBasic = () => {
    // return latest message with basic header and also idType of 1
    return messages.find(
      msg =>
        msg.header.type === OpenDroneIdType.BASIC_ID &&
        msg.payload.idType === 1,
    );
  };

  const basicMsg = getLatestBasic();
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

  // Run validations and collect warnings
  const locationWarnings = locationData ? validateLocation(locationData) : [];
  const basicWarnings = basicData ? validateBasicId(basicData) : [];
  const operatorWarnings = operatorData ? validateOperatorId(operatorData) : [];

  // State to control map modal visibility
  const [mapVisible, setMapVisible] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Drone Details</Text>
      <Text style={styles.label}>Device ID:</Text>
      <Text style={styles.value}>{device.id}</Text>
      <Text style={styles.label}>Name:</Text>
      <Text style={styles.value}>{device.name}</Text>

      {basicData && basicData.idType === 1 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Identification</Text>
          <Text style={styles.label}>ID Type:</Text>
          <Text style={styles.value}>{basicData.idType}</Text>
          <Text style={styles.label}>UA Type:</Text>
          <Text style={styles.value}>
            {basicData.uaType} -{' '}
            {UA_TYPE_MAPPING[basicData.uaType] || 'Unknown'}
          </Text>
          <Text style={styles.label}>UAS ID (Manufacturer Serial Numbe):</Text>
          <Text style={styles.value}>{basicData.uasId.toString('utf8')}</Text>
          {basicWarnings.length > 0 && (
            <View style={styles.warningContainer}>
              {basicWarnings.map((warning, idx) => (
                <Text key={idx} style={styles.warningText}>
                  {warning}
                </Text>
              ))}
            </View>
          )}
        </View>
      ) : (
        <Text style={styles.error}>
          No Basic Identification data available.
        </Text>
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
              : (locationData.speedHori * 0.75 + 255 * 0.25).toFixed(2)}{' '}
            m/s
          </Text>
          <Text style={styles.label}>Vertical Speed:</Text>
          <Text style={styles.value}>
            {(locationData.speedVert * 0.5).toFixed(2)} m/s
          </Text>
          {locationWarnings.length > 0 && (
            <View style={styles.warningContainer}>
              {locationWarnings.map((warning, idx) => (
                <Text key={idx} style={styles.warningText}>
                  {warning}
                </Text>
              ))}
            </View>
          )}
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
          {operatorWarnings.length > 0 && (
            <View style={styles.warningContainer}>
              {operatorWarnings.map((warning, idx) => (
                <Text key={idx} style={styles.warningText}>
                  {warning}
                </Text>
              ))}
            </View>
          )}
        </View>
      ) : (
        <Text style={styles.error}>No Operator ID data available.</Text>
      )}

      <Text style={styles.label}>Total Messages Received:</Text>
      <Text style={styles.value}>{messages.length}</Text>

      <TouchableOpacity
        style={styles.mapButton}
        onPress={() => setMapVisible(true)}>
        <Text style={styles.mapButtonText}>View Map</Text>
      </TouchableOpacity>

      <Modal
        visible={mapVisible}
        animationType="slide"
        onRequestClose={() => setMapVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <DroneMap dronePath={droneLocations} />
          <TouchableOpacity
            style={styles.absoluteCloseButton}
            onPress={() => setMapVisible(false)}>
            <Text style={styles.closeButtonText}>Close Map</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {padding: 20, backgroundColor: '#fff', paddingTop: 40},
  title: {fontSize: 22, fontWeight: 'bold', marginBottom: 15},
  label: {fontSize: 16, fontWeight: '600', marginTop: 10},
  value: {fontSize: 16},
  section: {
    marginVertical: 15,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
  },
  sectionTitle: {fontSize: 18, fontWeight: '700', marginBottom: 5},
  error: {fontSize: 16, color: 'red', marginTop: 10},
  warningContainer: {
    marginTop: 10,
    padding: 5,
    backgroundColor: '#ffe4b3',
    borderRadius: 3,
  },
  warningText: {color: '#aa6600', fontSize: 14},
  mapButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  mapButtonText: {color: '#fff', fontSize: 18, fontWeight: '600'},
  modalContainer: {flex: 1, backgroundColor: '#fff'},
  absoluteCloseButton: {
    position: 'absolute',
    top: 60,
    right: 10,
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  closeButtonText: {color: '#fff', fontSize: 16},
});

export default DroneDetails;
