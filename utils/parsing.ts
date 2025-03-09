import { Buffer } from 'buffer';

/* --- Constants --- */
export const DELIM = ',';
export const MAX_ID_BYTE_SIZE = 20;
export const MAX_STRING_BYTE_SIZE = 23;
export const MAX_AUTH_DATA_PAGES = 16;
export const MAX_AUTH_PAGE_ZERO_SIZE = 17;
export const MAX_AUTH_PAGE_NON_ZERO_SIZE = 23;
export const MAX_AUTH_DATA = MAX_AUTH_PAGE_ZERO_SIZE + (MAX_AUTH_DATA_PAGES - 1) * MAX_AUTH_PAGE_NON_ZERO_SIZE; // 17 + 15*23 = 362
export const MAX_MESSAGE_SIZE = 25;
export const MAX_MESSAGES_IN_PACK = 9;
export const MAX_MESSAGE_PACK_SIZE = MAX_MESSAGE_SIZE * MAX_MESSAGES_IN_PACK; // 225

/* --- Type Definitions --- */
export enum OpenDroneIdType {
  BASIC_ID = 0,
  LOCATION = 1,
  AUTH = 2,
  SELFID = 3,
  SYSTEM = 4,
  OPERATOR_ID = 5,
  MESSAGE_PACK = 0xF,
}

export interface OpenDroneIdHeader {
  type: OpenDroneIdType;
  version: number;
}

export interface Payload {
  toCsvString(): string;
}

/* --- Payload Interfaces --- */
export interface BasicId extends Payload {
  idType: number;
  uaType: number;
  uasId: Buffer;
}

export interface Location extends Payload {
  status: number;
  heightType: number;
  EWDirection: number;
  speedMult: number;
  Direction: number;
  speedHori: number;
  speedVert: number;
  droneLat: number;
  droneLon: number;
  altitudePressure: number;
  altitudeGeodetic: number;
  height: number;
  horizontalAccuracy: number;
  verticalAccuracy: number;
  baroAccuracy: number;
  speedAccuracy: number;
  timestamp: number;
  timeAccuracy: number;
  distance: number;
}

export interface Authentication extends Payload {
  authType: number;
  authDataPage: number;
  authLastPageIndex: number;
  authLength: number;
  authTimestamp: number;
  authData: Buffer;
}

export interface SelfID extends Payload {
  descriptionType: number;
  operationDescription: Buffer;
}

export interface SystemMsg extends Payload {
  operatorLocationType: number;
  classificationType: number;
  operatorLatitude: number;
  operatorLongitude: number;
  areaCount: number;
  areaRadius: number;
  areaCeiling: number;
  areaFloor: number;
  category: number;
  classValue: number;
  operatorAltitudeGeo: number;
  systemTimestamp: number;
}

export interface OperatorID extends Payload {
  operatorIdType: number;
  operatorId: Buffer;
}

export interface MessagePack extends Payload {
  messageSize: number;
  messagesInPack: number;
  messages: Buffer;
}

export interface Message<T extends Payload> {
  msgCounter: number;
  timestamp: number;
  header: OpenDroneIdHeader;
  payload: T;
}

/* --- Buffer Reading Helpers --- */
function readUInt8(buffer: Buffer, offset: number): { value: number; offset: number } {
  return { value: buffer.readUInt8(offset), offset: offset + 1 };
}

function readUInt16LE(buffer: Buffer, offset: number): { value: number; offset: number } {
  return { value: buffer.readUInt16LE(offset), offset: offset + 2 };
}

function readUInt32LE(buffer: Buffer, offset: number): { value: number; offset: number } {
  return { value: buffer.readUInt32LE(offset), offset: offset + 4 };
}

function readInt32LE(buffer: Buffer, offset: number): { value: number; offset: number } {
  return { value: buffer.readInt32LE(offset), offset: offset + 4 };
}

function readBytes(buffer: Buffer, offset: number, length: number): { value: Buffer; offset: number } {
  return { value: buffer.slice(offset, offset + length), offset: offset + length };
}

/* --- Header Parsing --- */
export function parseOpenDroneIdHeader(data: Buffer): OpenDroneIdHeader | null {
  if (data.length < 1) {return null;}
  const firstByte = data.readUInt8(0);
  const type = (firstByte & 0xF0) >> 4;
  const version = firstByte & 0x0F;
  console.log('Header - type:', type, 'version:', version);
  if (![0, 1, 2, 3, 4, 5, 0xF].includes(type)) {return null;}
  return { type: type as OpenDroneIdType, version };
}

/* --- isValidOpenDroneId --- */
// Checks if the provided raw payload (as hex string) contains a valid header.
export function isValidOpenDroneId(rawHex: string): boolean {
  try {
    const rawData = Buffer.from(rawHex, 'hex');
    const header = parseOpenDroneIdHeader(rawData);
    return header !== null;
  } catch (error) {
    console.error('Error parsing OpenDroneId:', error);
    return false;
  }
}

