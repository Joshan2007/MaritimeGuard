import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Polygon, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Compass, Wind, AlertCircle } from 'lucide-react';

// IMBL Segment points in lat/lng:
// 10.08, 80.05 then 9.95, 79.58 then 9.67, 79.37 then 9.35, 79.53 then 9.22, 79.53
const IMBL_POINTS = [
  [10.08, 80.05],
  [9.95, 79.58],
  [9.67, 79.37],
  [9.35, 79.53],
  [9.22, 79.53]
];

// Helper to compute parallel offset line towards Indian (West) side
// We approximate offset by shifting coordinates West/North-West proportionally
// 1 NM is ~0.0166 degrees
function generateOffsetLine(points, offsetNM) {
  const degOffset = offsetNM * 0.0166;
  return points.map(([lat, lng], idx) => {
    // Shifting westwards (lng - offset) with slight normal adjustment
    let normalLat = 0;
    let normalLng = -degOffset;
    if (idx < points.length - 1) {
      const dLat = points[idx + 1][0] - lat;
      const dLng = points[idx + 1][1] - lng;
      // Normal vector pointing West/Inland
      const len = Math.hypot(dLat, dLng) || 1;
      normalLat = (dLng / len) * degOffset * 0.8;
      normalLng = (-dLat / len) * degOffset * 0.8;
      // ensure it shifts westwards into Indian waters
      if (normalLng > 0) normalLng = -normalLng;
    }
    return [lat + normalLat, lng + normalLng];
  });
}

const ALERT_BUFFER_POINTS = generateOffsetLine(IMBL_POINTS, 5.0);
const SOS_BUFFER_POINTS = generateOffsetLine(IMBL_POINTS, 1.0);

// Safe Fishing Zone polygon: Indian coast side bounded by Alert Buffer line
const SAFE_ZONE_POLYGON = [
  ...ALERT_BUFFER_POINTS,
  [9.15, 79.10], // Near Mandapam / Gulf of Mannar
  [9.28, 79.12], // Pamban
  [9.29, 79.31], // Rameswaram
  [9.80, 79.00], // Thondi / Coast
  [10.15, 79.20] // Point Calimere / Vedaranyam
];

