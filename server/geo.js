/**
 * Geo Calculations for IMBL and Marine tracking
 * IMBL Coordinates:
 * 1. 10.08, 80.05
 * 2. 9.95, 79.58
 * 3. 9.67, 79.37
 * 4. 9.35, 79.53
 * 5. 9.22, 79.53
 */

const IMBL_POINTS = [
  { lat: 10.08, lng: 80.05 },
  { lat: 9.95, lng: 79.58 },
  { lat: 9.67, lng: 79.37 },
  { lat: 9.35, lng: 79.53 },
  { lat: 9.22, lng: 79.53 }
];

const EARTH_RADIUS_NM = 3440.065; // Earth radius in nautical miles
const EARTH_RADIUS_KM = 6371.0;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

/**
 * Haversine distance between two points in nautical miles
 */
function haversineDistanceNM(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_NM * c;
}

/**
 * Calculates shortest distance from point to segment in nautical miles.
 * Approximates locally on equirectangular projection for accurate perpendicular distance.
 */
function distancePointToSegmentNM(pLat, pLon, aLat, aLon, bLat, bLon) {
  const meanLatRad = toRad((aLat + bLat + pLat) / 3);
  const cosLat = Math.cos(meanLatRad);

  // Convert to local nautical mile Cartesian offsets
  const nmPerDegLat = 60.0;
  const nmPerDegLon = 60.0 * cosLat;

  const px = pLon * nmPerDegLon;
  const py = pLat * nmPerDegLat;
  const ax = aLon * nmPerDegLon;
  const ay = aLat * nmPerDegLat;
  const bx = bLon * nmPerDegLon;
  const by = bLat * nmPerDegLat;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  // Projection parameter t
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = ax + t * dx;
  const projY = ay + t * dy;

  return Math.hypot(px - projX, py - projY);
}

/**
 * Shortest distance from boat to any segment of IMBL in nautical miles
 */
function getDistanceToIMBL(lat, lng) {
  let minDistance = Infinity;
  for (let i = 0; i < IMBL_POINTS.length - 1; i++) {
    const p1 = IMBL_POINTS[i];
    const p2 = IMBL_POINTS[i + 1];
    const dist = distancePointToSegmentNM(lat, lng, p1.lat, p1.lng, p2.lat, p2.lng);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }
  return parseFloat(minDistance.toFixed(2));
}

/**
 * Moves a coordinate given speed in knots, heading in degrees, and elapsed seconds
 * Plus optional current vector: currentSpeed (knots), currentDir (degrees heading towards)
 */
function movePosition(lat, lng, speedKnots, headingDeg, currentSpeedKnots, currentDirDeg, elapsedSeconds) {
  // Speed is in knots (nautical miles per hour)
  // Convert hours elapsed
  const hours = elapsedSeconds / 3600.0;

  // Boat velocity vector in NM
  const boatDistanceNM = speedKnots * hours;
  const boatHeadingRad = toRad(headingDeg);
  const bDistNorth = boatDistanceNM * Math.cos(boatHeadingRad);
  const bDistEast = boatDistanceNM * Math.sin(boatHeadingRad);

  // Current velocity vector in NM
  const currentDistanceNM = currentSpeedKnots * hours;
  const currentHeadingRad = toRad(currentDirDeg);
  const cDistNorth = currentDistanceNM * Math.cos(currentHeadingRad);
  const cDistEast = currentDistanceNM * Math.sin(currentHeadingRad);

  // Total displacement in nautical miles
  const totalNorthNM = bDistNorth + cDistNorth;
  const totalEastNM = bDistEast + cDistEast;

  // 1 degree latitude = 60 nautical miles
  const deltaLat = totalNorthNM / 60.0;
  // 1 degree longitude = 60 * cos(lat) nautical miles
  const meanLatRad = toRad(lat + deltaLat / 2);
  const deltaLng = totalEastNM / (60.0 * Math.max(0.01, Math.cos(meanLatRad)));

  // Add small random GPS noise: 5 to 10 meters (10m = 0.0054 nautical miles = ~0.00009 degrees)
  const noiseScale = 0.00006;
  const noiseLat = (Math.random() - 0.5) * noiseScale;
  const noiseLng = (Math.random() - 0.5) * noiseScale;

  return {
    lat: parseFloat((lat + deltaLat + noiseLat).toFixed(6)),
    lng: parseFloat((lng + deltaLng + noiseLng).toFixed(6))
  };
}

/**
 * Predict minutes until crossing the Alert buffer line (5 NM)
 * Predicted movement vector = boat vector + current vector
 */
function predictMinutesToAlertBuffer(lat, lng, speedKnots, headingDeg, currentSpeedKnots, currentDirDeg, currentDistanceToIMBL) {
  // If already at or past the alert buffer (<= 5 NM)
  if (currentDistanceToIMBL <= 5.0) {
    return 0;
  }

  // Calculate distance change rate towards IMBL in nautical miles per hour
  // Simulate 1 hour ahead
  const simulated = movePosition(lat, lng, speedKnots, headingDeg, currentSpeedKnots, currentDirDeg, 3600);
  const simulatedDist = getDistanceToIMBL(simulated.lat, simulated.lng);

  const deltaDist = currentDistanceToIMBL - simulatedDist; // Positive if getting closer to IMBL

  // If deltaDist <= 0.05, boat is moving away or parallel to border
  if (deltaDist <= 0.05) {
    return -1; // Flag for "Moving away from border"
  }

  // Rate of approach in NM per hour = deltaDist NM/hr
  const distanceToAlertLine = currentDistanceToIMBL - 5.0; // Distance left to reach 5 NM
  const hoursToReach = distanceToAlertLine / deltaDist;
  const minutesToReach = hoursToReach * 60;

  return Math.round(minutesToReach);
}

module.exports = {
  IMBL_POINTS,
  haversineDistanceNM,
  getDistanceToIMBL,
  movePosition,
  predictMinutesToAlertBuffer
};
