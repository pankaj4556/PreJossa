import React from 'react';

export default function Footer() {
  return (
    <footer className="relative bg-[#040711] border-t border-white/[0.08] text-slate-400 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand & Mission */}
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              PJ
            </div>
            <span className="font-['Space_Grotesk'] font-bold text-base text-white">PreJOSAA</span>
          </div>
          <span className="hidden sm:inline text-slate-600">|</span>
          <p className="text-xs text-slate-500">
            Algorithmic choice architecture for JEE Main & JEE Advanced candidates.
          </p>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium">
          <a href="/generator" className="hover:text-white transition-colors">
            Choice Generator
          </a>
          <a href="/explore" className="hover:text-white transition-colors">
            College Explorer
          </a>
          <a href="/nirf" className="hover:text-white transition-colors">
            NIRF Ranking
          </a>
          <a href="/branches" className="hover:text-white transition-colors">
            Branch Directory
          </a>
          <a href="/about" className="hover:text-white transition-colors">
            Data Sources & Disclaimer
          </a>
          <a href="/login" className="hover:text-white transition-colors">
            Sign In
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-3">
        <p>
          &copy; {new Date().getFullYear()} PreJOSAA. All rights reserved. Not affiliated with the official JoSAA / CSAB counseling boards.
        </p>
        <p className="font-mono text-slate-600">
          Built for JEE candidates across India.
        </p>
      </div>
    </footer>
  );
}
