import React from 'react';
import { Anchor, AlertTriangle, ShieldCheck, ChevronRight, Navigation, Clock } from 'lucide-react';

export default function BoatListPanel({
  boats,
  selectedBoat,
  onSelectBoat,
  onDriftBoat,
  onInstantSOS,
  onReturnSafety,
  userRole
}) {
  return (
    <div className="bg-navy-900 border border-navy-700 rounded-xl p-4 shadow-xl flex flex-col lg:h-[636px] overflow-hidden text-slate-100">
      <div className="flex items-center justify-between border-b border-navy-800 pb-3 mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Anchor className="w-5 h-5 text-teal-400" />
          <h3 className="font-semibold text-base text-white">Vessels Active ({boats.length})</h3>
        </div>
        <span className="text-xs text-slate-400">Live Telemetry</span>
      </div>

      <div className="space-y-3 overflow-y-auto flex-1 pr-1">
        {boats.map((boat) => {
          const isSelected = selectedBoat?.id === boat.id;
          const dist = boat.distance_to_imbl ?? 10.0;
          const status = boat.status || 'Safe';
          const predictedMinutes = boat.predicted_cross_minutes;

          // Status colors
          let badgeBg = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
          let borderHighlight = 'border-navy-800';

          if (status === 'Alert') {
            badgeBg = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
            borderHighlight = 'border-amber-500/50 bg-amber-500/5';
          } else if (status === 'SOS') {
            badgeBg = 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse';
            borderHighlight = 'border-red-500 bg-red-500/10';
          }

          if (isSelected) {
            borderHighlight = 'border-teal-400 shadow-md ring-1 ring-teal-400/50';
          }

          return (
            <div
              key={boat.id}
              onClick={() => onSelectBoat(boat)}
              className={`p-3 rounded-lg border cursor-pointer transition ${borderHighlight} hover:bg-navy-800/80`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-white text-sm flex items-center gap-1.5">
                    <span>{boat.name}</span>
                    <span className="text-[11px] font-normal text-slate-400">({boat.base_port})</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Reg: {boat.reg_number} &bull; Capt: {boat.captain_name}
                  </div>
                </div>

                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${badgeBg}`}>
                  {status}
                </span>
              </div>

              {/* Coordinates and Speed Grid */}
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-navy-800/60 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px]">Position:</span>
                  <div className="font-mono text-slate-300 text-[11px]">
                    {Number(boat.lat).toFixed(4)}&deg;N, {Number(boat.lng).toFixed(4)}&deg;E
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px]">Speed / Heading:</span>
                  <div className="text-slate-300 text-[11px]">
                    {boat.speed} kn / {Math.round(boat.heading)}&deg;
                  </div>
                </div>
              </div>

              {/* Distance to IMBL & Prediction */}
              <div className="mt-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-[11px]">Border Dist:</span>
                  <span className={`font-bold ${
                    dist <= 1.0 ? 'text-red-400' : dist <= 5.0 ? 'text-amber-400' : 'text-teal-300'
                  }`}>
                    {dist} NM
                  </span>
                </div>

                {/* Prediction notice */}
                <div className="text-[10px] text-right">
                  {predictedMinutes !== undefined && predictedMinutes !== null && (
                    predictedMinutes === -1 ? (
                      <span className="text-emerald-400">Moving away from border</span>
                    ) : predictedMinutes <= 45 ? (
                      <span className="text-amber-300 font-semibold flex items-center gap-0.5">
                        <Clock className="w-3 h-3 inline" /> Cross &le; {predictedMinutes}m
                      </span>
                    ) : (
                      <span className="text-slate-400">Normal heading</span>
                    )
                  )}
                </div>
              </div>

              {/* Quick Actions (Admin or Captain) */}
              {(userRole === 'admin' || userRole === 'captain') && (
                <div className="mt-2 pt-2 border-t border-navy-800/80 flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onDriftBoat(boat.id)}
                    className="text-[10px] bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 px-2 py-0.5 rounded transition"
                    title="Simulate drift towards IMBL"
                  >
                    Drift
                  </button>
                  <button
                    onClick={() => onInstantSOS(boat.id)}
                    className="text-[10px] bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 px-2 py-0.5 rounded transition"
                    title="Jump to SOS border zone"
                  >
                    SOS
                  </button>
                  <button
                    onClick={() => onReturnSafety(boat.id)}
                    className="text-[10px] bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 px-2 py-0.5 rounded transition"
                    title="Steer boat back to safe zone"
                  >
                    Return Safe
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
