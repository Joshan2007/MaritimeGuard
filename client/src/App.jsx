import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import InteractiveMap from './components/InteractiveMap';
import SeaConditionsCard from './components/SeaConditionsCard';
import BoatListPanel from './components/BoatListPanel';
import BoatDetailModal from './components/BoatDetailModal';
import SOSModal from './components/SOSModal';
import AdminDemoPanel from './components/AdminDemoPanel';
import LiveGpsFeed from './components/LiveGpsFeed';
import BoatsFleetPage from './components/BoatsFleetPage';
import AlertsHistoryPage from './components/AlertsHistoryPage';
import MessagesLogPage from './components/MessagesLogPage';
import FamilyView from './components/FamilyView';
import { soundManager } from './utils/soundManager';
import { HelpCircle, Info, Volume2, Shield } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';
const WS_BASE = 'ws://localhost:5000';

export default function App() {
  const [role, setRole] = useState('admin'); // 'admin', 'captain', 'family'
  const [activeTab, setActiveTab] = useState('map'); // 'map', 'boats', 'alerts', 'messages', 'about'

  // Application Data States
  const [boats, setBoats] = useState([]);
  const [conditions, setConditions] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [liveReadings, setLiveReadings] = useState([]);
  const [boatTrails, setBoatTrails] = useState({});
  const [selectedBoat, setSelectedBoat] = useState(null);

  // System & Demo States
  const [config, setConfig] = useState({ speedMultiplier: 1, isPaused: false, isStormMode: false });
  const [messagingStatus, setMessagingStatus] = useState(null);
  const [isSoundUnlocked, setIsSoundUnlocked] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [sosModalBoat, setSosModalBoat] = useState(null);

  // Audio & Alarm state
  const [isAlertBeeping, setIsAlertBeeping] = useState(false);
  const [isSosSirening, setIsSosSirening] = useState(false);
  const [isAlarmSilenced, setIsAlarmSilenced] = useState(false);
  const [dismissedSosBoatId, setDismissedSosBoatId] = useState(null);

  // Check if any boat is currently in Alert or SOS status
  const hasActiveAlert = boats.some(b => b.status === 'Alert');
  const hasActiveSOS = boats.some(b => b.status === 'SOS');

  // Trigger toast
  const showToast = (text) => {
    setToastMessage(text);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Sound Unlock Handler
  const handleUnlockSound = () => {
    soundManager.init();
    setIsSoundUnlocked(true);
    showToast('Web Audio API initialized! Emergency sirens ready.');
  };

  // Stop All Alarms & Dismiss SOS Modal
  const handleStopAlarm = () => {
    soundManager.stopAll();
    setIsAlertBeeping(false);
    setIsSosSirening(false);
    setIsAlarmSilenced(true);
    const activeSos = boats.find(b => b.status === 'SOS');
    if (activeSos) {
      setDismissedSosBoatId(activeSos.id);
    }
    setSosModalBoat(null);
    showToast('Alarm acknowledged and silenced.');
  };

  // Audio playback reaction to active states
  useEffect(() => {
    if (!isSoundUnlocked) return;

    if (hasActiveSOS) {
      if (!isSosSirening && !isAlarmSilenced) {
        soundManager.stopBeep();
        soundManager.startSiren();
        setIsSosSirening(true);
        setIsAlertBeeping(false);
      }
    } else if (hasActiveAlert) {
      if (!isAlertBeeping && !isAlarmSilenced) {
        soundManager.stopSiren();
        soundManager.startBeep();
        setIsAlertBeeping(true);
        setIsSosSirening(false);
      }
    } else {
      soundManager.stopAll();
      setIsAlertBeeping(false);
      setIsSosSirening(false);
      setIsAlarmSilenced(false);
      setDismissedSosBoatId(null);
    }
  }, [hasActiveSOS, hasActiveAlert, isSoundUnlocked, isAlarmSilenced, isSosSirening, isAlertBeeping]);

  // If a boat enters SOS, pop up SOS modal if not already dismissed
  useEffect(() => {
    const sosBoat = boats.find(b => b.status === 'SOS');
    if (sosBoat && sosBoat.id !== dismissedSosBoatId) {
      setSosModalBoat(sosBoat);
    } else if (!sosBoat) {
      setSosModalBoat(null);
      setDismissedSosBoatId(null);
    }
  }, [boats, dismissedSosBoatId]);

  // Initial Fetch & WebSocket setup
  useEffect(() => {
    // 1. Fetch initial boats
    fetch(`${API_BASE}/boats`)
      .then(r => r.json())
      .then(data => setBoats(data))
      .catch(e => console.warn('Fetch boats error:', e));

    // 2. Fetch initial alerts
    fetch(`${API_BASE}/alerts`)
      .then(r => r.json())
      .then(data => setAlerts(data))
      .catch(e => console.warn('Fetch alerts error:', e));

    // 3. Fetch initial messages
    fetch(`${API_BASE}/messages`)
      .then(r => r.json())
      .then(data => setMessages(data))
      .catch(e => console.warn('Fetch messages error:', e));

    // 4. Fetch initial marine & status
    fetch(`${API_BASE}/status`)
      .then(r => r.json())
      .then(data => {
        if (data.simulation) setConfig(data.simulation);
        if (data.messaging) setMessagingStatus(data.messaging);
        if (data.marine) setConditions(data.marine);
      })
      .catch(e => console.warn('Fetch status error:', e));

    // Setup WebSocket connection
    let ws;
    const connectWS = () => {
      ws = new WebSocket(WS_BASE);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'INIT_STATE') {
            if (payload.boats) setBoats(payload.boats);
            if (payload.conditions) setConditions(payload.conditions);
            if (payload.config) setConfig(payload.config);
            if (payload.messaging) setMessagingStatus(payload.messaging);
          } else if (payload.type === 'TICK_UPDATE') {
            if (payload.boats) {
              setBoats(payload.boats);
              // Update trails
              setBoatTrails(prevTrails => {
                const next = { ...prevTrails };
                for (const b of payload.boats) {
                  const trail = next[b.id] ? [...next[b.id]] : [];
                  trail.push({ lat: b.lat, lng: b.lng });
                  if (trail.length > 40) trail.shift();
                  next[b.id] = trail;
                }
                return next;
              });
            }
            if (payload.readings) {
              setLiveReadings(payload.readings);
            }
            if (payload.conditions) {
              setConditions(payload.conditions);
            }
            if (payload.events && payload.events.length > 0) {
              setAlerts(prev => [...payload.events, ...prev]);
              // Check if any event is SOS and trigger toast
              const sosEvt = payload.events.find(ev => ev.level === 'SOS');
              if (sosEvt) {
                showToast(`SOS Triggered for ${sosEvt.boatName}! SMS dispatched to family & union.`);
                // Refresh messages after send
                setTimeout(() => {
                  fetch(`${API_BASE}/messages`).then(r => r.json()).then(setMessages);
                }, 1000);
              }
            }
          }
        } catch (err) {
          console.warn('WS message parse error:', err);
        }
      };

      ws.onclose = () => {
        setTimeout(connectWS, 2000);
      };
    };

    connectWS();

    return () => {
      if (ws) ws.close();
    };
  }, []);

  // API Action Handlers
  const handleStartDemo = async () => {
    await fetch(`${API_BASE}/demo/start`, { method: 'POST' });
    showToast('Demo started: Vessels deployed in safe fishing zone.');
  };

  const handleResetDemo = async () => {
    handleStopAlarm();
    await fetch(`${API_BASE}/demo/reset`, { method: 'POST' });
    const bRes = await fetch(`${API_BASE}/boats`).then(r => r.json());
    setBoats(bRes);
    const mRes = await fetch(`${API_BASE}/messages`).then(r => r.json());
    setMessages(mRes);
    const aRes = await fetch(`${API_BASE}/alerts`).then(r => r.json());
    setAlerts(aRes);
    setConfig({ speedMultiplier: 1, isPaused: false, isStormMode: false });
    showToast('Demo reset to initial seed state.');
  };

  const handleTogglePause = async (paused) => {
    await fetch(`${API_BASE}/demo/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paused })
    });
    setConfig(c => ({ ...c, isPaused: paused }));
  };

  const handleSetSpeed = async (speed) => {
    await fetch(`${API_BASE}/demo/speed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speed })
    });
    setConfig(c => ({ ...c, speedMultiplier: speed }));
  };

  const handleToggleStorm = async (enabled) => {
    await fetch(`${API_BASE}/demo/storm-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    setConfig(c => ({ ...c, isStormMode: enabled }));
    showToast(enabled ? 'Storm Mode Activated (current x3, 3m waves)' : 'Storm Mode Deactivated');
  };

  const handleDriftBoat = async (boatId) => {
    setIsAlarmSilenced(false);
    setDismissedSosBoatId(null);
    await fetch(`${API_BASE}/demo/drift/${boatId}`, { method: 'POST' });
    showToast(`Drifting boat toward border. Simulation in progress.`);
  };

  const handleInstantSOS = async (boatId) => {
    setIsAlarmSilenced(false);
    setDismissedSosBoatId(null);
    await fetch(`${API_BASE}/demo/instant-sos/${boatId}`, { method: 'POST' });
    showToast(`Instant SOS executed. Vessel jumped to 0.9 NM from IMBL.`);
  };

  const handleReturnSafety = async (boatId) => {
    await fetch(`${API_BASE}/demo/return-safety/${boatId}`, { method: 'POST' });
    showToast(`Vessel steered back towards Indian waters.`);
  };

  const handleToggleRealSms = async (enabled) => {
    const res = await fetch(`${API_BASE}/admin/toggle-real-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    }).then(r => r.json());
    setMessagingStatus(m => ({ ...m, realSmsOn: res.realSmsEnabled }));
    showToast(res.realSmsEnabled ? 'Real SMS gateway turned ON.' : 'Real SMS gateway turned OFF (Mock Mode).');
  };

  const handleSendTestSms = async (phoneNumber) => {
    const res = await fetch(`${API_BASE}/admin/send-test-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Test SMS failed');
    fetch(`${API_BASE}/messages`).then(r => r.json()).then(setMessages);
    return data;
  };

  const handleUpdatePhone = async (boatId, contactData) => {
    const res = await fetch(`${API_BASE}/boats/${boatId}/contacts`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contactData)
    });
    const updated = await res.json();
    if (!res.ok) throw new Error(updated.error || 'Failed to update phone');
    setBoats(prev => prev.map(b => b.id === boatId ? updated : b));
    if (selectedBoat?.id === boatId) setSelectedBoat(updated);
    return updated;
  };

  const handleAddBoat = async (newBoatData) => {
    const res = await fetch(`${API_BASE}/boats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBoatData)
    });
    const created = await res.json();
    if (!res.ok) throw new Error(created.error || 'Failed to add vessel');
    setBoats(prev => [...prev, created]);
    showToast(`New vessel ${created.name} registered.`);
    return created;
  };

  const handleAcknowledgeAlert = async (alertId) => {
    await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, { method: 'POST' });
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: 1 } : a));
    handleStopAlarm();
  };

  // Screen flashing class on SOS or Alert
  let screenFlashClass = '';
  if (hasActiveSOS) {
    screenFlashClass = 'flash-sos-screen';
  } else if (hasActiveAlert) {
    screenFlashClass = 'flash-alert-screen';
  }

  return (
    <div className={`min-h-screen flex flex-col bg-navy-950 text-slate-100 transition-colors duration-500 ${screenFlashClass}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-[4000] bg-teal-500 text-navy-950 font-bold px-4 py-2.5 rounded-xl shadow-2xl border border-teal-300 text-xs sm:text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global Navbar */}
      <Navbar
        currentRole={role}
        onRoleChange={setRole}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isSoundUnlocked={isSoundUnlocked}
        onUnlockSound={handleUnlockSound}
        hasActiveAlert={hasActiveAlert}
        hasActiveSOS={hasActiveSOS}
        onStopAlarm={handleStopAlarm}
      />

      {/* Main Tab Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* TAB 1: LIVE MAP (MAIN PAGE) */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            {/* Page Header with Help Tooltip */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-navy-800 pb-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <Shield className="w-6 h-6 text-teal-400" />
                  Palk Strait Maritime Surveillance Map
                </h1>
                <p className="text-xs text-slate-400">
                  Real-time GPS tracking &amp; boundary defense between Tamil Nadu and Sri Lanka.
                </p>
              </div>

              {/* How it works info pill */}
              <div
                className="group relative cursor-pointer bg-navy-900 border border-navy-700 px-3 py-1 rounded-full text-xs text-slate-300 flex items-center gap-1.5 hover:border-teal-400"
                title="How it works"
              >
                <HelpCircle className="w-3.5 h-3.5 text-teal-400" />
                <span>How it works</span>
                {/* Tooltip Popup */}
                <div className="absolute right-0 top-8 z-50 hidden group-hover:block w-72 bg-navy-900 border border-teal-500/40 p-3 rounded-xl shadow-2xl text-[11px] text-slate-300 pointer-events-none">
                  <strong className="text-teal-400 block mb-1">Maritime Boundary Zones:</strong>
                  &bull; <span className="text-emerald-400">Safe Zone:</span> Legitimate Indian territorial waters.<br />
                  &bull; <span className="text-amber-400">Alert Buffer (5 NM):</span> Repeating beep &amp; steer-back warning.<br />
                  &bull; <span className="text-red-400">SOS Buffer (1 NM):</span> Continuous siren &amp; automatic SMS dispatch to families &amp; union.
                </div>
              </div>
            </div>

            {/* Map & Live Vessel Panel Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Interactive Map (2 cols on large screen) */}
              <div className="lg:col-span-2 space-y-4">
                <InteractiveMap
                  boats={boats}
                  selectedBoat={selectedBoat}
                  onSelectBoat={setSelectedBoat}
                  boatTrails={boatTrails}
                />

                {/* Map Legend */}
                <div className="bg-navy-900 border border-navy-800 rounded-xl p-3 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-1 bg-red-500 inline-block rounded" />
                    <span>IMBL Border (Zero Tolerance)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-1 border-t-2 border-dashed border-amber-500 inline-block" />
                    <span>Alert Buffer (5 NM)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-1 border-t-2 border-dashed border-red-500 inline-block" />
                    <span>SOS Buffer (1 NM)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-emerald-500/30 border border-emerald-500 rounded inline-block" />
                    <span>Safe Fishing Zone</span>
                  </div>
                </div>

                {/* Live GPS Feed Terminal */}
                <LiveGpsFeed readings={liveReadings} />
              </div>

              {/* Side Panels (1 col on large screen) */}
              <div className="space-y-6">
                {/* Sea Conditions Live Card */}
                <SeaConditionsCard
                  conditions={conditions}
                />

                {/* Live Vessels List */}
                <BoatListPanel
                  boats={boats}
                  selectedBoat={selectedBoat}
                  onSelectBoat={setSelectedBoat}
                  onDriftBoat={handleDriftBoat}
                  onInstantSOS={handleInstantSOS}
                  onReturnSafety={handleReturnSafety}
                  userRole={role}
                />
              </div>
            </div>

            {/* Admin Demo Control Center (if admin role) */}
            {role === 'admin' && (
              <AdminDemoPanel
                boats={boats}
                config={config}
                messagingStatus={messagingStatus}
                onStartDemo={handleStartDemo}
                onResetDemo={handleResetDemo}
                onTogglePause={handleTogglePause}
                onSetSpeed={handleSetSpeed}
                onToggleStorm={handleToggleStorm}
                onDriftBoat={handleDriftBoat}
                onInstantSOS={handleInstantSOS}
                onReturnSafety={handleReturnSafety}
                onToggleRealSms={handleToggleRealSms}
                onSendTestSms={handleSendTestSms}
              />
            )}
          </div>
        )}

        {/* TAB 2: BOATS FLEET */}
        {activeTab === 'boats' && (
          <BoatsFleetPage
            boats={boats}
            userRole={role}
            onAddBoat={handleAddBoat}
            onUpdatePhone={handleUpdatePhone}
          />
        )}

        {/* TAB 3: ALERTS HISTORY */}
        {activeTab === 'alerts' && (
          <AlertsHistoryPage
            alerts={alerts}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            userRole={role}
          />
        )}

        {/* TAB 4: MESSAGES LOG */}
        {activeTab === 'messages' && (
          <MessagesLogPage
            messages={messages}
            boats={boats}
            userRole={role}
          />
        )}

        {/* SPECIAL FAMILY VIEW IF FAMILY ROLE IS SELECTED */}
        {role === 'family' && activeTab === 'map' && (
          <div className="mt-8 pt-8 border-t border-navy-800">
            <FamilyView
              boats={boats}
              messages={messages}
              onSelectBoat={(b) => {
                setSelectedBoat(b);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}
      </main>

      {/* Boat Detail Modal */}
      {selectedBoat && (
        <BoatDetailModal
          boat={selectedBoat}
          onClose={() => setSelectedBoat(null)}
          onDrift={handleDriftBoat}
          onInstantSOS={handleInstantSOS}
          onReturnSafety={handleReturnSafety}
          userRole={role}
          onUpdatePhone={handleUpdatePhone}
        />
      )}

      {/* SOS Modal */}
      {sosModalBoat && (
        <SOSModal
          boat={sosModalBoat}
          onStopAlarm={handleStopAlarm}
          onClose={handleStopAlarm}
          onViewOnMap={(b) => {
            handleStopAlarm();
            setSelectedBoat(b);
            setActiveTab('map');
          }}
          messages={messages}
        />
      )}

      {/* Universal Prototype Footer */}
      <Footer />
    </div>
  );
}
