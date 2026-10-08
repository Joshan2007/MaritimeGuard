const { db } = require('./db');
const { getDistanceToIMBL, movePosition, predictMinutesToAlertBuffer } = require('./geo');
const { getLatestConditions, fetchMarineConditions } = require('./marine');
const { sendEmergencyMessage } = require('./messaging');

let simulationInterval = null;
let broadcastCallback = null;
let currentSpeedMultiplier = 1; // 1x, 5x, 10x
let isPaused = false;
let isStormMode = false;

function setBroadcastCallback(cb) {
  broadcastCallback = cb;
}

function getSimulationState() {
  const speedRow = db.prepare(`SELECT value FROM system_config WHERE key = 'simulation_speed'`).get();
  const pauseRow = db.prepare(`SELECT value FROM system_config WHERE key = 'simulation_paused'`).get();
  const stormRow = db.prepare(`SELECT value FROM system_config WHERE key = 'storm_mode'`).get();

  currentSpeedMultiplier = parseInt(speedRow?.value || '1', 10);
  isPaused = pauseRow?.value === 'true';
  isStormMode = stormRow?.value === 'true';

  return {
    speedMultiplier: currentSpeedMultiplier,
    isPaused,
    isStormMode
  };
}

function setSimulationSpeed(mult) {
  currentSpeedMultiplier = mult;
  db.prepare(`UPDATE system_config SET value = ? WHERE key = 'simulation_speed'`).run(String(mult));
}

function setSimulationPaused(paused) {
  isPaused = paused;
  db.prepare(`UPDATE system_config SET value = ? WHERE key = 'simulation_paused'`).run(paused ? 'true' : 'false');
}

function setStormMode(storm) {
  isStormMode = storm;
  db.prepare(`UPDATE system_config SET value = ? WHERE key = 'storm_mode'`).run(storm ? 'true' : 'false');
}

/**
 * Executes one second simulation tick for all boats
 */
