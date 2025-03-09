## Drone ID Plus

### Introduction

In the United States, every drone flying in regulated airspace must include a transponder (either built-in or external) that broadcasts ID/flight data in real time. The data is broadcasted under the **Remote ID** protocol and is mainly used by regulatory authorities like airports or law enforcement to track drones. Overall, think of it as a “license plate” for drones.

**Open Drone ID** is an open implementation of the Remote ID standard. It adheres to the official protocols defined by ASTM F3411 and related standards, making it possible for the public, not just regulatory authorities, to decode and display drone identification information.

We believe anyone should be able to identify the drones above them, and that you should care what is flying over your home. 

The project itself is currently tested with these **commercial** transponders and works!
1. Ruko R111

### Project Outline

This is meant as an exploratory project to understand the RemoteID protocol and its implications. The project is divided into three main components:

1. **Parse Remote ID Packets:**  
   Decode Open Drone ID messages emitted by drones and transponders.
2. **Integrity Checks:**  
   Validate these packets to help ensure they are authentic and not spoofed.
3. **Range Analysis:**  
   Determine the maximum distance at which Remote ID packets can be detected.

### Open Drone ID Protocol

Open Drone ID packets are transmitted by drones (or their transponders) over Bluetooth Low Energy (BLE) and follow a fixed-format structure. Each individual message is 25 bytes in length. In some cases, multiple messages are bundled together in a **Message Pack** to overcome the BLE advertisement size limitations.

The parser extracts a header (1 byte) from the raw payload, which determines the message type and protocol version, and then parses the remaining 24 bytes according to the message type.

#### Packet Structure

#### General Message Format (25 bytes)

- **Header (1 byte):**  
  - **High nibble (4 bits):** Message Type  
  - **Low nibble (4 bits):** Protocol Version
- **Payload (24 bytes):**  
  The remaining bytes contain the data fields defined by the message type.

#### Message Types

The following table summarizes the message types and their key fields:

| Message Type   | Enum Value | Key Fields                                                   | Description                                                  |
|----------------|------------|--------------------------------------------------------------|--------------------------------------------------------------|
| BASIC_ID       | 0          | `idType`, `uaType`, `UAS ID`                                   | Basic identification information (drone identifier)        |
| LOCATION       | 1          | `status`, `heightType`, `EWDirection`, `speedMult`, `Direction`, `speedHori`, `speedVert`, `droneLat`, `droneLon`, `height` | Location and flight parameters (position, altitude, speed)   |
| AUTH           | 2          | `authType`, `authDataPage`, `authLastPageIndex`, `authLength`, `authTimestamp`, `authData` | Authentication data                                          |
| SELFID         | 3          | `descriptionType`, `operationDescription`                   | Self-identification message (e.g., emergency, status)        |
| SYSTEM         | 4          | `operatorLocationType`, `classificationType`, `operatorLatitude`, `operatorLongitude`, `areaCount`, `areaRadius`, `areaCeiling`, `areaFloor`, `operatorAltitudeGeo`, `systemTimestamp` | System data, including operator location and classification  |
| OPERATOR_ID    | 5          | `operatorIdType`, `operatorId`                                | Operator identification (a fixed-length string)              |
| MESSAGE_PACK   | 0xF        | Contains multiple messages; first 1 byte header, 2 bytes pack details, then concatenated messages (each 25 bytes) | A container for multiple Open Drone ID messages              |

### UA Type Information

The `uaType` field in the BASIC_ID message indicates the type of unmanned aircraft. The following table describes the supported UA types:

| Value | Name                                           | Description                                                                   |
|-------|------------------------------------------------|-------------------------------------------------------------------------------|
| 0     | MAV_ODID_UA_TYPE_NONE                          | No UA (Unmanned Aircraft) type defined.                                       |
| 1     | MAV_ODID_UA_TYPE_AEROPLANE                      | Aeroplane/Airplane. Fixed wing.                                               |
| 2     | MAV_ODID_UA_TYPE_HELICOPTER_OR_MULTIROTOR       | Helicopter or multirotor.                                                     |
| 3     | MAV_ODID_UA_TYPE_GYROPLANE                      | Gyroplane.                                                                    |
| 4     | MAV_ODID_UA_TYPE_HYBRID_LIFT                    | VTOL (Vertical Take-Off and Landing). Fixed wing aircraft with vertical takeoff. |
| 5     | MAV_ODID_UA_TYPE_ORNITHOPTER                    | Ornithopter.                                                                  |
| 6     | MAV_ODID_UA_TYPE_GLIDER                         | Glider.                                                                       |
| 7     | MAV_ODID_UA_TYPE_KITE                           | Kite.                                                                         |
| 8     | MAV_ODID_UA_TYPE_FREE_BALLOON                   | Free Balloon.                                                                 |
| 9     | MAV_ODID_UA_TYPE_CAPTIVE_BALLOON                | Captive Balloon.                                                              |
| 10    | MAV_ODID_UA_TYPE_AIRSHIP                        | Airship (e.g., a blimp).                                                      |
| 11    | MAV_ODID_UA_TYPE_FREE_FALL_PARACHUTE            | Free Fall/Parachute (unpowered).                                              |
| 12    | MAV_ODID_UA_TYPE_ROCKET                         | Rocket.                                                                       |
| 13    | MAV_ODID_UA_TYPE_TETHERED_POWERED_AIRCRAFT        | Tethered powered aircraft.                                                    |
| 14    | MAV_ODID_UA_TYPE_GROUND_OBSTACLE                | Ground Obstacle.                                                              |
| 15    | MAV_ODID_UA_TYPE_OTHER                          | Other type of aircraft not listed earlier.                                  |

### Validation and Integrity Checks

To ensure the authenticity and reliability of the received data, Drone ID Plus implements several validation rules. These checks help flag potentially spoofed or erroneous messages before they are further processed or displayed. The primary validations include:

1. **Location Data Validation:**
   - **Distance Check:**  
     The drone’s reported location is compared to a known reference point (such as a base station). Using the Haversine formula, if the drone is more than a set threshold (e.g., 1000 meters) away from this reference, a warning is raised.
   - **Speed Check:**  
     Horizontal and vertical speed values are validated against expected ranges. For instance, horizontal speeds exceeding 100 m/s or vertical speeds above 50 m/s are flagged as suspicious.

2. **Basic Identification Validation:**
   - **UA Type Check:**  
     The `uaType` value is validated to ensure it falls within the acceptable range (0 to 15). If the value is outside this range, the message is flagged as invalid.
   - **UAS ID Verification:**  
     The UAS ID, which identifies the drone, is checked to ensure it is not empty and conforms to expected formatting. An empty or malformed UAS ID triggers a warning.

3. **Operator Identification Validation:**
   - **Non-Empty Operator ID:**  
     The operator ID must be provided; if it is missing, a warning is generated.
   - **Length Check:**  
     The operator ID should be within a reasonable length (for example, between 3 and 15 characters). IDs that are too short or too long are flagged.
   - **Character Validation:**  
     The operator ID is validated to ensure it contains only allowed characters (alphanumeric characters, dashes, or underscores). The presence of any invalid characters results in a warning.

These validations are implemented in a dedicated `validation.ts` module, ensuring that every message is thoroughly checked for integrity before it is processed or displayed. This not only improves the reliability of the system but also alerts users to any potential anomalies or spoofed data.

#### Expected Payload Length

- **Single Message:** 25 bytes  
- **Message Pack:** Up to 228 bytes (1 byte header + 2 bytes for pack details + 9 messages × 25 bytes = 228 bytes)