/* --- Parsing Functions for Each Message Type --- */
export function parseBasicId(buffer: Buffer, offset: number): { value: BasicId; offset: number } {
  let res: any = readUInt8(buffer, offset);
  const typeByte = res.value;
  offset = res.offset;
  const idType = (typeByte & 0xF0) >> 4;
  const uaType = typeByte & 0x0F;
  res = readBytes(buffer, offset, MAX_ID_BYTE_SIZE);
  const uasId = res.value;
  offset = res.offset;
  const basicId: BasicId = {
    idType,
    uaType,
    uasId,
    toCsvString: () => `${idType}${DELIM}${uaType}${DELIM}${uasId.toString('utf8')}${DELIM}`,
  };
  return { value: basicId, offset };
}

export function parseLocation(buffer: Buffer, offset: number): { value: Location; offset: number } {
  let res = readUInt8(buffer, offset);
  let b = res.value;
  offset = res.offset;
  const status = (b & 0xF0) >> 4;
  const heightType = (b & 0x04) >> 2;
  const EWDirection = (b & 0x02) >> 1;
  const speedMult = b & 0x01;

  res = readUInt8(buffer, offset);
  const Direction = res.value;
  offset = res.offset;
  res = readUInt8(buffer, offset);
  const speedHori = res.value;
  offset = res.offset;
  res = readUInt8(buffer, offset);
  const speedVert = res.value;
  offset = res.offset;

  let intRes = readInt32LE(buffer, offset);
  const droneLat = intRes.value;
  offset = intRes.offset;
  intRes = readInt32LE(buffer, offset);
  const droneLon = intRes.value;
  offset = intRes.offset;

  res = readUInt16LE(buffer, offset);
  const altitudePressure = res.value;
  offset = res.offset;
  res = readUInt16LE(buffer, offset);
  const altitudeGeodetic = res.value;
  offset = res.offset;
  res = readUInt16LE(buffer, offset);
  const height = res.value;
  offset = res.offset;

  res = readUInt8(buffer, offset);
  const horiVertAccuracy = res.value;
  offset = res.offset;
  const horizontalAccuracy = horiVertAccuracy & 0x0F;
  const verticalAccuracy = (horiVertAccuracy & 0xF0) >> 4;
  res = readUInt8(buffer, offset);
  const speedBaroAccuracy = res.value;
  offset = res.offset;
  const baroAccuracy = (speedBaroAccuracy & 0xF0) >> 4;
  const speedAccuracy = speedBaroAccuracy & 0x0F;
  res = readUInt16LE(buffer, offset);
  const timestamp = res.value;
  offset = res.offset;
  res = readUInt8(buffer, offset);
  const timeAccuracy = res.value & 0x0F;
  offset = res.offset;

  const distance = 0; // Not computed here.
  const location: Location = {
    status,
    heightType,
    EWDirection,
    speedMult,
    Direction,
    speedHori,
    speedVert,
    droneLat,
    droneLon,
    altitudePressure,
    altitudeGeodetic,
    height,
    horizontalAccuracy,
    verticalAccuracy,
    baroAccuracy,
    speedAccuracy,
    timestamp,
    timeAccuracy,
    distance,
    toCsvString: () =>
      `${status}${DELIM}${heightType}${DELIM}${EWDirection}${DELIM}${speedMult}${DELIM}${Direction}${DELIM}${speedHori}${DELIM}${speedVert}${DELIM}${droneLat}${DELIM}${droneLon}${DELIM}${altitudePressure}${DELIM}${altitudeGeodetic}${DELIM}${height}${DELIM}${horizontalAccuracy}${DELIM}${verticalAccuracy}${DELIM}${baroAccuracy}${DELIM}${speedAccuracy}${DELIM}${timestamp}${DELIM}${timeAccuracy}${DELIM}${distance}${DELIM}`,
  };
  return { value: location, offset };
}