async function simulationTick() {
  if (isPaused) return;

  const conditions = getLatestConditions();
  let seaCurrentSpeed = conditions.current_speed || 0.5;
  let seaCurrentDir = conditions.current_direction || 70.0; // Current setting pushes east-northeast towards IMBL

  if (isStormMode) {
    seaCurrentSpeed = seaCurrentSpeed * 3.0; // multiply by 3 in storm mode
  }

  const boats = db.prepare('SELECT * FROM boats').all();
  const updatedBoats = [];
  const latestReadings = [];
  const triggeredEvents = [];

  for (const boat of boats) {
    let speed = boat.speed;
    let heading = boat.heading;
    let lat = boat.lat;
    let lng = boat.lng;

    // Drifting logic: push towards IMBL (approx heading 75 degrees) with increased demo speed
    if (boat.is_drifting) {
      heading = 75.0; // Point straight towards IMBL
      speed = 18.5; // High demo velocity so crossing 1st and 2nd buffer happens in seconds
    } else if (boat.is_returning) {
      // Steer away towards safe zone: heading ~250 degrees (West-Southwest towards Mandapam/Rameswaram coast)
      heading = 250.0;
      speed = 16.0;
    } else if (boat.is_instant_sos) {
      // Jump directly to ~0.9 NM from IMBL (near 9.40, 79.51)
      lat = 9.40;
      lng = 79.51;
      heading = 75.0;
      db.prepare('UPDATE boats SET is_instant_sos = 0 WHERE id = ?').run(boat.id);
    } else {
      // Normal fishing movement: gentle random heading variation (-3 to +3 deg)
      heading = (heading + (Math.random() - 0.5) * 6 + 360) % 360;
    }

    // Move boat position according to speed, heading, and sea current vector
    // Elapsed seconds = 1s * currentSpeedMultiplier
    const elapsedSeconds = 1 * currentSpeedMultiplier;
    const newPos = movePosition(lat, lng, speed, heading, seaCurrentSpeed, seaCurrentDir, elapsedSeconds);

    const distToIMBL = getDistanceToIMBL(newPos.lat, newPos.lng);
    const predictedCrossMinutes = predictMinutesToAlertBuffer(
      newPos.lat,
      newPos.lng,
      speed,
      heading,
      seaCurrentSpeed,
      seaCurrentDir,
      distToIMBL
    );

    // Two-level alert status logic:
    // Safe: dist > 5.0 NM
    // Alert: 1.0 NM < dist <= 5.0 NM
    // SOS: dist <= 1.0 NM
    let newStatus = 'Safe';
    if (distToIMBL <= 1.0) {
      newStatus = 'SOS';
    } else if (distToIMBL <= 5.0) {
      newStatus = 'Alert';
    } else {
      newStatus = 'Safe';
    }

    // Check if crossing status changed
    const oldStatus = boat.status;
    let fireAlert = false;
    let fireSOS = false;

    if (oldStatus !== newStatus) {
      if (newStatus === 'Alert' && oldStatus === 'Safe') {
        fireAlert = true;
      } else if (newStatus === 'SOS') {
        fireSOS = true;
      }
    }

    // If boat returning reaches safe zone, clear returning flag
    let isReturning = boat.is_returning;
    let isDrifting = boat.is_drifting;
    if (isReturning && distToIMBL > 5.5) {
      isReturning = 0;
    }

    // Update boat in DB
    db.prepare(`
      UPDATE boats
      SET lat = ?, lng = ?, speed = ?, heading = ?, distance_to_imbl = ?,
          predicted_cross_minutes = ?, status = ?, is_returning = ?, is_drifting = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      newPos.lat,
      newPos.lng,
      speed,
      heading,
      distToIMBL,
      predictedCrossMinutes,
      newStatus,
      isReturning,
      isDrifting,
      boat.id
    );

    // Record GPS reading in gps_readings table
    db.prepare(`
      INSERT INTO gps_readings (boat_id, lat, lng, speed, heading, distance_to_imbl)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(boat.id, newPos.lat, newPos.lng, speed, heading, distToIMBL);

    const updatedBoat = {
      ...boat,
      lat: newPos.lat,
      lng: newPos.lng,
      speed,
      heading,
      distance_to_imbl: distToIMBL,
      predicted_cross_minutes: predictedCrossMinutes,
      status: newStatus,
      is_returning: isReturning,
      is_drifting: isDrifting
    };
    updatedBoats.push(updatedBoat);

    latestReadings.push({
      boatId: boat.id,
      boatName: boat.name,
      timestamp: new Date().toLocaleTimeString(),
      lat: newPos.lat,
      lng: newPos.lng,
      speed,
      heading,
      distance_to_imbl: distToIMBL,
      status: newStatus
    });

    // Handle Alert events
    if (fireAlert) {
      const alertInfo = db.prepare(`
        INSERT INTO alert_events (boat_id, boat_name, level, lat, lng, distance, acknowledged)
        VALUES (?, ?, 'ALERT', ?, ?, ?, 0)
      `).run(boat.id, boat.name, newPos.lat, newPos.lng, distToIMBL);

      triggeredEvents.push({
        id: alertInfo.lastInsertRowid,
        boatId: boat.id,
        boatName: boat.name,
        level: 'ALERT',
        lat: newPos.lat,
        lng: newPos.lng,
        distance: distToIMBL,
        created_at: new Date().toISOString()
      });
    }

    // Handle SOS events
    if (fireSOS) {
      const sosInfo = db.prepare(`
        INSERT INTO alert_events (boat_id, boat_name, level, lat, lng, distance, acknowledged)
        VALUES (?, ?, 'SOS', ?, ?, ?, 0)
      `).run(boat.id, boat.name, newPos.lat, newPos.lng, distToIMBL);

      const sosEvent = {
        id: sosInfo.lastInsertRowid,
        boatId: boat.id,
        boatName: boat.name,
        level: 'SOS',
        lat: newPos.lat,
        lng: newPos.lng,
        distance: distToIMBL,
        created_at: new Date().toISOString()
      };
      triggeredEvents.push(sosEvent);

      // Automated Emergency SMS to Family and Union:
      // Plain text under 300 characters, no emojis or special symbols
      const timeStr = new Date().toLocaleTimeString('en-IN', { hour12: false });
      const mapLink = `https://maps.google.com/?q=${newPos.lat},${newPos.lng}`;
      const msgText = `EMERGENCY SOS. Boat ${boat.name} (${boat.reg_number}) is ${distToIMBL} nautical mile from the maritime border. Position ${newPos.lat}, ${newPos.lng}. Speed ${speed} kn, heading ${Math.round(heading)} deg. Time ${timeStr}. Map: ${mapLink} Contact captain and union immediately.`;

      // Trigger server-side emergency sends
      (async () => {
        try {
          // Family SMS
          await sendEmergencyMessage({
            boatId: boat.id,
            boatName: boat.name,
            recipientType: 'family',
            recipientName: boat.family_contact_name,
            phoneNumber: boat.family_contact_phone,
            messageText: msgText
          });

          // Union SMS
          await sendEmergencyMessage({
            boatId: boat.id,
            boatName: boat.name,
            recipientType: 'union',
            recipientName: boat.union_contact_name,
            phoneNumber: boat.union_contact_phone,
            messageText: msgText
          });
        } catch (e) {
          console.error('Error dispatching automated SOS messages:', e.message);
        }
      })();
    }
  }

  // Prune old gps_readings keeping latest 200 per boat to maintain high performance
  try {
    db.exec(`
      DELETE FROM gps_readings 
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id, row_number() OVER (PARTITION BY boat_id ORDER BY id DESC) as rn 
          FROM gps_readings
        ) WHERE rn <= 50
      )
    `);
  } catch (e) {
    // ignore
  }

  // Broadcast WebSocket update
  if (broadcastCallback) {
    broadcastCallback({
      type: 'TICK_UPDATE',
      boats: updatedBoats,
      readings: latestReadings,
      events: triggeredEvents,
      conditions: {
        ...conditions,
        wave_height: isStormMode ? 3.0 : conditions.wave_height,
        current_speed: isStormMode ? (conditions.current_speed * 3.0) : conditions.current_speed
      }
    });
  }
}

function startSimulator() {
  if (simulationInterval) clearInterval(simulationInterval);
  getSimulationState();
  // Tick every 1000ms
  simulationInterval = setInterval(simulationTick, 1000);
}

module.exports = {
  startSimulator,
  setBroadcastCallback,
  setSimulationSpeed,
  setSimulationPaused,
  setStormMode,
  getSimulationState
};
