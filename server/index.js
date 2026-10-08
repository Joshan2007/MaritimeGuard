require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const { db, initDb, resetToSeedData } = require('./db');
const { IMBL_POINTS, getDistanceToIMBL } = require('./geo');
const { fetchMarineConditions, getLatestConditions } = require('./marine');
const {
  sendEmergencyMessage,
  getMessagingStatus,
  normalizePhoneNumber,
  clearRateLimits,
  isRealSmsEnabled
} = require('./messaging');
const {
  startSimulator,
  setBroadcastCallback,
  setSimulationSpeed,
  setSimulationPaused,
  setStormMode,
  getSimulationState
} = require('./simulator');

// Initialize Database
initDb();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Setup WebSocket broadcasting
const clients = new Set();
wss.on('connection', (ws) => {
  clients.add(ws);

  // Send initial state on connection
  const boats = db.prepare('SELECT * FROM boats').all();
  const conditions = getLatestConditions();
  const config = getSimulationState();
  const messaging = getMessagingStatus();

  ws.send(JSON.stringify({
    type: 'INIT_STATE',
    boats,
    conditions,
    config,
    messaging,
    imbl: IMBL_POINTS
  }));

  ws.on('close', () => {
    clients.delete(ws);
  });
});

function broadcast(data) {
  const json = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === 1) { // OPEN
      client.send(json);
    }
  }
}

setBroadcastCallback(broadcast);

// Fetch initial marine conditions
fetchMarineConditions().catch(err => console.error('Initial marine fetch error:', err));
// Re-fetch marine conditions every 30 minutes
setInterval(() => {
  fetchMarineConditions().catch(e => console.error('Interval marine error:', e));
}, 30 * 60 * 1000);

// Start Telemetry Simulator
startSimulator();

// ================= API ROUTES =================

// 1. System & Demo Controls
app.get('/api/status', (req, res) => {
  const simState = getSimulationState();
  const messagingState = getMessagingStatus();
  const conditions = getLatestConditions();
  res.json({
    simulation: simState,
    messaging: messagingState,
    marine: conditions,
    imbl: IMBL_POINTS
  });
});

// Demo Control: Start Demo (place all boats in safe zone)
app.post('/api/demo/start', (req, res) => {
  db.prepare(`
    UPDATE boats
    SET is_drifting = 0, is_instant_sos = 0, is_returning = 0,
        status = 'Safe',
        heading = (heading % 360)
  `).run();

  // Reset positions within safe zone
  const safePositions = [
    { id: 'boat-1', lat: 9.30, lng: 79.35 },
    { id: 'boat-2', lat: 9.38, lng: 79.40 },
    { id: 'boat-3', lat: 9.42, lng: 79.32 },
    { id: 'boat-4', lat: 9.48, lng: 79.37 },
    { id: 'boat-5', lat: 9.55, lng: 79.30 }
  ];

  for (const pos of safePositions) {
    const dist = getDistanceToIMBL(pos.lat, pos.lng);
    db.prepare(`UPDATE boats SET lat = ?, lng = ?, distance_to_imbl = ?, status = 'Safe' WHERE id = ?`).run(
      pos.lat, pos.lng, dist, pos.id
    );
  }

  setSimulationPaused(false);
  res.json({ success: true, message: 'Demo started. All boats in safe zone.' });
});

// Demo Control: Drift Boat towards border
app.post('/api/demo/drift/:boatId', (req, res) => {
  const { boatId } = req.params;
  // Place boat right in front of the 5.0 NM alert line (approx 5.3 NM out)
  // so the user experiences the full crossing sequence in ~10 seconds:
  // 1. Crosses 5 NM -> Level 1 Alert beep & orange flashing
  // 2. Crosses 1 NM -> Level 2 SOS siren & automated SMS dispatch
  const initialLat = 9.32;
  const initialLng = 79.44;
  const dist = getDistanceToIMBL(initialLat, initialLng);

  db.prepare(`
    UPDATE boats
    SET lat = ?, lng = ?, distance_to_imbl = ?,
        status = 'Safe',
        is_drifting = 1, is_returning = 0, heading = 90.0, speed = 24.0
    WHERE id = ?
  `).run(initialLat, initialLng, dist, boatId);

  res.json({ success: true, message: `Boat ${boatId} initialized at 5.3 NM drifting towards border.` });
});

// Demo Control: Instant SOS
app.post('/api/demo/instant-sos/:boatId', (req, res) => {
  const { boatId } = req.params;
  // Position directly within 0.9 NM of IMBL
  db.prepare(`
    UPDATE boats
    SET lat = 9.40, lng = 79.51, speed = 5.0, heading = 75.0,
        is_drifting = 0, is_returning = 0, is_instant_sos = 1
    WHERE id = ?
  `).run(boatId);
  res.json({ success: true, message: `Boat ${boatId} jumped to SOS zone.` });
});

// Demo Control: Return to Safety
app.post('/api/demo/return-safety/:boatId', (req, res) => {
  const { boatId } = req.params;
  db.prepare(`
    UPDATE boats
    SET is_drifting = 0, is_returning = 1, heading = 250.0, speed = 6.0
    WHERE id = ?
  `).run(boatId);
  res.json({ success: true, message: `Boat ${boatId} returning to safe zone.` });
});

// Demo Control: Storm Mode Toggle
app.post('/api/demo/storm-mode', (req, res) => {
  const { enabled } = req.body;
  setStormMode(!!enabled);
  res.json({ success: true, isStormMode: !!enabled });
});

// Demo Control: Reset Demo
app.post('/api/demo/reset', (req, res) => {
  resetToSeedData();
  clearRateLimits();
  setStormMode(false);
  setSimulationPaused(false);
  setSimulationSpeed(1);
  res.json({ success: true, message: 'Demo reset to seed state successfully.' });
});

