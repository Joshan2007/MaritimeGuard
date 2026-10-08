import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  CloudLightning,
  FastForward,
  Pause,
  MessageSquare,
  Send,
  Shield,
  Volume2,
  Bell,
  Settings,
  CheckCircle,
  XCircle,
  Radio
} from 'lucide-react';
import { soundManager } from '../utils/soundManager';

export default function AdminDemoPanel({
  boats,
  config,
  messagingStatus,
  onStartDemo,
  onResetDemo,
  onTogglePause,
  onSetSpeed,
  onToggleStorm,
  onDriftBoat,
  onInstantSOS,
  onReturnSafety,
  onToggleRealSms,
  onSendTestSms
}) {
  const [selectedBoatId, setSelectedBoatId] = useState(boats[0]?.id || 'boat-1');
  const [testPhoneNumber, setTestPhoneNumber] = useState('+919842100001');
  const [testSmsStatus, setTestSmsStatus] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const speedMultiplier = config?.speedMultiplier ?? 1;
  const isPaused = config?.isPaused ?? false;
  const isStormMode = config?.isStormMode ?? false;

  const handleSendTest = async (e) => {
    e.preventDefault();
    setIsSendingTest(true);
    setTestSmsStatus('Sending test message...');
    try {
      const res = await onSendTestSms(testPhoneNumber);
      setTestSmsStatus(`Success: ${res?.message?.status || 'Sent'}`);
    } catch (err) {
      setTestSmsStatus(`Error: ${err.message || 'Send failed'}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="bg-navy-900 border border-navy-700 rounded-xl p-5 shadow-2xl text-slate-100 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-navy-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-bold text-white">Demo Control Center (Admin Only)</h2>
          </div>
          <p className="text-xs text-slate-400">
            Interactive orchestrator for live jury presentations with simulated GPS feeds.
          </p>
        </div>

        <div className="text-xs bg-teal-500/10 text-teal-300 border border-teal-500/30 px-3 py-1 rounded-full font-mono">
          Speed: {speedMultiplier}x {isPaused ? '(PAUSED)' : '(ACTIVE)'}
        </div>
      </div>

      {/* Main Demo Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={onStartDemo}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 text-xs transition shadow"
        >
          <Play className="w-4 h-4" /> Start Demo
        </button>

        <button
          onClick={onResetDemo}
          className="bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-600 font-bold py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 text-xs transition"
        >
          <RotateCcw className="w-4 h-4 text-amber-400" /> Reset Demo
        </button>

        <button
          onClick={() => onTogglePause(!isPaused)}
          className={`py-2.5 px-3 rounded-lg font-bold flex items-center justify-center gap-2 text-xs transition border ${
            isPaused
              ? 'bg-amber-600 text-white border-amber-400'
              : 'bg-navy-800 text-slate-200 border-navy-600 hover:bg-navy-700'
          }`}
        >
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          {isPaused ? 'Resume GPS' : 'Pause GPS'}
        </button>
      </div>

      {/* Speed Controls & Audio Testing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-navy-950 p-4 rounded-xl border border-navy-800 text-xs">
        {/* Speed multipliers */}
        <div>
          <span className="text-slate-400 block mb-2 font-semibold">Simulation Speed Multiplier:</span>
          <div className="flex items-center gap-2">
            {[1, 5, 10].map((s) => (
              <button
                key={s}
                onClick={() => onSetSpeed(s)}
                className={`flex-1 py-1.5 rounded-lg font-bold border transition ${
                  speedMultiplier === s
                    ? 'bg-teal-500 text-navy-950 border-teal-400 shadow'
                    : 'bg-navy-900 text-slate-300 border-navy-700 hover:bg-navy-800'
                }`}
              >
                {s}x Speed
              </button>
            ))}
          </div>
        </div>

        {/* Audio Test triggers */}
        <div>
          <span className="text-slate-400 block mb-2 font-semibold">Web Audio Engine Check:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => soundManager.testBeep()}
              className="flex-1 bg-navy-900 hover:bg-navy-800 text-amber-300 border border-amber-500/40 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" /> Test Beep (Level 1)
            </button>
            <button
              onClick={() => soundManager.testSiren()}
              className="flex-1 bg-navy-900 hover:bg-navy-800 text-red-300 border border-red-500/40 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5"
            >
              <Volume2 className="w-3.5 h-3.5 text-red-400" /> Test Siren (Level 2)
            </button>
          </div>
        </div>
      </div>

      {/* Vessel Targeted Sequence Scenarios */}
      <div className="bg-navy-950 p-4 rounded-xl border border-navy-800">
        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
          <FastForward className="w-4 h-4 text-teal-400" /> Vessel Incident Scenarios
        </h3>
        <p className="text-xs text-slate-400 mb-3">
          Select a boat to simulate drift across the 5 NM Alert line and 1 NM SOS boundary line:
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            value={selectedBoatId}
            onChange={(e) => setSelectedBoatId(e.target.value)}
            className="bg-navy-900 border border-navy-700 text-white text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-teal-400 font-medium"
          >
            {boats.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.base_port} - {b.status})
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={() => onDriftBoat(selectedBoatId)}
              className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs py-2 px-3 rounded-lg font-bold transition"
            >
              Drift Boat (Full Seq)
            </button>
            <button
              onClick={() => onInstantSOS(selectedBoatId)}
              className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs py-2 px-3 rounded-lg font-bold transition"
            >
              Instant SOS
            </button>
            <button
              onClick={() => onReturnSafety(selectedBoatId)}
              className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs py-2 px-3 rounded-lg font-bold transition"
            >
              Return To Safety
            </button>
          </div>
        </div>
      </div>

      {/* Messaging Setup Status & Real SMS Gateway */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Card */}
        <div className="bg-navy-950 p-4 rounded-xl border border-navy-800 text-xs space-y-2.5">
          <h4 className="font-bold text-teal-400 text-sm flex items-center gap-1.5">
            <Shield className="w-4 h-4" /> Messaging Setup Status
          </h4>
          
          <div className="flex items-center justify-between py-1 border-b border-navy-900">
            <span className="text-slate-400">Keys configured:</span>
            <span className="font-semibold flex items-center gap-1">
              {messagingStatus?.keysConfigured ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">YES (Twilio Active)</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-400">NO (Using Safe Mock SMS)</span>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-navy-900">
            <span className="text-slate-400">Real SMS Dispatch:</span>
            <span className={`font-bold px-2 py-0.5 rounded ${
              messagingStatus?.realSmsOn ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
            }`}>
              {messagingStatus?.realSmsOn ? 'Real SMS ON' : 'Real SMS OFF'}
            </span>
          </div>

          <div className="py-1">
            <span className="text-slate-400 block mb-0.5">Last Send Result:</span>
            <div className="bg-navy-900 p-2.5 rounded-lg border border-navy-800 font-mono text-[11px] text-teal-300 break-words leading-relaxed">
              {messagingStatus?.lastResult || 'No message dispatched yet.'}
            </div>
            {messagingStatus?.lastResult?.includes('Trial') && (
              <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-[11px] text-amber-200">
                <strong>Why this happened:</strong> Your Twilio account is in <em>Free Trial Mode</em>. Twilio trial accounts strictly prohibit custom message text to Indian numbers unless upgraded. Use the <strong>"Send SMS from my phone"</strong> fallback button in the SOS modal or Messages Log to deliver the real SMS directly.
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-slate-400">Toggle Real SMS:</span>
            <button
              onClick={() => onToggleRealSms(!messagingStatus?.realSmsOn)}
              className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition ${
                messagingStatus?.realSmsOn
                  ? 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
            >
              {messagingStatus?.realSmsOn ? 'Turn Real SMS OFF' : 'Turn Real SMS ON'}
            </button>
          </div>
        </div>

        {/* Send Test SMS Box */}
        <div className="bg-navy-950 p-4 rounded-xl border border-navy-800 text-xs space-y-3">
          <h4 className="font-bold text-teal-400 text-sm flex items-center gap-1.5">
            <Send className="w-4 h-4" /> Send Test SMS Verification
          </h4>
          <p className="text-slate-400 text-[11px]">
            Verify Twilio gateway or mock pipeline prior to demonstration:
          </p>

          <form onSubmit={handleSendTest} className="space-y-2">
            <div>
              <label className="text-slate-400 block mb-1">Target Phone (+91...):</label>
              <input
                type="text"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
                placeholder="+919842100001"
                className="w-full bg-navy-900 border border-navy-700 text-white font-mono rounded px-3 py-1.5 focus:border-teal-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSendingTest}
              className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-navy-950 font-bold py-2 rounded-lg transition text-xs flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {isSendingTest ? 'Sending...' : 'Send Test SMS'}
            </button>

            {testSmsStatus && (
              <div className="text-[11px] font-mono text-teal-300 bg-navy-900 p-2 rounded border border-navy-800 mt-1">
                {testSmsStatus}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
