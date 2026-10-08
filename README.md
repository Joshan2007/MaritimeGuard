# MaritimeGuard (மாறிட்டிமாகார்ட்)
**Maritime Border Safety & Life-Saving Geo-Fence Platform for Tamil Nadu Fishermen**

> *Hackathon Prototype. Simulated GPS. Not for real navigation.*

---

## 🌊 Overview
MaritimeGuard protects Indian fishermen in the **Palk Strait & Gulf of Mannar** (Rameswaram, Pamban, Mandapam, Thangachimadam) against accidental drift across the **International Maritime Boundary Line (IMBL)** into Sri Lankan territorial waters.

### 🌟 Key Highlights
1. **Interactive Cartographic Map (Leaflet with Multi-Layer Tile Switcher)**:
   - **Layer Options**: OpenStreetMap Standard (Clear), Esri Satellite Ocean, and OpenTopoMap (Maritime Relief).
   - **IMBL Border Line**: Thick red line marking zero-tolerance international boundary.
   - **Alert Buffer Line**: 5 Nautical Miles (NM) orange dashed line.
   - **SOS Buffer Line**: 1 Nautical Mile (NM) red dashed line.
   - **Safe Fishing Zone**: Shaded green polygonal region within Indian waters.
   - **Vessels with Live Heading**: Rotated ship markers with color-coded status rings (Green Safe, Orange Alert, Pulsing Red SOS) and fading 40-reading GPS breadcrumb trails.
2. **Realistic 1 Hz GPS Simulator**:
   - Updates vessel positions every second with realistic marine speeds (3–7 kn), heading shifts, and 5–10 meter random GPS sensor jitter.
   - Shortest distance to IMBL calculated via the Haversine formula on equirectangular projection.
   - 1x, 5x, 10x speed multipliers, pause & resume, and live scrolling NMEA telemetry feed.
3. **Live Marine Data Integration (Open-Meteo Marine API)**:
   - Queries `marine-api.open-meteo.com/v1/marine` for current speed, current direction, wave height, and wave direction at 9.5°N, 79.6°E.
   - 30-minute caching in SQLite with automatic fallback to cache or defaults (`0.5 knots` toward border).
   - Drifts vessels based on the combined boat + sea current velocity vector.
4. **Predictive Boundary Warning**:
   - Calculates time to cross the 5 NM Alert Buffer: alerts `Predicted to cross alert line in X minutes` when under 45 minutes, or flags `Moving away from border`.
5. **Two-Level Alert & Siren Engine (Web Audio API)**:
   - **Level 1 (Alert @ 5 NM)**: Repeating 880 Hz beep every second + orange flashing dashboard + advise to steer back to safety.
   - **Level 2 (SOS @ 1 NM)**: Continuous 2-tone emergency siren + full red dashboard strobe + instant automated emergency SMS dispatch.
   - Single-click Web Audio permission button with `Test Beep` and `Test Siren` verification buttons.
6. **Emergency Messaging & Twilio Integration**:
   - Automatically saves all dispatches to `messages` table under 300 characters without emojis.
   - Supports **Real SMS** (via Twilio) and **Mock SMS** mode with clear status tags.
   - Rate limiting (max 1 SMS per recipient per boat per 2 minutes).
   - Fallback `Send SMS from my phone` (`sms:` protocol pre-filled links) and clipboard copy for family and union members.
7. **Role Switcher & Mobile-First UX**:
   - Quick role switch: **Admin (Union Officer)**, **Boat Captain**, **Family Member**.
   - Admin Demo Control Panel: *Start Demo*, *Drift Boat*, *Instant SOS*, *Return to Safety*, *Storm Mode*, *Reset Demo*.
   - Editable & validated international phone numbers (`+91...`).

---

## 🚀 Running the Platform

### Backend Server
```bash
# From workspace root
node server/index.js
# Runs Express + SQLite + WebSocket on port 5000
```

### Frontend Client
```bash
cd client
npm run dev
# Serves React app on http://localhost:5175 (or 5173/5174)
```

---

## 🔑 Twilio API Keys (Optional)
If you wish to test real SMS delivery to physical mobile phones:
Add your credentials to `.env` in the project root:
```env
PORT=5000
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM_NUMBER=+1234567890
```
Then navigate to the **Admin Demo Panel** and click **Turn Real SMS ON**. Without these keys, the application operates in **Mock SMS Mode** with full logging and phone fallback buttons.
