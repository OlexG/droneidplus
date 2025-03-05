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

#### Expected Payload Length

- **Single Message:** 25 bytes  
- **Message Pack:** Up to 228 bytes (1 byte header + 2 bytes for pack details + 9 messages × 25 bytes = 228 bytes)

