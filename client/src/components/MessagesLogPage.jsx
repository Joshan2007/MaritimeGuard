import React, { useState } from 'react';
import { MessageSquare, Send, Copy, Check, Phone, Shield, ExternalLink, AlertCircle } from 'lucide-react';

export default function MessagesLogPage({ messages, boats, userRole }) {
  const [filterBoatId, setFilterBoatId] = useState('ALL');
  const [copiedId, setCopiedId] = useState(null);

  const filtered = messages.filter((m) => {
    if (filterBoatId === 'ALL') return true;
    return m.boat_id === filterBoatId;
  });

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-teal-400" />
            Emergency SOS Messages Log
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            SMS records sent to next-of-kin families and Union officers. Displays Twilio status or Mock SMS indicators.
          </p>
        </div>

        {/* Filter by boat */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Filter Vessel:</span>
          <select
            value={filterBoatId}
            onChange={(e) => setFilterBoatId(e.target.value)}
            className="bg-navy-900 border border-navy-700 text-teal-300 font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="ALL">All Vessels ({messages.length})</option>
            {boats.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages Table */}
      <div className="bg-navy-900 border border-navy-700 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300">
            <thead className="bg-navy-950 text-slate-400 uppercase text-[11px] tracking-wider border-b border-navy-800">
              <tr>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Vessel</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Channel &amp; Status</th>
                <th className="py-3 px-4">Provider Ref / Error</th>
                <th className="py-3 px-4">Message Text</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No emergency dispatch messages logged.
                  </td>
                </tr>
              ) : (
                filtered.map((msg) => {
                  const smsHref = `sms:${msg.phone}?body=${encodeURIComponent(msg.message_text)}`;
                  const isReal = msg.status.includes('real') || msg.status === 'Delivered';
                  const isMock = msg.status.includes('mock');

                  return (
                    <tr key={msg.id} className="hover:bg-navy-800/40 transition">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-400 text-xs">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </td>

                      <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                        {msg.boat_name}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-200">{msg.recipient_name}</div>
                        <div className="text-[11px] font-mono text-slate-400">{msg.phone}</div>
                        <span className="text-[10px] text-teal-400 uppercase">({msg.recipient_type})</span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold inline-block ${
                          isReal
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : isMock
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                            : 'bg-red-500/20 text-red-300 border border-red-500/40'
                        }`}>
                          {msg.status}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">{msg.channel}</div>
                      </td>

                      <td className="py-3 px-4 text-xs font-mono max-w-[150px] truncate">
                        {msg.provider_message_id && (
                          <span className="text-slate-400 block truncate" title={msg.provider_message_id}>
                            {msg.provider_message_id}
                          </span>
                        )}
                        {msg.error_text && (
                          <span className="text-red-400 text-[10px] block" title={msg.error_text}>
                            {msg.error_text}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-xs max-w-xs text-slate-300 break-words font-sans">
                        {msg.message_text}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={smsHref}
                            className="bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 px-2 py-1 rounded text-xs flex items-center gap-1"
                            title="Send SMS from my phone"
                          >
                            <Send className="w-3 h-3" />
                            <span className="hidden sm:inline">SMS</span>
                          </a>

                          <a
                            href={`https://wa.me/${msg.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg.message_text)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded text-xs flex items-center gap-1 font-medium"
                            title="Send via WhatsApp"
                          >
                            WhatsApp
                          </a>

                          <button
                            onClick={() => handleCopy(msg.message_text, msg.id)}
                            className="bg-navy-800 hover:bg-navy-700 text-slate-300 px-2 py-1 rounded text-xs flex items-center gap-1"
                            title="Copy message"
                          >
                            {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
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
