// validation.ts

import { BasicId, Location, OperatorID } from './parsing';

const ALLOWED_UA_TYPES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const WHITE_LISTED_OPERATOR_IDS = ['FAA12345', 'NASA54321', 'DOD98765'];

export function validateLocation(location: Location): string[] {
  const warnings: string[] = [];

  const referenceLat = 37.7749;
  const referenceLon = -122.4194;

  const droneLat = location.droneLat * 1e-7;
  const droneLon = location.droneLon * 1e-7;

  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(droneLat - referenceLat);
  const dLon = toRad(droneLon - referenceLon);
  const lat1 = toRad(referenceLat);
  const lat2 = toRad(droneLat);

  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  if (distance > 1000) {
    warnings.push(`Drone is ${distance.toFixed(2)} meters away from reference location, which is suspicious.`);
  }

  const horizontalSpeed = location.speedMult === 0
      ? location.speedHori * 0.25
      : location.speedHori * 0.75 + 255 * 0.25;
  if (horizontalSpeed > 100) {
    warnings.push(`Horizontal speed of ${horizontalSpeed.toFixed(2)} m/s is unusually high.`);
  }

  const verticalSpeed = location.speedVert * 0.5;
  if (verticalSpeed > 50) {
    warnings.push(`Vertical speed of ${verticalSpeed.toFixed(2)} m/s is unusually high.`);
  }

  return warnings;
}

export function validateBasicId(basic: BasicId): string[] {
  const warnings: string[] = [];

  if (!ALLOWED_UA_TYPES.includes(basic.uaType)) {
    warnings.push(`UA Type ${basic.uaType} is not valid.`);
  }

  if (!basic.uasId || basic.uasId.toString('utf8').trim() === '') {
    warnings.push('UAS ID is empty or invalid.');
  }

  return warnings;
}


export function validateOperatorId(operator: OperatorID): string[] {
  const warnings: string[] = [];
  const id = operator.operatorId.toString('utf8').trim();
  if (!WHITE_LISTED_OPERATOR_IDS.includes(id)) {
    warnings.push(`Operator ID is not in the white list: ${id}`);
  }

  return warnings;
}
