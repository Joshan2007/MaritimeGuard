import React, { useRef, useEffect } from 'react';
import { Radio, Terminal, Circle } from 'lucide-react';

export default function LiveGpsFeed({ readings }) {
  const feedRef = useRef(null);

  return (
    <div className="bg-navy-950 border border-navy-800 rounded-xl p-3 shadow-lg font-mono text-xs flex flex-col h-44">
      <div className="flex items-center justify-between border-b border-navy-800/80 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
          <span className="font-bold text-teal-400 text-[11px] tracking-wider uppercase">
            Simulated GPS feed
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400" />
          <span>1 Hz NMEA-0183 Telemetry</span>
        </div>
      </div>

      <div
        ref={feedRef}
        className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-[11px] leading-relaxed scrollbar-thin"
      >
        {(!readings || readings.length === 0) ? (
          <div className="text-slate-400 text-center py-6">Connecting to telemetry satellite stream...</div>
        ) : (
          readings.map((r, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between hover:bg-navy-900/60 p-1 rounded transition text-slate-300"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-slate-400 text-[10px]">{r.timestamp}</span>
                <span className="text-teal-300 font-semibold">{r.boatName}</span>
                <span className="text-slate-400 text-[10px]">
                  [{Number(r.lat).toFixed(4)}&deg;N, {Number(r.lng).toFixed(4)}&deg;E]
                </span>
              </div>
              <div className="flex items-center gap-2 text-right">
                <span className="text-slate-300">{r.speed} kn / {Math.round(r.heading)}&deg;</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  r.status === 'Safe' ? 'bg-emerald-950 text-emerald-400' :
                  r.status === 'Alert' ? 'bg-amber-950 text-amber-300' : 'bg-red-950 text-red-400'
                }`}>
                  {r.distance_to_imbl} NM
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
