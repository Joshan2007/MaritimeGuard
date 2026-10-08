import React from 'react';
import { Shield, Compass, Navigation, Bell, AlertTriangle, ArrowRight, Anchor, Radio, CheckCircle2 } from 'lucide-react';

export default function OverviewPage({
  boatsCount,
  alertsCount,
  messagesCount,
  onOpenMap,
  onOpenAdmin
}) {
  const steps = [
    {
      step: '01',
      title: 'Track',
      desc: 'Simulated 1 Hz GPS satellite feeds stream precise latitude, longitude, knots, and heading for Tamil Nadu trawlers in Palk Strait.'
    },
    {
      step: '02',
      title: 'Predict',
      desc: 'Blends boat velocity with live ocean current vectors from Open-Meteo Marine API to forecast boundary crossing up to 45 minutes ahead.'
    },
    {
      step: '03',
      title: 'Alert',
      desc: 'When vessel touches the 5 NM Alert Buffer line, plays repeating Web Audio beeps and advises the skipper to steer back to Indian safe waters.'
    },
    {
      step: '04',
      title: 'SOS & Dispatch',
      desc: 'At 1 NM from the IMBL, triggers a two-tone emergency siren and automatically dispatches emergency SMS to family next-of-kin and union offices.'
    }
  ];

  return (
    <div className="space-y-10 py-4 max-w-5xl mx-auto">
      {/* Hero Headline */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-teal-300">
          <Shield className="w-4 h-4 text-teal-400" />
          <span>Tamil Nadu Maritime Boundary Defense &amp; Life Safety Platform</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          Protecting Fishermen from <span className="text-teal-400">Accidental Border Crossings</span>
        </h1>

        <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          In the narrow Palk Strait and Gulf of Mannar, strong sea currents pull fishing trawlers across the International Maritime Boundary Line into Sri Lankan waters. MaritimaGuard provides predictive collision warnings, geo-fenced sirens, and instant SOS dispatch.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={onOpenMap}
            className="bg-teal-500 hover:bg-teal-600 text-navy-950 font-bold px-6 py-3 rounded-xl text-sm flex items-center gap-2 shadow-lg transition"
          >
            <Compass className="w-4 h-4" /> Open Live Map
          </button>

          <button
            onClick={onOpenAdmin}
            className="bg-navy-800 hover:bg-navy-700 text-teal-300 border border-teal-500/30 font-semibold px-6 py-3 rounded-xl text-sm flex items-center gap-2 transition"
          >
            Admin Demo Panel <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-navy-900 border border-navy-700 rounded-xl p-5 text-center shadow-lg">
          <span className="text-slate-400 text-xs uppercase font-semibold tracking-wider">Vessels Monitored</span>
          <div className="text-3xl sm:text-4xl font-extrabold text-teal-300 mt-2">{boatsCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Rameswaram &amp; Mandapam Fleet</p>
        </div>

        <div className="bg-navy-900 border border-navy-700 rounded-xl p-5 text-center shadow-lg">
          <span className="text-slate-400 text-xs uppercase font-semibold tracking-wider">Alerts &amp; SOS Today</span>
          <div className="text-3xl sm:text-4xl font-extrabold text-amber-400 mt-2">{alertsCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Buffer Crossings Prevented</p>
        </div>

        <div className="bg-navy-900 border border-navy-700 rounded-xl p-5 text-center shadow-lg">
          <span className="text-slate-400 text-xs uppercase font-semibold tracking-wider">SOS SMS Dispatched</span>
          <div className="text-3xl sm:text-4xl font-extrabold text-white mt-2">{messagesCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Next of Kin &amp; Union Guilds</p>
        </div>
      </div>

      {/* 4 Step How It Works */}
      <div className="bg-navy-900 border border-navy-700 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="border-b border-navy-800 pb-4">
          <h2 className="text-xl font-bold text-white">How MaritimaGuard Works</h2>
          <p className="text-xs text-slate-400 mt-1">
            End-to-end maritime safety architecture built for reliability under spotty offshore connectivity.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((st) => (
            <div key={st.step} className="bg-navy-950 p-4 rounded-xl border border-navy-800 space-y-2">
              <span className="text-teal-400 text-xs font-mono font-bold">{st.step}</span>
              <h3 className="font-bold text-base text-white">{st.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{st.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
