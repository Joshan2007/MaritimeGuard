const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'maritimaguard.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

function initDb() {
  // Boats table
  db.exec(`
    CREATE TABLE IF NOT EXISTS boats (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      reg_number TEXT NOT NULL UNIQUE,
      captain_name TEXT NOT NULL,
      crew_count INTEGER NOT NULL,
      base_port TEXT NOT NULL,
      family_contact_name TEXT NOT NULL,
      family_contact_phone TEXT NOT NULL,
      union_contact_name TEXT NOT NULL,
      union_contact_phone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Safe', -- 'Safe', 'Alert', 'SOS'
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      speed REAL NOT NULL,
      heading REAL NOT NULL,
      distance_to_imbl REAL NOT NULL DEFAULT 10.0,
      predicted_cross_minutes REAL,
      is_drifting INTEGER NOT NULL DEFAULT 0,
      is_instant_sos INTEGER NOT NULL DEFAULT 0,
      is_returning INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS gps_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      boat_id TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      speed REAL NOT NULL,
      heading REAL NOT NULL,
      distance_to_imbl REAL NOT NULL,
      FOREIGN KEY (boat_id) REFERENCES boats (id)
    );

    CREATE TABLE IF NOT EXISTS alert_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      boat_id TEXT NOT NULL,
      boat_name TEXT NOT NULL,
      level TEXT NOT NULL, -- 'ALERT', 'SOS'
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      distance REAL NOT NULL,
      acknowledged INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      boat_id TEXT NOT NULL,
      boat_name TEXT NOT NULL,
      recipient_type TEXT NOT NULL, -- 'family', 'union'
      recipient_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      message_text TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'SMS',
      status TEXT NOT NULL, -- 'Sent (real)', 'Sent (mock)', 'Delivered', 'Undelivered', 'Failed'
      provider_message_id TEXT,
      error_text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS marine_conditions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      current_speed REAL NOT NULL DEFAULT 0.5,
      current_direction REAL NOT NULL DEFAULT 70.0,
      wave_height REAL NOT NULL DEFAULT 1.2,
      wave_direction REAL NOT NULL DEFAULT 65.0,
      fetched_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      source TEXT NOT NULL DEFAULT 'Default values' -- 'Live marine data', 'Using cached data', 'Default values'
    );

    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Seed default configuration
  const setConfig = db.prepare(`INSERT OR IGNORE INTO system_config (key, value) VALUES (?, ?)`);
  setConfig.run('real_sms_enabled', 'false');
  setConfig.run('simulation_speed', '1');
  setConfig.run('simulation_paused', 'false');
  setConfig.run('storm_mode', 'false');
  setConfig.run('last_sms_sent_result', 'Ready. Real SMS is OFF (demo mode enabled).');

  seedBoatsIfEmpty();
}

const SEED_BOATS = [
  {
    id: 'boat-1',
    name: 'Annai Mary',
    reg_number: 'IND-TN-10-MM-1021',
    captain_name: 'Antony Cruz',
    crew_count: 5,
    base_port: 'Rameswaram',
    family_contact_name: 'Mary Cruz (Wife)',
    family_contact_phone: '+919445565979',
    union_contact_name: 'Palk Fishermen Union - Rameswaram',
    union_contact_phone: '+919445565979',
    status: 'Safe',
    lat: 9.30,
    lng: 79.35,
    speed: 4.8,
    heading: 65.0
  },
  {
    id: 'boat-2',
    name: 'Kadal Raja',
    reg_number: 'IND-TN-10-MM-2045',
    captain_name: 'Murugan P.',
    crew_count: 6,
    base_port: 'Pamban',
    family_contact_name: 'Lakshmi Murugan (Wife)',
    family_contact_phone: '+919445565979',
    union_contact_name: 'Pamban Country Craft Union',
    union_contact_phone: '+919445565979',
    status: 'Safe',
    lat: 9.38,
    lng: 79.40,
    speed: 5.2,
    heading: 75.0
  },
  {
    id: 'boat-3',
    name: 'Sea Pearl',
    reg_number: 'IND-TN-10-MM-3012',
    captain_name: 'Senthil Kumar',
    crew_count: 4,
    base_port: 'Mandapam',
    family_contact_name: 'Kavitha Senthil (Sister)',
    family_contact_phone: '+919445565979',
    union_contact_name: 'Mandapam Deep Sea Guild',
    union_contact_phone: '+919445565979',
    status: 'Safe',
    lat: 9.42,
    lng: 79.32,
    speed: 4.1,
    heading: 55.0
  },
  {
    id: 'boat-4',
    name: 'Rameswaram Star',
    reg_number: 'IND-TN-10-MM-4088',
    captain_name: 'Mariappan K.',
    crew_count: 5,
    base_port: 'Thangachimadam',
    family_contact_name: 'Selvi Mariappan (Daughter)',
    family_contact_phone: '+919445565979',
    union_contact_name: 'Thangachimadam Trawlers Union',
    union_contact_phone: '+919445565979',
    status: 'Safe',
    lat: 9.48,
    lng: 79.37,
    speed: 5.6,
    heading: 80.0
  },
  {
    id: 'boat-5',
    name: 'Muthu Kumar',
    reg_number: 'IND-TN-10-MM-5099',
    captain_name: 'Francis Xavier',
    crew_count: 7,
    base_port: 'Rameswaram',
    family_contact_name: 'Grace Francis (Wife)',
    family_contact_phone: '+919445565979',
    union_contact_name: 'Rameswaram Port Association',
    union_contact_phone: '+919445565979',
    status: 'Safe',
    lat: 9.55,
    lng: 79.30,
    speed: 4.5,
    heading: 70.0
  }
];

function seedBoatsIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as c FROM boats').get().c;
  if (count === 0) {
    resetToSeedData();
  }
}

function resetToSeedData() {
  const insertBoat = db.prepare(`
    INSERT INTO boats (
      id, name, reg_number, captain_name, crew_count, base_port,
      family_contact_name, family_contact_phone, union_contact_name, union_contact_phone,
      status, lat, lng, speed, heading, distance_to_imbl, predicted_cross_minutes,
      is_drifting, is_instant_sos, is_returning
    ) VALUES (
      @id, @name, @reg_number, @captain_name, @crew_count, @base_port,
      @family_contact_name, @family_contact_phone, @union_contact_name, @union_contact_phone,
      @status, @lat, @lng, @speed, @heading, 10.0, 999,
      0, 0, 0
    )
  `);

  const deleteReadings = db.prepare('DELETE FROM gps_readings');
  const deleteAlerts = db.prepare('DELETE FROM alert_events');
  const deleteMessages = db.prepare('DELETE FROM messages');
  const deleteBoats = db.prepare('DELETE FROM boats');

  const txn = db.transaction(() => {
    deleteReadings.run();
    deleteAlerts.run();
    deleteMessages.run();
    deleteBoats.run();

    for (const b of SEED_BOATS) {
      insertBoat.run(b);
    }
  });

  txn();
}

module.exports = {
  db,
  initDb,
  resetToSeedData,
  SEED_BOATS
};
