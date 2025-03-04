## Drone ID Plus
### Introduction
For some context, any drone flying in US Airspace have to include a transponder (build in or external) which broadcases data about the drone. The data itself is broadcasted under the DroneID protocol, which standardizes how drones broadcast their identification and flight data in real time.

The key point is that this data is meant to be public, and in a way, this information is meant to act as a “license plate”. Thus, anyone (including interested members of the public) should be able to decode such information. However, currently it is mostly utilized by authorities (airpots, law enforcement, etc) and not by the general public. 

### Project Outline
The goal of this project is to allow anyone to quickly distinguish what drones are flying above them.

The initial iteration is exploretative in nature and is meant to be a proof of concept. 
The goal for this initial version is to
1. Parse DroneID packets emitted from drones and transponders
2. Do integrity checks on these packets (to ensure they aren't spoofed)
3. Determine the maximum distance at which such packets are detected

### DroneID Protocol

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

#### Expected Payload Length

- **Single Message:** 25 bytes  
- **Message Pack:** Up to 228 bytes (1 byte header + 2 bytes for pack details + 9 messages × 25 bytes = 228 bytes)

