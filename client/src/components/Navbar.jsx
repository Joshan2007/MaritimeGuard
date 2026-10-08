import React from 'react';
import { Shield, Anchor, Users, AlertTriangle, Radio, Phone, Activity } from 'lucide-react';

export default function Navbar({
  currentRole,
  onRoleChange,
  activeTab,
  onTabChange,
  isSoundUnlocked,
  onUnlockSound,
  hasActiveAlert,
  hasActiveSOS,
  isAlertAcknowledged,
  onStopAlarm
}) {
  const roles = [
    { id: 'admin', label: 'Admin (Union Officer)', icon: Shield }
  ];

  const navLinks = [
    { id: 'map', label: 'Live Map', badge: hasActiveSOS ? 'SOS' : (hasActiveAlert ? 'ALERT' : null) },
    { id: 'boats', label: 'Boats Fleet' },
    { id: 'alerts', label: 'Alerts History' },
    { id: 'messages', label: 'Messages Log' }
  ];

  return (
    <header className="bg-navy-900 border-b border-navy-700 sticky top-0 z-[2000]">

      {hasActiveAlert && !hasActiveSOS && !isAlertAcknowledged && (
        <div className="bg-amber-600 text-white font-semibold px-4 py-1.5 flex items-center justify-between text-xs sm:text-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 animate-spin" />
            <span>LEVEL 1 WARNING: Vessel crossed 5.0 NM Buffer Line. Recommended Action: Turn back to safe zone immediately.</span>
          </div>
          <button
            onClick={onStopAlarm}
            className="bg-navy-900 text-white px-2.5 py-1 rounded text-xs font-semibold hover:bg-navy-800 transition shadow"
          >
            Acknowledge
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & App Title */}
          <div className="flex items-center gap-3">
            <div className="bg-teal-500/20 p-2 rounded-lg border border-teal-500/40 text-teal-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white">MaritimeGuard</span>
                <span className="text-xs bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full font-medium">
                  DEMO MODE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Palk Strait &amp; Gulf of Mannar Border Safety Platform
              </p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex space-x-1">
            {navLinks.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-navy-800 text-teal-400 border border-teal-500/30 shadow-inner'
                      : 'text-slate-300 hover:bg-navy-800/60 hover:text-white'
                  }`}
                >
                  {item.label}
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      item.badge === 'SOS' ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sound Unlock + Quick Role Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Audio unlock state */}
            {!isSoundUnlocked ? (
              <button
                onClick={onUnlockSound}
                className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs px-2.5 py-1.5 rounded-md font-medium transition"
                title="Browsers require 1 user click to permit alert audio"
              >
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                <span className="hidden sm:inline">Enable Sound</span>
                <span className="sm:hidden">Sound</span>
              </button>
            ) : (
              <span className="text-xs text-teal-400 bg-teal-500/10 border border-teal-500/30 px-2 py-1 rounded flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-teal-400 inline-block animate-ping" />
                <span className="hidden sm:inline">Audio Ready</span>
              </span>
            )}

            {/* Role Display */}
            <div className="flex items-center bg-navy-950 px-2.5 py-1.5 rounded-lg border border-navy-700">
              <span className="text-[11px] text-slate-400 mr-1.5 hidden sm:inline">Role:</span>
              <span className="text-xs text-teal-300 font-semibold flex items-center gap-1">
                Admin (Union Officer)
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden overflow-x-auto py-2 space-x-1 border-t border-navy-800">
          {navLinks.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`px-2.5 py-1 text-xs whitespace-nowrap rounded font-medium ${
                activeTab === item.id
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {item.label}
              {item.badge && ` (${item.badge})`}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