// Custom boat marker SVG with rotation and status ring
function createBoatIcon(heading, status, boatName) {
  let ringColor = '#10b981'; // green Safe
  let pulsingClass = '';
  if (status === 'Alert') {
    ringColor = '#f59e0b'; // orange Alert
  } else if (status === 'SOS') {
    ringColor = '#ef4444'; // red SOS
    pulsingClass = 'pulsing-sos-ring';
  }

  const svgHtml = `
    <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
      <!-- Outer Status Ring -->
      <div class="${pulsingClass}" style="
        position: absolute;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        border: 3px solid ${ringColor};
        background: rgba(11, 25, 44, 0.75);
        box-shadow: 0 0 10px ${ringColor};
      "></div>

      <!-- Rotated Boat Icon -->
      <div style="
        transform: rotate(${heading || 0}deg);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2;
      ">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${ringColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 19 21 12 17 5 21 12 2" fill="${ringColor}" fill-opacity="0.4"/>
        </svg>
      </div>

      <!-- Label -->
      <div style="
        position: absolute;
        bottom: -18px;
        white-space: nowrap;
        background: rgba(6, 13, 23, 0.85);
        border: 1px solid ${ringColor};
        color: #f1f5f9;
        font-size: 10px;
        font-weight: 700;
        padding: 1px 4px;
        border-radius: 4px;
        pointer-events: none;
        z-index: 3;
      ">
        ${boatName}
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-boat-marker',
    html: svgHtml,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22]
  });
}

// Controller to smoothly pan to selected boat
function MapController({ selectedBoat }) {
  const map = useMap();
  const prevBoatId = useRef(null);

  useEffect(() => {
    if (selectedBoat && selectedBoat.id !== prevBoatId.current) {
      prevBoatId.current = selectedBoat.id;
      map.flyTo([selectedBoat.lat, selectedBoat.lng], 10, { duration: 1.2 });
    }
  }, [selectedBoat, map]);

  return null;
}

export default function InteractiveMap({
  boats,
  selectedBoat,
  onSelectBoat,
  boatTrails
}) {
  const center = [9.55, 79.50]; // Palk Strait center
  const [mapLayer, setMapLayer] = React.useState('osm'); // Default clear natural OpenStreetMap

  const tileLayers = {
    'osm': {
      name: 'OpenStreetMap Standard (Clear)',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors'
    },
    'satellite': {
      name: 'Esri Satellite Ocean',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri, Maxar, Earthstar Geographics'
    },
    'topographic': {
      name: 'OpenTopoMap (Maritime Relief)',
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenTopoMap &copy; OpenStreetMap'
    }
  };

  return (
    <div className="relative isolate z-10 w-full h-[540px] sm:h-[620px] rounded-xl overflow-hidden border border-navy-700 shadow-2xl">
      <MapContainer
        center={center}
        zoom={9}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <MapController selectedBoat={selectedBoat} />

        {/* Free Map Tile Layer Service */}
        <TileLayer
          key={mapLayer}
          attribution={tileLayers[mapLayer].attribution}
          url={tileLayers[mapLayer].url}
          maxZoom={18}
        />

        {/* 4. Safe fishing zone shaded green */}
        <Polygon
          positions={SAFE_ZONE_POLYGON}
          pathOptions={{
            color: '#10b981',
            fillColor: '#10b981',
            fillOpacity: 0.12,
            weight: 1.5,
            dashArray: '4, 4'
          }}
        />

        {/* 1. IMBL thick red line */}
        <Polyline
          positions={IMBL_POINTS}
          pathOptions={{
            color: '#ef4444',
            weight: 4.5,
            opacity: 0.95
          }}
        >
          <Popup>
            <div className="text-slate-900 text-xs font-semibold">
              <strong className="text-red-600 block">IMBL (Border Line)</strong>
              Approximate, demo only.<br />
              Zero tolerance international boundary.
            </div>
          </Popup>
        </Polyline>

        {/* 2. Alert Buffer line (5 NM, orange dashed) */}
        <Polyline
          positions={ALERT_BUFFER_POINTS}
          pathOptions={{
            color: '#f59e0b',
            weight: 2.5,
            dashArray: '8, 8',
            opacity: 0.9
          }}
        >
          <Popup>
            <div className="text-slate-900 text-xs">
              <strong className="text-amber-600 block">Alert Buffer (5 NM)</strong>
              Crossings trigger Level 1 Alert beep and dashboard warning.
            </div>
          </Popup>
        </Polyline>

        {/* 3. SOS Buffer line (1 NM, red dashed) */}
        <Polyline
          positions={SOS_BUFFER_POINTS}
          pathOptions={{
            color: '#dc2626',
            weight: 3,
            dashArray: '5, 5',
            opacity: 0.95
          }}
        >
          <Popup>
            <div className="text-slate-900 text-xs">
              <strong className="text-red-700 block">SOS Buffer (1 NM)</strong>
              Crossings trigger two-tone Siren and automated emergency SMS!
            </div>
          </Popup>
        </Polyline>

        {/* Fading trail of last 40 positions for selected or all boats */}
        {Object.entries(boatTrails || {}).map(([boatId, trail]) => {
          if (!trail || trail.length < 2) return null;
          const coords = trail.map(pt => [pt.lat, pt.lng]);
          const isSelected = selectedBoat && selectedBoat.id === boatId;
          return (
            <Polyline
              key={`trail-${boatId}`}
              positions={coords}
              pathOptions={{
                color: isSelected ? '#2dd4bf' : '#64748b',
                weight: isSelected ? 3 : 1.5,
                opacity: isSelected ? 0.75 : 0.35,
                dashArray: isSelected ? '2, 4' : undefined
              }}
            />
          );
        })}

        {/* Boat Markers */}
        {boats.map((boat) => {
          const icon = createBoatIcon(boat.heading, boat.status, boat.name);
          return (
            <Marker
              key={boat.id}
              position={[boat.lat, boat.lng]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectBoat(boat)
              }}
            >
              <Popup>
                <div className="text-slate-900 p-1 min-w-[180px]">
                  <div className="font-bold text-sm text-navy-900 flex items-center justify-between">
                    <span>{boat.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      boat.status === 'Safe' ? 'bg-emerald-100 text-emerald-800' :
                      boat.status === 'Alert' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {boat.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                    <p>Reg: {boat.reg_number}</p>
                    <p>Captain: {boat.captain_name}</p>
                    <p>Distance to IMBL: <strong>{boat.distance_to_imbl} NM</strong></p>
                    <p>Speed: {boat.speed} kn | Heading: {Math.round(boat.heading)}&deg;</p>
                  </div>
                  <button
                    onClick={() => onSelectBoat(boat)}
                    className="mt-2 w-full bg-navy-900 hover:bg-navy-800 text-white text-[11px] py-1 rounded font-medium"
                  >
                    View Details &amp; Actions
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Overlay Badge & Layer Switcher */}
      <div className="absolute top-3 left-3 z-30 bg-navy-950/90 backdrop-blur border border-navy-700/80 rounded-lg p-2.5 text-xs text-slate-200 shadow-lg pointer-events-none">
        <div className="font-bold text-teal-400 flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-teal-400" />
          <span>Palk Strait Marine Zone</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          Rameswaram (IN) &harr; Jaffna / Mannar (LK)
        </div>
      </div>

      {/* Free Map Tile Selector (OpenStreetMap / Satellite / Topo) */}
      <div className="absolute top-3 right-3 z-30 bg-white/90 backdrop-blur border border-slate-300 rounded-lg p-1 text-xs shadow-lg flex items-center gap-1 text-slate-800">
        <button
          onClick={() => setMapLayer('osm')}
          className={`px-2.5 py-1 rounded font-bold text-[11px] transition ${
            mapLayer === 'osm' ? 'bg-navy-900 text-teal-400' : 'text-slate-700 hover:text-black'
          }`}
        >
          Street Map (OSM)
        </button>
        <button
          onClick={() => setMapLayer('satellite')}
          className={`px-2.5 py-1 rounded font-bold text-[11px] transition ${
            mapLayer === 'satellite' ? 'bg-navy-900 text-teal-400' : 'text-slate-700 hover:text-black'
          }`}
        >
          Satellite
        </button>
        <button
          onClick={() => setMapLayer('topographic')}
          className={`px-2.5 py-1 rounded font-bold text-[11px] transition ${
            mapLayer === 'topographic' ? 'bg-navy-900 text-teal-400' : 'text-slate-700 hover:text-black'
          }`}
        >
          Relief / Topo
        </button>
      </div>
    </div>
  );
}