export function parseAuthentication(buffer: Buffer, offset: number): { value: Authentication; offset: number } {
  let res = readUInt8(buffer, offset);
  const typeByte = res.value;
  offset = res.offset;
  const authType = (typeByte & 0xF0) >> 4;
  const authDataPage = typeByte & 0x0F;
  const authentication: Authentication = {
    authType,
    authDataPage,
    authLastPageIndex: 0,
    authLength: 0,
    authTimestamp: 0,
    authData: Buffer.alloc(MAX_AUTH_DATA),
    toCsvString: () =>
      `${authType}${DELIM}${authDataPage}${DELIM}${authentication.authLastPageIndex}${DELIM}${authentication.authLength}${DELIM}${authentication.authTimestamp}${DELIM}${authentication.authData.toString('hex')}${DELIM}`,
  };
  let offsetStart = 0;
  let amount = MAX_AUTH_PAGE_ZERO_SIZE;
  if (authDataPage === 0) {
    res = readUInt8(buffer, offset);
    authentication.authLastPageIndex = res.value;
    offset = res.offset;
    res = readUInt8(buffer, offset);
    authentication.authLength = res.value;
    offset = res.offset;
    let intRes = readUInt32LE(buffer, offset);
    authentication.authTimestamp = intRes.value;
    offset = intRes.offset;
  } else {
    offsetStart = MAX_AUTH_PAGE_ZERO_SIZE + (authDataPage - 1) * MAX_AUTH_PAGE_NON_ZERO_SIZE;
    amount = MAX_AUTH_PAGE_NON_ZERO_SIZE;
  }
  for (let i = 0; i < amount; i++) {
    res = readUInt8(buffer, offset);
    authentication.authData[offsetStart + i] = res.value;
    offset = res.offset;
  }
  return { value: authentication, offset };
}

export function parseSelfID(buffer: Buffer, offset: number): { value: SelfID; offset: number } {
  let res: any = readUInt8(buffer, offset);
  const descriptionType = res.value;
  offset = res.offset;
  res = readBytes(buffer, offset, MAX_STRING_BYTE_SIZE);
  const operationDescription = res.value;
  offset = res.offset;
  const selfID: SelfID = {
    descriptionType,
    operationDescription,
    toCsvString: () => `${descriptionType}${DELIM}${operationDescription.toString('utf8')}${DELIM}`,
  };
  return { value: selfID, offset };
}

export function parseSystem(buffer: Buffer, offset: number): { value: SystemMsg; offset: number } {
  let res = readUInt8(buffer, offset);
  const b = res.value;
  offset = res.offset;
  const operatorLocationType = b & 0x03;
  const classificationType = (b & 0x1C) >> 2;
  let intRes = readInt32LE(buffer, offset);
  const operatorLatitude = intRes.value;
  offset = intRes.offset;
  intRes = readInt32LE(buffer, offset);
  const operatorLongitude = intRes.value;
  offset = intRes.offset;
  let shortRes = readUInt16LE(buffer, offset);
  const areaCount = shortRes.value;
  offset = shortRes.offset;
  res = readUInt8(buffer, offset);
  const areaRadius = res.value;
  offset = res.offset;
  shortRes = readUInt16LE(buffer, offset);
  const areaCeiling = shortRes.value;
  offset = shortRes.offset;
  shortRes = readUInt16LE(buffer, offset);
  const areaFloor = shortRes.value;
  offset = shortRes.offset;
  res = readUInt8(buffer, offset);
  const category = (res.value & 0xF0) >> 4;
  const classValue = res.value & 0x0F;
  offset = res.offset;
  shortRes = readUInt16LE(buffer, offset);
  const operatorAltitudeGeo = shortRes.value;
  offset = shortRes.offset;
  intRes = readUInt32LE(buffer, offset);
  const systemTimestamp = intRes.value;
  offset = intRes.offset;
  const systemMsg: SystemMsg = {
    operatorLocationType,
    classificationType,
    operatorLatitude,
    operatorLongitude,
    areaCount,
    areaRadius,
    areaCeiling,
    areaFloor,
    category,
    classValue,
    operatorAltitudeGeo,
    systemTimestamp,
    toCsvString: () =>
      `${operatorLocationType}${DELIM}${classificationType}${DELIM}${operatorLatitude}${DELIM}${operatorLongitude}${DELIM}${areaCount}${DELIM}${areaRadius}${DELIM}${areaCeiling}${DELIM}${areaFloor}${DELIM}${category}${DELIM}${classValue}${DELIM}${operatorAltitudeGeo}${DELIM}${systemTimestamp}${DELIM}`,
  };
  return { value: systemMsg, offset };
}

export function parseOperatorID(buffer: Buffer, offset: number): { value: OperatorID; offset: number } {
  let res: any = readUInt8(buffer, offset);
  const operatorIdType = res.value;
  offset = res.offset;
  res = readBytes(buffer, offset, MAX_ID_BYTE_SIZE);
  const operatorId = res.value;
  offset = res.offset;
  const opId: OperatorID = {
    operatorIdType,
    operatorId,
    toCsvString: () => `${operatorIdType}${DELIM}${operatorId.toString('utf8')}${DELIM}`,
  };
  return { value: opId, offset };
}