// Demo Control: Simulation Speed & Pause
app.post('/api/demo/speed', (req, res) => {
  const { speed } = req.body; // 1, 5, 10, 15
  if ([1, 5, 10, 15].includes(Number(speed))) {
    setSimulationSpeed(Number(speed));
    res.json({ success: true, speed: Number(speed) });
  } else {
    res.status(400).json({ error: 'Speed must be 1, 5, 10, or 15' });
  }
});

app.post('/api/demo/pause', (req, res) => {
  const { paused } = req.body;
  setSimulationPaused(!!paused);
  res.json({ success: true, isPaused: !!paused });
});

// Demo Control: Real SMS toggle
app.post('/api/admin/toggle-real-sms', (req, res) => {
  const { enabled } = req.body;
  db.prepare(`UPDATE system_config SET value = ? WHERE key = 'real_sms_enabled'`).run(enabled ? 'true' : 'false');
  res.json({ success: true, realSmsEnabled: !!enabled });
});

// Demo Control: Test SMS
app.post('/api/admin/send-test-sms', async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) {
    return res.status(400).json({ error: 'Invalid phone number format. Must be international format (+91...)' });
  }

  const result = await sendEmergencyMessage({
    boatId: 'test-demo',
    boatName: 'MaritimaGuard System Test',
    recipientType: 'union',
    recipientName: 'Demo Tester',
    phoneNumber: normalized,
    messageText: `MaritimaGuard Test: Alert system operational at ${new Date().toLocaleTimeString('en-IN')}. This is a simulated demo verification.`
  });

  res.json({ success: true, message: result });
});

// 2. Boats CRUD & Phone updates
app.get('/api/boats', (req, res) => {
  const boats = db.prepare('SELECT * FROM boats ORDER BY name ASC').all();
  res.json(boats);
});

app.get('/api/boats/:id/trail', (req, res) => {
  const { id } = req.params;
  const trail = db.prepare(`
    SELECT lat, lng, speed, heading, timestamp 
    FROM gps_readings 
    WHERE boat_id = ? 
    ORDER BY id DESC 
    LIMIT 40
  `).all(id);
  res.json(trail.reverse());
});

app.post('/api/boats', (req, res) => {
  const {
    name, reg_number, captain_name, crew_count, base_port,
    family_contact_name, family_contact_phone, union_contact_name, union_contact_phone
  } = req.body;

  if (!name || !reg_number || !captain_name || !family_contact_phone || !union_contact_phone) {
    return res.status(400).json({ error: 'Missing required boat fields.' });
  }

  const normFamily = normalizePhoneNumber(family_contact_phone);
  const normUnion = normalizePhoneNumber(union_contact_phone);

  if (!normFamily || !normUnion) {
    return res.status(400).json({ error: 'Phone numbers must be in international format (e.g. +919842100001).' });
  }

  const id = 'boat-' + Date.now();
  const lat = 9.35 + (Math.random() - 0.5) * 0.1;
  const lng = 79.35 + (Math.random() - 0.5) * 0.05;
  const dist = getDistanceToIMBL(lat, lng);

  try {
    db.prepare(`
      INSERT INTO boats (
        id, name, reg_number, captain_name, crew_count, base_port,
        family_contact_name, family_contact_phone, union_contact_name, union_contact_phone,
        status, lat, lng, speed, heading, distance_to_imbl, predicted_cross_minutes
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        'Safe', ?, ?, 4.5, 60.0, ?, 999
      )
    `).run(
      id, name, reg_number, captain_name, parseInt(crew_count) || 5, base_port || 'Rameswaram',
      family_contact_name, normFamily, union_contact_name, normUnion,
      lat, lng, dist
    );
    const created = db.prepare('SELECT * FROM boats WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/boats/:id/contacts', (req, res) => {
  const { id } = req.params;
  const { family_contact_name, family_contact_phone, union_contact_name, union_contact_phone } = req.body;

  const normFamily = normalizePhoneNumber(family_contact_phone);
  const normUnion = normalizePhoneNumber(union_contact_phone);

  if (!normFamily || !normUnion) {
    return res.status(400).json({
      error: 'Invalid phone format. Must start with + and country code followed by 10 digits (e.g. +919842100001).'
    });
  }

  db.prepare(`
    UPDATE boats
    SET family_contact_name = ?, family_contact_phone = ?,
        union_contact_name = ?, union_contact_phone = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(family_contact_name, normFamily, union_contact_name, normUnion, id);

  const updated = db.prepare('SELECT * FROM boats WHERE id = ?').get(id);
  res.json(updated);
});

// 3. Alerts
app.get('/api/alerts', (req, res) => {
  const alerts = db.prepare('SELECT * FROM alert_events ORDER BY id DESC LIMIT 100').all();
  res.json(alerts);
});

app.post('/api/alerts/:id/acknowledge', (req, res) => {
  const { id } = req.params;
  db.prepare('UPDATE alert_events SET acknowledged = 1 WHERE id = ?').run(id);
  res.json({ success: true });
});

// 4. Messages
app.get('/api/messages', (req, res) => {
  const { boat_id } = req.query;
  let messages;
  if (boat_id) {
    messages = db.prepare('SELECT * FROM messages WHERE boat_id = ? ORDER BY id DESC LIMIT 100').all(boat_id);
  } else {
    messages = db.prepare('SELECT * FROM messages ORDER BY id DESC LIMIT 200').all();
  }
  res.json(messages);
});

// 5. Marine Conditions
app.get('/api/marine', (req, res) => {
  const conditions = getLatestConditions();
  res.json(conditions);
});

// Serve frontend in production or proxy in dev
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`MaritimeGuard Server running on port ${PORT}`);
});
