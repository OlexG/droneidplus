/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { isValidOpenDroneId, parseMessage } from './utils/parsing';
import DroneDetails from './components/DroneDetails';

global.Buffer = global.Buffer || Buffer;

// Open Drone ID service UUID for filtering.
const OPEN_DRONE_ID_SERVICE_UUID = '0000fffa-0000-1000-8000-00805f9b34fb';

interface DroneDevice {
  id: string;
  name: string;
  validDrone: boolean;
  messages: any[];
}

const App: React.FC = () => {
  const [bleManager] = useState(new BleManager());
  const [devices, setDevices] = useState<DroneDevice[]>([]);
  // Instead of storing the full device snapshot, we store just the selected drone's ID.
  const [selectedDroneId, setSelectedDroneId] = useState<string | null>(null);
  const scanningRef = useRef(false);

  useEffect(() => {
    const subscription = bleManager.onStateChange((state) => {
      if (state === 'PoweredOn') {
        startScanningLoop();
        subscription.remove();
      }
    }, true);

    return () => {
      scanningRef.current = false;
      bleManager.stopDeviceScan();
      bleManager.destroy();
    };

  }, [bleManager]);

  const startScanningLoop = () => {
    scanningRef.current = true;
    scanDevices();
  };

  const scanDevices = () => {
    bleManager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error) {
        console.error('Scan error:', error);
        return;
      }
      if (device && device.name) {
        const serviceDataHex =
          device.serviceData && device.serviceData[OPEN_DRONE_ID_SERVICE_UUID];
        let validDrone = false;
        if (serviceDataHex) {
          validDrone = isValidOpenDroneId(serviceDataHex);
        }
        // Parse the message from serviceData if available.
        let message: any = null;
        if (serviceDataHex) {
          const buffer = Buffer.from(serviceDataHex, 'base64');
          // For some devices, we need to ignore the first 2 bytes.
          let payload;
          if (buffer.length <= 25) {
            payload = buffer;
          } else {
            payload = buffer.slice(2);
          }
          message = parseMessage(payload, 0, Date.now(), 0);
        }
        setDevices((prevDevices) => {
          const exists = prevDevices.find((d) => d.id === device.id);
          if (!exists) {
            return [
              ...prevDevices,
              {
                id: device.id,
                name: device.name || 'No Name',
                validDrone,
                messages: [message],
              },
            ];
          } else {
            return prevDevices.map((d) => {
              if (d.id === device.id && serviceDataHex) {
                return {
                  ...d,
                  validDrone: d.validDrone || validDrone,
                  messages: [...d.messages, message],
                };
              }
              return d;
            });
          }
        });
      }
    });

    setTimeout(() => {
      bleManager.stopDeviceScan();
      console.log('One second scan complete. Restarting scan...');
      if (scanningRef.current) {
        setTimeout(scanDevices, 3000);
      }
    }, 1000);
  };

  const renderItem = ({ item }: { item: DroneDevice }) => (
    <TouchableOpacity style={styles.item} onPress={() => {
      const setItem = devices.find((d) => d.id === item.id);
      if (setItem && setItem.validDrone) {
        setSelectedDroneId(item.id);
      }
    }}>
      <Text style={styles.title}>
        {item.validDrone ? '🚁 ' : ''}{item.name}
      </Text>
      <Text>{item.id}</Text>
    </TouchableOpacity>
  );

  // Look up the selected drone by ID so that its details are always current.
  const selectedDrone = selectedDroneId ? devices.find((d) => d.id === selectedDroneId) : null;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Discovered BLE Devices</Text>
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text>No devices found.</Text>}
      />
      <Modal
        visible={selectedDroneId !== null}
        animationType="slide"
        onRequestClose={() => setSelectedDroneId(null)}
      >
        {selectedDrone && (
          <DroneDetails
            device={{ id: selectedDrone.id, name: selectedDrone.name }}
            messages={selectedDrone.messages}
          />
        )}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setSelectedDroneId(null)}
        >
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, marginTop: 50, paddingHorizontal: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  item: { marginBottom: 10, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 5 },
  title: { fontSize: 18, fontWeight: '600' },
  closeButton: {
    padding: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    margin: 20,
    borderRadius: 5,
  },
  closeButtonText: { color: '#fff', fontSize: 18 },
});

export default App;
