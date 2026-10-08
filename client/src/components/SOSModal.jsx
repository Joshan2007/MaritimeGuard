import React, { useState } from 'react';
import { AlertTriangle, VolumeX, MapPin, Send, Copy, Check, MessageSquare, PhoneCall } from 'lucide-react';

export default function SOSModal({
  boat,
  onStopAlarm,
  onViewOnMap,
  messages
}) {
  if (!boat) return null;

  const [copiedFamily, setCopiedFamily] = useState(false);
  const [copiedUnion, setCopiedUnion] = useState(false);

  const timeStr = new Date().toLocaleTimeString('en-IN', { hour12: false });
  const mapLink = `https://maps.google.com/?q=${boat.lat},${boat.lng}`;
  const rawMessageText = `EMERGENCY SOS. Boat ${boat.name} (${boat.reg_number}) is ${boat.distance_to_imbl} nautical mile from the maritime border. Position ${boat.lat}, ${boat.lng}. Speed ${boat.speed} kn, heading ${Math.round(boat.heading)} deg. Time ${timeStr}. Map: ${mapLink} Contact captain and union immediately.`;

  // Encode for sms: link
  const familySmsHref = `sms:${boat.family_contact_phone}?body=${encodeURIComponent(rawMessageText)}`;
  const unionSmsHref = `sms:${boat.union_contact_phone}?body=${encodeURIComponent(rawMessageText)}`;

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'family') {
      setCopiedFamily(true);
      setTimeout(() => setCopiedFamily(false), 2000);
    } else {
      setCopiedUnion(true);
      setTimeout(() => setCopiedUnion(false), 2000);
    }
  };

  // Find recent messages for this boat
  const boatMessages = (messages || []).filter(m => m.boat_id === boat.id).slice(0, 4);

  return (
    <div className="fixed inset-0 z-[3500] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-navy-950 border-2 border-red-500 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-white animate-in zoom-in-95 duration-200">
        {/* Urgent Header */}
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-white animate-bounce" />
            <div>
              <h2 className="text-xl font-black uppercase tracking-wider">LEVEL 2 CRITICAL SOS ACTIVATED</h2>
              <p className="text-xs text-red-100">Distance to IMBL: {boat.distance_to_imbl} NM (Within 1.0 NM Boundary Line)</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Main Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onStopAlarm}
              className="flex-1 bg-red-600 hover:bg-red-700 active:scale-98 text-white font-black py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg text-base tracking-wide transition border border-red-400"
            >
              <VolumeX className="w-5 h-5" />
              STOP ALARM / SIREN
            </button>

            <button
              onClick={() => onViewOnMap(boat)}
              className="flex-1 bg-navy-800 hover:bg-navy-700 text-teal-300 border border-teal-500/40 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition text-sm"
            >
              <MapPin className="w-4 h-4 text-teal-400" />
              View on Map
            </button>
          </div>

          {/* Boat Telemetry Snapshot */}
          <div className="bg-navy-900 border border-red-500/40 rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-2">Vessel Under Emergency</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-slate-400">Boat Name:</span> <strong className="text-white">{boat.name}</strong></div>
              <div><span className="text-slate-400">Registration:</span> <strong className="text-white">{boat.reg_number}</strong></div>
              <div><span className="text-slate-400">Captain:</span> <strong className="text-white">{boat.captain_name}</strong></div>
              <div><span className="text-slate-400">Coordinates:</span> <span className="font-mono text-teal-300">{Number(boat.lat).toFixed(4)}&deg;N, {Number(boat.lng).toFixed(4)}&deg;E</span></div>
            </div>
          </div>

          {/* Delivery status of automated SMS */}
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-2.5 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Emergency SMS Delivery Status
            </h4>

            {boatMessages.length === 0 ? (
              <div className="text-xs text-slate-400 py-2">
                Automated dispatch queued to Family ({boat.family_contact_phone}) and Union ({boat.union_contact_phone})...
              </div>
            ) : (
              <div className="space-y-2">
                {boatMessages.map((msg, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-navy-950 p-2 rounded border border-navy-800">
                    <div>
                      <span className="text-slate-300 font-semibold">{msg.recipient_name} ({msg.recipient_type})</span>
                      <span className="text-[11px] text-slate-400 block">{msg.phone}</span>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                      msg.status.includes('real') || msg.status === 'Delivered'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : msg.status.includes('mock')
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {msg.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fallback Buttons: Send SMS from my phone */}
          <div className="bg-navy-900/90 border border-teal-500/30 rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300 mb-1 flex items-center gap-1.5">
              <PhoneCall className="w-4 h-4" />
              Phone Fallback (Send directly from your device)
            </h4>
            <p className="text-[11px] text-slate-400 mb-3">
              If cellular gateway is delayed, open pre-filled SMS on your phone or copy the broadcast text:
            </p>

            <div className="space-y-3">
              {/* Family Fallback */}
              <div className="bg-navy-950 p-3 rounded-lg border border-navy-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="text-xs">
                  <span className="font-semibold text-slate-200">Family: {boat.family_contact_name}</span>
                  <span className="text-[11px] text-teal-400 block font-mono">{boat.family_contact_phone}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <a
                    href={familySmsHref}
                    className="flex-1 sm:flex-initial text-center bg-teal-500 hover:bg-teal-600 text-navy-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 shadow"
                  >
                    <Send className="w-3.5 h-3.5" /> Send SMS Now
                  </a>
                  <a
                    href={`https://wa.me/${boat.family_contact_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(rawMessageText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-initial text-center bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1"
                  >
                    WhatsApp
                  </a>
                  <button
                    onClick={() => copyToClipboard(rawMessageText, 'family')}
                    className="bg-navy-800 hover:bg-navy-700 text-slate-300 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1"
                    title="Copy SMS text"
                  >
                    {copiedFamily ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy
                  </button>
                </div>
              </div>

              {/* Union Fallback */}
              <div className="bg-navy-950 p-3 rounded-lg border border-navy-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="text-xs">
                  <span className="font-semibold text-slate-200">Union: {boat.union_contact_name}</span>
                  <span className="text-[11px] text-teal-400 block font-mono">{boat.union_contact_phone}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <a
                    href={unionSmsHref}
                    className="flex-1 sm:flex-initial text-center bg-teal-500 hover:bg-teal-600 text-navy-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 shadow"
                  >
                    <Send className="w-3.5 h-3.5" /> Send SMS Now
                  </a>
                  <a
                    href={`https://wa.me/${boat.union_contact_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(rawMessageText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-initial text-center bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1"
                  >
                    WhatsApp
                  </a>
                  <button
                    onClick={() => copyToClipboard(rawMessageText, 'union')}
                    className="bg-navy-800 hover:bg-navy-700 text-slate-300 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1"
                    title="Copy SMS text"
                  >
                    {copiedUnion ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
