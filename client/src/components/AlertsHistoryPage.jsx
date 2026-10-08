import React from 'react';
import { AlertTriangle, Radio, CheckCircle, Clock, MapPin, ShieldAlert } from 'lucide-react';

export default function AlertsHistoryPage({ alerts, onAcknowledgeAlert, userRole }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            Alerts &amp; SOS Incident History
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time audit log of buffer crossings, Level 1 Alerts (&le; 5 NM) and Level 2 Critical SOS (&le; 1 NM).
          </p>
        </div>

        <div className="text-xs bg-navy-900 border border-navy-700 px-3 py-1.5 rounded-lg text-slate-300">
          Total Incidents Logged: <strong className="text-teal-400">{alerts.length}</strong>
        </div>
      </div>

      <div className="bg-navy-900 border border-navy-700 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300">
            <thead className="bg-navy-950 text-slate-400 uppercase text-[11px] tracking-wider border-b border-navy-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Vessel</th>
                <th className="py-3 px-4">Alert Level</th>
                <th className="py-3 px-4">Distance to IMBL</th>
                <th className="py-3 px-4">Coordinates</th>
                <th className="py-3 px-4">Status / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    No boundary crossing alerts logged yet. Vessels currently in safe fishing zones.
                  </td>
                </tr>
              ) : (
                alerts.map((evt) => {
                  const isSOS = evt.level === 'SOS';
                  return (
                    <tr key={evt.id} className="hover:bg-navy-800/40 transition">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-400 text-xs">
                        {new Date(evt.created_at).toLocaleString()}
                      </td>

                      <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                        {evt.boat_name}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold inline-flex items-center gap-1 ${
                          isSOS
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {isSOS ? <ShieldAlert className="w-3 h-3" /> : <Radio className="w-3 h-3" />}
                          {evt.level}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap font-semibold">
                        <span className={isSOS ? 'text-red-400' : 'text-amber-400'}>
                          {evt.distance} NM
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-400 text-xs">
                        {Number(evt.lat).toFixed(4)}&deg;N, {Number(evt.lng).toFixed(4)}&deg;E
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {evt.acknowledged ? (
                          <span className="text-emerald-400 flex items-center gap-1 text-xs font-medium">
                            <CheckCircle className="w-3.5 h-3.5" /> Acknowledged
                          </span>
                        ) : (
                          <button
                            onClick={() => onAcknowledgeAlert(evt.id)}
                            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded text-xs font-bold transition"
                          >
                            Acknowledge
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
