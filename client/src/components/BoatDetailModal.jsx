import React, { useState } from 'react';
import { X, Navigation, Phone, Shield, User, AlertCircle, Compass, Anchor, ExternalLink, MessageSquare } from 'lucide-react';

export default function BoatDetailModal({
  boat,
  onClose,
  onDrift,
  onInstantSOS,
  onReturnSafety,
  userRole,
  onUpdatePhone
}) {
  if (!boat) return null;

  const [isEditingPhones, setIsEditingPhones] = useState(false);
  const [familyPhone, setFamilyPhone] = useState(boat.family_contact_phone || '');
  const [unionPhone, setUnionPhone] = useState(boat.union_contact_phone || '');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  const dist = boat.distance_to_imbl ?? 10.0;
  const status = boat.status || 'Safe';
  const mapLink = `https://maps.google.com/?q=${boat.lat},${boat.lng}`;

  const handleSavePhones = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');

    // International validation (+ followed by 10 to 15 digits)
    const phoneRegex = /^\+[1-9]\d{9,14}$/;
    if (!phoneRegex.test(familyPhone.replace(/\s+/g, ''))) {
      setEditError('Family phone must be in international format (e.g., +919842100001).');
      return;
    }
    if (!phoneRegex.test(unionPhone.replace(/\s+/g, ''))) {
      setEditError('Union phone must be in international format (e.g., +919443200001).');
      return;
    }

    try {
      await onUpdatePhone(boat.id, {
        family_contact_name: boat.family_contact_name,
        family_contact_phone: familyPhone.replace(/\s+/g, ''),
        union_contact_name: boat.union_contact_name,
        union_contact_phone: unionPhone.replace(/\s+/g, '')
      });
      setEditSuccess('Phone numbers validated and updated successfully!');
      setTimeout(() => {
        setIsEditingPhones(false);
        setEditSuccess('');
      }, 1500);
    } catch (err) {
      setEditError(err.message || 'Failed to update phone numbers.');
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-navy-950 p-4 border-b border-navy-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/20 text-teal-300 rounded-lg">
              <Anchor className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">{boat.name}</h3>
              <p className="text-xs text-slate-400">Reg: {boat.reg_number} &bull; Base Port: {boat.base_port}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              status === 'Safe' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
              status === 'Alert' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
              'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
            }`}>
              {status}
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-navy-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-navy-950 p-3 rounded-xl border border-navy-800 text-center">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">IMBL Distance</span>
              <span className={`text-base font-extrabold ${
                dist <= 1.0 ? 'text-red-400' : dist <= 5.0 ? 'text-amber-400' : 'text-teal-300'
              }`}>
                {dist} NM
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Speed</span>
              <span className="text-base font-bold text-white">{boat.speed} kn</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Heading</span>
              <span className="text-base font-bold text-white">{Math.round(boat.heading)}&deg;</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Crew</span>
              <span className="text-base font-bold text-white">{boat.crew_count} Men</span>
            </div>
          </div>

          {/* Location & Map Link */}
          <div className="bg-navy-950/60 p-3 rounded-lg border border-navy-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">GPS Coordinates</span>
              <span className="font-mono text-teal-300 font-semibold">
                {Number(boat.lat).toFixed(5)}&deg;N, {Number(boat.lng).toFixed(5)}&deg;E
              </span>
            </div>
            <a
              href={mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-teal-400 hover:text-teal-300 underline font-medium"
            >
              Google Maps <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Predictive warning line */}
          <div className="p-3 rounded-lg bg-navy-800/60 border border-navy-700 text-xs">
            <span className="text-slate-400 block mb-1">Border Crossing Trajectory</span>
            {boat.predicted_cross_minutes === -1 ? (
              <span className="text-emerald-400 font-semibold">
                Vessel is currently moving safely away from the IMBL buffer.
              </span>
            ) : boat.predicted_cross_minutes <= 45 ? (
              <span className="text-amber-300 font-bold flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Predicted to cross alert line in ~{boat.predicted_cross_minutes} minutes!
              </span>
            ) : (
              <span className="text-slate-300">
                Safe heading. Greater than 45 minutes to Alert boundary at current speed and drift.
              </span>
            )}
          </div>

          {/* Contacts & Editable Phones Section */}
          <div className="border border-navy-800 rounded-xl p-3.5 bg-navy-950">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Emergency SOS Contacts
              </h4>
              {userRole === 'admin' && !isEditingPhones && (
                <button
                  onClick={() => setIsEditingPhones(true)}
                  className="text-xs text-teal-400 hover:text-teal-300 underline"
                >
                  Edit Numbers
                </button>
              )}
            </div>

            {isEditingPhones ? (
              <form onSubmit={handleSavePhones} className="space-y-3 text-xs">
                {editError && (
                  <div className="bg-red-500/20 text-red-300 p-2 rounded border border-red-500/40 text-[11px]">
                    {editError}
                  </div>
                )}
                {editSuccess && (
                  <div className="bg-emerald-500/20 text-emerald-300 p-2 rounded border border-emerald-500/40 text-[11px]">
                    {editSuccess}
                  </div>
                )}

                <div>
                  <label className="text-slate-400 block mb-0.5">Family Contact ({boat.family_contact_name}):</label>
                  <input
                    type="text"
                    value={familyPhone}
                    onChange={(e) => setFamilyPhone(e.target.value)}
                    className="w-full bg-navy-900 border border-navy-700 rounded px-2.5 py-1.5 text-white font-mono focus:border-teal-400 focus:outline-none"
                    placeholder="+919842100001"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-0.5">Union Contact ({boat.union_contact_name}):</label>
                  <input
                    type="text"
                    value={unionPhone}
                    onChange={(e) => setUnionPhone(e.target.value)}
                    className="w-full bg-navy-900 border border-navy-700 rounded px-2.5 py-1.5 text-white font-mono focus:border-teal-400 focus:outline-none"
                    placeholder="+919443200001"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingPhones(false);
                      setEditError('');
                    }}
                    className="px-3 py-1 bg-navy-800 text-slate-300 hover:bg-navy-700 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-teal-500 hover:bg-teal-600 text-navy-950 font-bold rounded"
                  >
                    Save &amp; Validate
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-navy-900 pb-1.5">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Family Next of Kin:</span>
                    <span className="text-slate-200 font-medium">{boat.family_contact_name}</span>
                  </div>
                  <span className="font-mono text-teal-300 bg-navy-900 px-2 py-0.5 rounded border border-navy-800">
                    {boat.family_contact_phone}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Fishermen Union Office:</span>
                    <span className="text-slate-200 font-medium">{boat.union_contact_name}</span>
                  </div>
                  <span className="font-mono text-teal-300 bg-navy-900 px-2 py-0.5 rounded border border-navy-800">
                    {boat.union_contact_phone}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Captain & Admin Simulation Controls */}
          {(userRole === 'admin' || userRole === 'captain') && (
            <div className="pt-2 border-t border-navy-800 flex items-center justify-between gap-2">
              <button
                onClick={() => { onDrift(boat.id); onClose(); }}
                className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs py-2 rounded-lg font-semibold transition"
              >
                Drift to Border
              </button>
              <button
                onClick={() => { onInstantSOS(boat.id); onClose(); }}
                className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs py-2 rounded-lg font-semibold transition"
              >
                Instant SOS
              </button>
              <button
                onClick={() => { onReturnSafety(boat.id); onClose(); }}
                className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs py-2 rounded-lg font-semibold transition"
              >
                Return Safe
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
