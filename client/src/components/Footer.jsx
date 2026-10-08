import React from 'react';
import { Info, HelpCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-navy-950 border-t border-navy-800 text-slate-400 py-4 px-4 text-center mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-teal-400 font-semibold tracking-wide">
          <Info className="w-4 h-4 text-teal-400 flex-shrink-0" />
          <span>Prototype. Simulated GPS. Not for real navigation.</span>
        </div>

        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
          <span>Tamil Nadu Fishermen Safety (Palk Strait &amp; Gulf of Mannar)</span>
          <span>&bull;</span>
          <span>Open-Meteo Marine &amp; Twilio Integrations</span>
        </div>
      </div>
    </footer>
  );
}
