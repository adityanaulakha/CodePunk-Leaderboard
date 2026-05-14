import { useState, useEffect } from 'react'
import { toggleMute, getMuteState, playClickSound } from '../lib/sounds.js'

export default function SoundToggleButton({ className = "" }) {
  const [muted, setMuted] = useState(getMuteState())

  const handleToggle = (e) => {
    e.stopPropagation(); // Prevent global click listener from double firing click SFX if muted
    const nextMuted = toggleMute();
    setMuted(nextMuted);
    if (!nextMuted) {
      // Briefly play a happy chime when unmuted to confirm it works!
      setTimeout(() => {
        playClickSound();
      }, 50);
    }
  }

  return (
    <button
      onClick={handleToggle}
      title={muted ? "Unmute Dashboard Sounds" : "Mute Dashboard Sounds"}
      className={`flex items-center justify-center border-4 border-neo-black p-2.5 transition-all active:scale-95 shadow-[3px_3px_0_#111] active:shadow-none cursor-pointer group relative h-12 w-12 ${
        muted 
          ? 'bg-white hover:bg-neo-lightgray' 
          : 'bg-neo-yellow hover:-translate-y-0.5'
      } ${className}`}
    >
      {muted ? (
        <svg className="w-6 h-6 text-gray-500 group-hover:text-neo-black" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6L4.5 9H1.5v6h3l5.25 5.25V3.75L4.5 9.75zm10.5-3a7.5 7.5 0 013.75 6.5c0 .86-.14 1.69-.4 2.464" />
        </svg>
      ) : (
        <svg className="w-6 h-6 text-neo-black animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
        </svg>
      )}
    </button>
  )
}
