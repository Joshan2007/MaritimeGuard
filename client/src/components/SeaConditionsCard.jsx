import React from 'react';
import { Waves, Wind, Compass, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SeaConditionsCard({ conditions }) {
  const currentSpeed = conditions?.current_speed ?? 0.5;
  const currentDir = conditions?.current_direction ?? 70.0;
  const waveHeight = conditions?.wave_height ?? 1.2;
  const waveDir = conditions?.wave_direction ?? 65.0;
  const source = conditions?.source ?? 'Default values';
  const fetchedTime = conditions?.fetched_time ? new Date(conditions.fetched_time).toLocaleTimeString() : 'Just now';

  // Badge styling according to source
  let badgeStyle = 'bg-teal-500/10 text-teal-300 border-teal-500/30';
  let badgeText = 'Live marine data';
  if (source.includes('cached')) {
    badgeStyle = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    badgeText = 'Using cached data';
  } else if (source.includes('Default')) {
    badgeStyle = 'bg-slate-500/10 text-slate-300 border-slate-500/30';
    badgeText = 'Default values';
  }

  return (
    <div className="bg-navy-900 border border-navy-700 rounded-xl p-4 shadow-lg text-slate-100">
      <div className="flex items-center justify-between border-b border-navy-800 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Waves className="w-5 h-5 text-teal-400" />
          <h3 className="font-semibold text-sm sm:text-base text-white">Sea Conditions</h3>
        </div>
        <div>
          <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${badgeStyle}`}>
            {badgeText}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
        {/* Ocean Current Speed */}
        <div className="bg-navy-950/70 p-2.5 rounded-lg border border-navy-800">
          <div className="text-slate-400 text-[11px] flex items-center gap-1">
            <Wind className="w-3.5 h-3.5 text-teal-400" />
            <span>Current Speed</span>
          </div>
          <div className="text-lg font-bold text-teal-300 mt-1">
            {currentSpeed} <span className="text-xs font-normal text-slate-400">knots</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Pushing &rarr; Border
          </div>
        </div>

        {/* Current Direction */}
        <div className="bg-navy-950/70 p-2.5 rounded-lg border border-navy-800">
          <div className="text-slate-400 text-[11px] flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-teal-400" />
            <span>Current Direction</span>
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {currentDir}&deg;
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            East-Northeast
          </div>
        </div>

        {/* Wave Height */}
        <div className="bg-navy-950/70 p-2.5 rounded-lg border border-navy-800">
          <div className="text-slate-400 text-[11px] flex items-center gap-1">
            <Waves className="w-3.5 h-3.5 text-teal-400" />
            <span>Wave Height</span>
          </div>
          <div className="text-lg font-bold text-teal-300 mt-1">
            {waveHeight} <span className="text-xs font-normal text-slate-400">meters</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Dir: {waveDir}&deg;
          </div>
        </div>

        {/* Last Updated & Coordinate */}
        <div className="bg-navy-950/70 p-2.5 rounded-lg border border-navy-800 flex flex-col justify-between">
          <div className="text-slate-400 text-[11px] flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Last Update</span>
          </div>
          <div className="text-xs font-semibold text-slate-200 mt-1 truncate">
            {fetchedTime}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Open-Meteo (9.5&deg;N, 79.6&deg;E)
          </div>
        </div>
      </div>
    </div>
  );
}
