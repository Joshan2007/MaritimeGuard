import React, { useState } from 'react';
import { Anchor, Plus, Phone, Users, Shield, Check, AlertCircle, Edit2 } from 'lucide-react';

export default function BoatsFleetPage({
  boats,
  userRole,
  onAddBoat,
  onUpdatePhone
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBoatId, setEditingBoatId] = useState(null);
  const [phoneForm, setPhoneForm] = useState({
    family_contact_name: '',
    family_contact_phone: '',
    union_contact_name: '',
    union_contact_phone: ''
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Add Boat state
  const [newBoat, setNewBoat] = useState({
    name: '',
    reg_number: '',
    captain_name: '',
    crew_count: 5,
    base_port: 'Rameswaram',
    family_contact_name: '',
    family_contact_phone: '+919445565979',
    union_contact_name: 'Palk Fishermen Union',
    union_contact_phone: '+919445565979'
  });

  const startEditPhone = (boat) => {
    setEditingBoatId(boat.id);
    setPhoneForm({
      family_contact_name: boat.family_contact_name,
      family_contact_phone: boat.family_contact_phone,
      union_contact_name: boat.union_contact_name,
      union_contact_phone: boat.union_contact_phone
    });
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSavePhone = async (boatId) => {
    setErrorMsg('');
    setSuccessMsg('');

    const phoneRegex = /^\+[1-9]\d{9,14}$/;
    if (!phoneRegex.test(phoneForm.family_contact_phone.trim())) {
      setErrorMsg('Family phone must be in international format (e.g. +919842100001).');
      return;
    }
    if (!phoneRegex.test(phoneForm.union_contact_phone.trim())) {
      setErrorMsg('Union phone must be in international format (e.g. +919443200001).');
      return;
    }

    try {
      await onUpdatePhone(boatId, {
        family_contact_name: phoneForm.family_contact_name,
        family_contact_phone: phoneForm.family_contact_phone.trim(),
        union_contact_name: phoneForm.union_contact_name,
        union_contact_phone: phoneForm.union_contact_phone.trim()
      });
      setSuccessMsg('Contacts validated and updated.');
      setTimeout(() => {
        setEditingBoatId(null);
        setSuccessMsg('');
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update contacts.');
    }
  };

  const handleCreateBoat = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await onAddBoat(newBoat);
      setShowAddModal(false);
      setNewBoat({
        name: '',
        reg_number: '',
        captain_name: '',
        crew_count: 5,
        base_port: 'Rameswaram',
        family_contact_name: '',
        family_contact_phone: '+919842100000',
        union_contact_name: 'Palk Fishermen Union',
        union_contact_phone: '+919443200000'
      });
    } catch (err) {
      setErrorMsg(err.message || 'Error registering vessel.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Anchor className="w-6 h-6 text-teal-400" />
            Registered Vessels Fleet
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Registered fishing trawlers across Rameswaram, Pamban, Mandapam &amp; Thangachimadam.
          </p>
        </div>

        {userRole === 'admin' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-teal-500 hover:bg-teal-600 text-navy-950 font-bold px-4 py-2 rounded-lg text-xs sm:text-sm flex items-center gap-1.5 transition shadow"
          >
            <Plus className="w-4 h-4" /> Add New Vessel
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="bg-red-500/20 text-red-300 p-3 rounded-xl border border-red-500/40 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Fleet Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {boats.map((boat) => {
          const isEditing = editingBoatId === boat.id;
          const status = boat.status || 'Safe';

          return (
            <div
              key={boat.id}
              className="bg-navy-900 border border-navy-700 rounded-xl p-5 shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-white">{boat.name}</h3>
                    <p className="text-xs text-slate-400">Port: {boat.base_port}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    status === 'Safe' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                    status === 'Alert' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                    'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                  }`}>
                    {status}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs bg-navy-950 p-2.5 rounded-lg border border-navy-800">
                  <div>
                    <span className="text-slate-400 text-[10px]">Reg Number</span>
                    <p className="font-mono text-slate-200">{boat.reg_number}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Captain</span>
                    <p className="text-slate-200 font-medium">{boat.captain_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Crew Count</span>
                    <p className="text-slate-200">{boat.crew_count} Men</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">IMBL Distance</span>
                    <p className={`font-bold ${boat.distance_to_imbl <= 1.0 ? 'text-red-400' : 'text-teal-300'}`}>
                      {boat.distance_to_imbl} NM
                    </p>
                  </div>
                </div>

                {/* Contacts Box */}
                <div className="mt-4 border-t border-navy-800 pt-3 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-300 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                      <Phone className="w-3 h-3 text-teal-400" /> Emergency SOS Contacts
                    </span>
                    {userRole === 'admin' && !isEditing && (
                      <button
                        onClick={() => startEditPhone(boat)}
                        className="text-teal-400 hover:text-teal-300 text-xs flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 bg-navy-950 p-3 rounded-lg border border-teal-500/40">
                      <div>
                        <label className="text-[10px] text-slate-400 block">Family Phone (+91...):</label>
                        <input
                          type="text"
                          value={phoneForm.family_contact_phone}
                          onChange={(e) => setPhoneForm({ ...phoneForm, family_contact_phone: e.target.value })}
                          className="w-full bg-navy-900 border border-navy-700 rounded px-2 py-1 text-white font-mono text-xs focus:border-teal-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block">Union Phone (+91...):</label>
                        <input
                          type="text"
                          value={phoneForm.union_contact_phone}
                          onChange={(e) => setPhoneForm({ ...phoneForm, union_contact_phone: e.target.value })}
                          className="w-full bg-navy-900 border border-navy-700 rounded px-2 py-1 text-white font-mono text-xs focus:border-teal-400 focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => setEditingBoatId(null)}
                          className="px-2 py-1 bg-navy-800 text-slate-400 rounded text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSavePhone(boat.id)}
                          className="px-2.5 py-1 bg-teal-500 hover:bg-teal-600 text-navy-950 font-bold rounded text-xs"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400 truncate max-w-[120px]">{boat.family_contact_name}:</span>
                        <span className="font-mono text-teal-300">{boat.family_contact_phone}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400 truncate max-w-[120px]">{boat.union_contact_name}:</span>
                        <span className="font-mono text-teal-300">{boat.union_contact_phone}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-navy-800 text-[10px] text-slate-400 flex items-center justify-between">
                <span>GPS: {Number(boat.lat).toFixed(3)}&deg;N, {Number(boat.lng).toFixed(3)}&deg;E</span>
                <span>Speed: {boat.speed} kn</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Boat Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-md p-6 text-white space-y-4">
            <h3 className="text-lg font-bold">Register New Fishing Vessel</h3>
            <form onSubmit={handleCreateBoat} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Boat Name</label>
                <input
                  type="text"
                  required
                  value={newBoat.name}
                  onChange={(e) => setNewBoat({ ...newBoat, name: e.target.value })}
                  placeholder="e.g. Santhana Mary"
                  className="w-full bg-navy-950 border border-navy-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 block mb-1">Reg Number</label>
                  <input
                    type="text"
                    required
                    value={newBoat.reg_number}
                    onChange={(e) => setNewBoat({ ...newBoat, reg_number: e.target.value })}
                    placeholder="IND-TN-10-MM-..."
                    className="w-full bg-navy-950 border border-navy-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Base Port</label>
                  <select
                    value={newBoat.base_port}
                    onChange={(e) => setNewBoat({ ...newBoat, base_port: e.target.value })}
                    className="w-full bg-navy-950 border border-navy-700 rounded-lg p-2 text-white"
                  >
                    <option value="Rameswaram">Rameswaram</option>
                    <option value="Pamban">Pamban</option>
                    <option value="Mandapam">Mandapam</option>
                    <option value="Thangachimadam">Thangachimadam</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 block mb-1">Captain Name</label>
                  <input
                    type="text"
                    required
                    value={newBoat.captain_name}
                    onChange={(e) => setNewBoat({ ...newBoat, captain_name: e.target.value })}
                    placeholder="Captain Name"
                    className="w-full bg-navy-950 border border-navy-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Crew Count</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={newBoat.crew_count}
                    onChange={(e) => setNewBoat({ ...newBoat, crew_count: e.target.value })}
                    className="w-full bg-navy-950 border border-navy-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Family Contact Name &amp; Phone</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={newBoat.family_contact_name}
                    onChange={(e) => setNewBoat({ ...newBoat, family_contact_name: e.target.value })}
                    placeholder="Contact Name"
                    className="bg-navy-950 border border-navy-700 rounded-lg p-2 text-white"
                  />
                  <input
                    type="text"
                    required
                    value={newBoat.family_contact_phone}
                    onChange={(e) => setNewBoat({ ...newBoat, family_contact_phone: e.target.value })}
                    placeholder="+919842100000"
                    className="bg-navy-950 border border-navy-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Union Contact Name &amp; Phone</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={newBoat.union_contact_name}
                    onChange={(e) => setNewBoat({ ...newBoat, union_contact_name: e.target.value })}
                    placeholder="Union Name"
                    className="bg-navy-950 border border-navy-700 rounded-lg p-2 text-white"
                  />
                  <input
                    type="text"
                    required
                    value={newBoat.union_contact_phone}
                    onChange={(e) => setNewBoat({ ...newBoat, union_contact_phone: e.target.value })}
                    placeholder="+919443200000"
                    className="bg-navy-950 border border-navy-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-navy-800 hover:bg-navy-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-navy-950 font-bold rounded-lg"
                >
                  Save Vessel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
