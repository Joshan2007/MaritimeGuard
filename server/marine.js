const axios = require('axios');
const { db } = require('./db');

let cachedConditions = null;
let lastFetchTimestamp = 0;
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

const DEFAULT_CONDITIONS = {
  current_speed: 0.5,
  current_direction: 70.0,
  wave_height: 1.2,
  wave_direction: 65.0,
  source: 'Default values'
};

async function fetchMarineConditions() {
  const now = Date.now();

  // Return memory cache if still valid within 30 minutes
  if (cachedConditions && (now - lastFetchTimestamp < CACHE_DURATION_MS)) {
    return cachedConditions;
  }

  // Check database for recently cached conditions
  try {
    const dbRow = db.prepare(`
      SELECT * FROM marine_conditions ORDER BY id DESC LIMIT 1
    `).get();

    if (dbRow) {
      const fetchedTime = new Date(dbRow.fetched_time).getTime();
      if (now - fetchedTime < CACHE_DURATION_MS) {
        cachedConditions = {
          current_speed: Number(dbRow.current_speed) || 0.5,
          current_direction: Number(dbRow.current_direction) || 70.0,
          wave_height: Number(dbRow.wave_height) || 1.2,
          wave_direction: Number(dbRow.wave_direction) || 65.0,
          fetched_time: dbRow.fetched_time,
          source: dbRow.source
        };
        lastFetchTimestamp = fetchedTime;
        return cachedConditions;
      }
    }
  } catch (err) {
    console.error('Error checking DB for marine conditions:', err.message);
  }

  // Fetch from Open-Meteo Marine API
  // Lat 9.5, Lon 79.6
  // Host: marine-api.open-meteo.com, Path: /v1/marine
  try {
    const response = await axios.get('https://marine-api.open-meteo.com/v1/marine', {
      params: {
        latitude: 9.5,
        longitude: 79.6,
        current: 'ocean_current_velocity,ocean_current_direction,wave_height,wave_direction'
      },
      timeout: 5000
    });

    const data = response.data;
    const current = data.current || {};

    // ocean_current_velocity is in m/s or km/h; 1 m/s = ~1.94384 knots, or if km/h convert to knots
    // Open-Meteo returns m/s for ocean_current_velocity or km/h. Standard unit is m/s in current
    // Let's check unit:
    const velocityUnit = data.current_units?.ocean_current_velocity || 'm/s';
    let rawSpeed = current.ocean_current_velocity;
    let speedKnots = 0.5;
    if (typeof rawSpeed === 'number' && !isNaN(rawSpeed)) {
      if (velocityUnit === 'km/h') {
        speedKnots = rawSpeed * 0.539957;
      } else {
        // assume m/s
        speedKnots = rawSpeed * 1.94384;
      }
    }

    const current_speed = parseFloat((speedKnots || 0.5).toFixed(2));
    const current_direction = parseFloat((current.ocean_current_direction ?? 70.0).toFixed(1));
    const wave_height = parseFloat((current.wave_height ?? 1.2).toFixed(2));
    const wave_direction = parseFloat((current.wave_direction ?? 65.0).toFixed(1));
    const fetched_time = new Date().toISOString();
    const source = 'Live marine data';

    const conditions = {
      current_speed,
      current_direction,
      wave_height,
      wave_direction,
      fetched_time,
      source
    };

    // Save to DB
    db.prepare(`
      INSERT INTO marine_conditions (current_speed, current_direction, wave_height, wave_direction, fetched_time, source)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(current_speed, current_direction, wave_height, wave_direction, fetched_time, source);

    cachedConditions = conditions;
    lastFetchTimestamp = now;
    return conditions;
  } catch (error) {
    console.warn('Marine API request failed, falling back to cache or defaults:', error.message);

    // If API failed, try last cached in DB
    try {
      const dbRow = db.prepare(`SELECT * FROM marine_conditions ORDER BY id DESC LIMIT 1`).get();
      if (dbRow) {
        cachedConditions = {
          current_speed: Number(dbRow.current_speed) || 0.5,
          current_direction: Number(dbRow.current_direction) || 70.0,
          wave_height: Number(dbRow.wave_height) || 1.2,
          wave_direction: Number(dbRow.wave_direction) || 65.0,
          fetched_time: dbRow.fetched_time,
          source: 'Using cached data'
        };
        return cachedConditions;
      }
    } catch (e) {
      // fallback
    }

    // Otherwise default values
    cachedConditions = {
      ...DEFAULT_CONDITIONS,
      fetched_time: new Date().toISOString()
    };
    return cachedConditions;
  }
}

function getLatestConditions() {
  if (cachedConditions) return cachedConditions;
  return {
    ...DEFAULT_CONDITIONS,
    fetched_time: new Date().toISOString()
  };
}

module.exports = {
  fetchMarineConditions,
  getLatestConditions,
  DEFAULT_CONDITIONS
};
