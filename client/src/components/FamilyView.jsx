import React, { useState } from 'react';
import { Users, Anchor, MessageSquare, MapPin, Phone, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function FamilyView({ boats, messages, onSelectBoat }) {
  // Family selects which boat they belong to (default Annai Mary)
  const [myBoatId, setMyBoatId] = useState(boats[0]?.id || 'boat-1');

  const myBoat = boats.find(b => b.id === myBoatId) || boats[0];
  const myMessages = (messages || []).filter(m => m.boat_id === myBoatId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-400" />
            Family Member Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Dedicated view for fishermen families to monitor vessel safe zones and receive instant SMS alerts.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-navy-900 border border-navy-700 p-2 rounded-xl">
          <span className="text-slate-400">Select My Vessel:</span>
          <select
            value={myBoatId}
            onChange={(e) => setMyBoatId(e.target.value)}
            className="bg-navy-950 text-teal-300 font-bold border border-navy-800 rounded px-2.5 py-1 focus:outline-none"
          >
            {boats.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} (Capt. {b.captain_name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {myBoat && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Boat Status Card */}
          <div className="bg-navy-900 border border-navy-700 rounded-xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-slate-400">Vessel Status</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  myBoat.status === 'Safe' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                  myBoat.status === 'Alert' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                  'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                }`}>
                  {myBoat.status === 'Safe' ? 'SAFE IN ZONE' : myBoat.status === 'Alert' ? 'NEAR BUFFER (ALERT)' : 'CRITICAL SOS'}
                </span>
              </div>

              <h2 className="text-2xl font-bold text-white">{myBoat.name}</h2>
              <p className="text-xs text-slate-400">Reg: {myBoat.reg_number} &bull; Homeport: {myBoat.base_port}</p>

              <div className="mt-4 space-y-2.5 text-xs bg-navy-950 p-3 rounded-xl border border-navy-800">
                <div className="flex justify-between">
                  <span className="text-slate-400">Skipper / Captain:</span>
                  <span className="text-white font-semibold">{myBoat.captain_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Crew on Board:</span>
                  <span className="text-white font-semibold">{myBoat.crew_count} persons</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Distance to Border:</span>
                  <span className={`font-bold ${myBoat.distance_to_imbl <= 1.0 ? 'text-red-400' : 'text-teal-300'}`}>
                    {myBoat.distance_to_imbl} Nautical Miles
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last GPS Fix:</span>
                  <span className="font-mono text-slate-300">
                    {Number(myBoat.lat).toFixed(4)}&deg;N, {Number(myBoat.lng).toFixed(4)}&deg;E
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-navy-800">
              <button
                onClick={() => onSelectBoat(myBoat)}
                className="w-full bg-teal-500 hover:bg-teal-600 text-navy-950 font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
              >
                <MapPin className="w-4 h-4" /> View Live on Satellite Map
              </button>
            </div>
          </div>

          {/* Chat Inbox / Messages Feed */}
          <div className="lg:col-span-2 bg-navy-900 border border-navy-700 rounded-xl p-5 shadow-xl flex flex-col h-[480px]">
            <div className="flex items-center justify-between border-b border-navy-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-white text-base">Vessel Alerts &amp; Messages Inbox</h3>
              </div>
              <span className="text-xs text-slate-400">
                Registered Contact: <strong className="text-teal-300">{myBoat.family_contact_phone}</strong>
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {myMessages.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-sm">
                  <ShieldCheck className="w-12 h-12 text-teal-500/40 mx-auto mb-2" />
                  <p>No emergency warnings received for {myBoat.name}.</p>
                  <p className="text-xs text-slate-400 mt-1">Your vessel is safely within legal Tamil Nadu waters.</p>
                </div>
              ) : (
                myMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="bg-navy-950 border border-navy-800 rounded-xl p-3.5 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-400 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Emergency SOS Broadcast
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    <p className="text-slate-200 leading-relaxed font-sans bg-navy-900/80 p-2.5 rounded-lg border border-navy-800">
                      {msg.message_text}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Status: <strong className="text-teal-400">{msg.status}</strong></span>
                      <span>To: {msg.recipient_name} ({msg.phone})</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