export function parseMessagePack(data: Buffer, offset: number): { value: MessagePack | null; offset: number } {
  const startOffset = offset;
  // Skip header (1 byte already parsed outside), then read 2 bytes for pack details.
  offset += 1;
  let res = readBytes(data, offset, 2);
  offset += 2;
  const messageSize = res.value.readUInt8(0);
  const messagesInPack = res.value.readUInt8(1);
  const expectedLength = messageSize * messagesInPack;
  if (
    messageSize !== MAX_MESSAGE_SIZE ||
    messagesInPack <= 0 ||
    messagesInPack > MAX_MESSAGES_IN_PACK ||
    data.length < startOffset + 1 + 2 + expectedLength
  ) {
    return { value: null, offset: data.length };
  }
  res = readBytes(data, offset, expectedLength);
  offset += expectedLength;
  const messagePack: MessagePack = {
    messageSize,
    messagesInPack,
    messages: res.value,
    toCsvString: () => '',
  };
  return { value: messagePack, offset };
}

export function parseMessage(data: Buffer, offset: number, timestamp: number, msgCounter: number): Message<Payload> | null {
  if (data.length < offset + MAX_MESSAGE_SIZE) {return null;}
  let localOffset = offset;
  const headerByte = data.readUInt8(localOffset);
  localOffset += 1;
  const type = (headerByte & 0xF0) >> 4;
  const version = headerByte & 0x0F;
  const header: OpenDroneIdHeader = { type: type as OpenDroneIdType, version };
  let payload: Payload | null = null;
  switch (header.type) {
    case OpenDroneIdType.OPERATOR_ID: {
      const res = parseOperatorID(data, localOffset);
      payload = res.value;
      localOffset = res.offset;
      break;
    }
    case OpenDroneIdType.BASIC_ID: {
      const res = parseBasicId(data, localOffset);
      payload = res.value;
      localOffset = res.offset;
      break;
    }
    case OpenDroneIdType.LOCATION: {
      const res = parseLocation(data, localOffset);
      payload = res.value;
      localOffset = res.offset;
      break;
    }
    case OpenDroneIdType.AUTH: {
      const res = parseAuthentication(data, localOffset);
      payload = res.value;
      localOffset = res.offset;
      break;
    }
    case OpenDroneIdType.SELFID: {
      const res = parseSelfID(data, localOffset);
      payload = res.value;
      localOffset = res.offset;
      break;
    }
    case OpenDroneIdType.SYSTEM: {
      const res = parseSystem(data, localOffset);
      payload = res.value;
      localOffset = res.offset;
      break;
    }
    case OpenDroneIdType.MESSAGE_PACK: {
      const res = parseMessagePack(data, offset);
      if (!res.value) {return null;}
      payload = res.value;
      localOffset = res.offset;
      break;
    }
    default:
      console.warn('Unhandled message type:', header.type);
      return null;
  }
  return {
    msgCounter,
    timestamp,
    header,
    payload,
  };
}

/* --- Utility to Parse Raw Scan Record --- */
// Accepts a rawScanRecord as a hex string.
export function parseRawScanRecord(rawHex: string, timestamp: number, msgCounter: number): Message<Payload> | null {
  try {
    const buffer = Buffer.from(rawHex, 'hex');
    return parseMessage(buffer, 0, timestamp, msgCounter);
  } catch (error) {
    console.error('Error parsing rawScanRecord:', error);
    return null;
  }
}

export function parseMessagePackMessages(
  data: Buffer,
  offset: number,
  timestamp: number,
  msgCounter: number
): Message<Payload>[] {
  const messages: Message<Payload>[] = [];
  // Get the message pack from the data.
  const packResult = parseMessagePack(data, offset);
  if (!packResult.value) {
    console.warn('Message pack could not be parsed.');
    return messages;
  }
  const messagePack = packResult.value;
  const { messageSize, messagesInPack, messages: packBuffer } = messagePack;
  // Iterate over each sub-message in the pack.
  for (let i = 0; i < messagesInPack; i++) {
    // Slice the sub-buffer for this message.
    const subBuffer = packBuffer.slice(i * messageSize, (i + 1) * messageSize);
    // Parse the sub-message. We pass an offset of 0 because subBuffer is exactly one message.
    const subMessage = parseMessage(subBuffer, 0, timestamp, msgCounter + i);
    if (subMessage) {
      messages.push(subMessage);
    } else {
      console.warn(`Sub-message at index ${i} could not be parsed.`);
    }
  }
  return messages;
}


export const UA_TYPE_MAPPING: { [key: number]: string } = {
  0: 'No UA type defined',
  1: 'Aeroplane/Airplane (Fixed wing)',
  2: 'Helicopter or Multirotor',
  3: 'Gyroplane',
  4: 'VTOL (Vertical Take-Off and Landing)',
  5: 'Ornithopter',
  6: 'Glider',
  7: 'Kite',
  8: 'Free Balloon',
  9: 'Captive Balloon',
  10: 'Airship (Blimp)',
  11: 'Free Fall/Parachute',
  12: 'Rocket',
  13: 'Tethered powered aircraft',
  14: 'Ground Obstacle',
  15: 'Other type',
};
