import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Confetti from 'react-confetti'
import { Link, useNavigate } from 'react-router-dom'
import { useWindowSize } from 'react-use'
import useTeamsRealtime from '../hooks/useTeamsRealtime.js'
import { useAuthState } from './AdminPage.jsx'

const MotionDiv = motion.div

export default function PodiumPage() {
  const navigate = useNavigate()
  const user = useAuthState()
  const { teams } = useTeamsRealtime()
  const { width, height } = useWindowSize()

  const [ceremonyTrack, setCeremonyTrack] = useState('software')
  const [ranksToReveal, setRanksToReveal] = useState(3)
  const [ceremonyStarted, setCeremonyStarted] = useState(false)
  const [revealedCount, setRevealedCount] = useState(0)

  useEffect(() => {
    // We intentionally do not forcefully navigate because Firebase Auth
    // often initializes with `null` on the very first mount before settling.
  }, [])

  // Keyboard Navigation
  const handleKeyDown = useCallback((e) => {
    if (!ceremonyStarted) return
    if (e.code === 'Space' || e.code === 'ArrowRight' || e.code === 'Enter') {
      e.preventDefault()
      if (revealedCount < ranksToReveal) {
        setRevealedCount(prev => prev + 1)
      }
    } else if (e.code === 'ArrowLeft') {
      if (revealedCount > 0) {
        setRevealedCount(prev => prev - 1)
      }
    } else if (e.code === 'Escape') {
      setCeremonyStarted(false)
      setRevealedCount(0)
    }
  }, [ceremonyStarted, revealedCount, ranksToReveal])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Filter and sort teams
  const topTeams = [...teams]
    .filter(t => (t.track || 'software').toLowerCase() === ceremonyTrack.toLowerCase())
    .sort((a, b) => b.total - a.total)
    .slice(0, ranksToReveal)

  const isFinished = revealedCount >= ranksToReveal
  const showConfetti = revealedCount >= ranksToReveal && topTeams.length > 0

  const handleStart = (e) => {
    e.preventDefault()
    setRevealedCount(0)
    setCeremonyStarted(true)
  }

  // Wait for user state to load
  if (user === undefined) return <div className="h-dvh bg-zinc-950 flex items-center justify-center font-hero text-4xl animate-pulse text-spidey-blue">INITIALIZING SECURE FEED...</div>
  // Handle unauthorized users
  if (user === null) {
    return (
      <div className="h-dvh bg-zinc-950 flex flex-col items-center justify-center text-center p-8">
        <div className="font-hero text-4xl text-spidey-red mb-4 drop-shadow-[2px_2px_0_#000]">ACCESS DENIED</div>
        <p className="text-zinc-400 font-bold tracking-widest uppercase mb-8">You must be authenticated as an Admin to enter Podium Mode.</p>
        <Link to="/admin" className="px-6 py-3 border-4 border-spidey-blue bg-zinc-900 text-white font-hero text-2xl uppercase hover:-translate-y-1 shadow-[4px_4px_0_#111] transition-all">Go to Admin Portal to Login</Link>
      </div>
    )
  }

  // 1. Setup Screen
  if (!ceremonyStarted) {
    return (
      <div className="min-h-dvh bg-zinc-950 flex flex-col items-center justify-center p-8 relative overflow-hidden text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-spidey-red/5 rounded-full blur-[100px] pointer-events-none"></div>
        
        <MotionDiv initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 w-full max-w-2xl border-4 border-spidey-red bg-zinc-900/90 backdrop-blur-xl p-10 lg:p-14 shadow-[12px_12px_0_#111]">
          <h1 className="font-hero text-6xl uppercase tracking-widest text-white drop-shadow-[4px_4px_0_#111] mb-2">PODIUM MODE</h1>
          <p className="text-spidey-red font-bold uppercase tracking-widest mb-10">Admin Ceremony Control Setup</p>

          <form onSubmit={handleStart} className="flex flex-col gap-8 text-left">
            <div className="flex flex-col gap-3">
              <label className="font-hero text-3xl uppercase text-zinc-400">Select Track</label>
              <select value={ceremonyTrack} onChange={e => setCeremonyTrack(e.target.value)} className="border-4 border-zinc-700 bg-zinc-950 p-4 font-hero text-3xl uppercase text-white outline-none focus:border-white transition-colors cursor-pointer">
                <option value="software">SOFTWARE TRACK</option>
                <option value="hardware">HARDWARE TRACK</option>
              </select>
            </div>

            <div className="flex flex-col gap-3">
              <label className="font-hero text-3xl uppercase text-zinc-400">Ranks To Reveal</label>
              <input type="number" min="1" max="50" value={ranksToReveal} onChange={e => setRanksToReveal(Number(e.target.value))} className="border-4 border-zinc-700 bg-zinc-950 p-4 font-hero text-3xl uppercase text-white outline-none focus:border-white transition-colors" />
            </div>

            <button type="submit" className="mt-4 bg-spidey-red w-full py-6 font-hero text-4xl uppercase tracking-widest text-white shadow-[8px_8px_0_#000] hover:-translate-y-2 hover:shadow-[12px_12px_0_#000] transition-all">
              Initialize Ceremony Sequence
            </button>
            <Link to="/admin" className="text-center font-hero text-xl text-zinc-500 uppercase hover:text-white transition-colors underline underline-offset-4 mt-2">ESCAPE BACK TO ADMIN PORTAL</Link>
          </form>
        </MotionDiv>
      </div>
    )
  }

  // 2. Ceremony Screen
  // 2. Ceremony Screen
  
  // Algorithm to build the center-weighted tournament layout (e.g. #4, #2, #1, #3, #5)
  const arrangedTeams = []
  const leftSide = []
  const rightSide = []
  
  topTeams.forEach((team, i) => {
    const rank = i + 1
    if (i === 0) arrangedTeams.push({ ...team, rank })
    else if (i % 2 !== 0) leftSide.push({ ...team, rank })
    else rightSide.push({ ...team, rank })
  })
  
  const podiumLayout = [...leftSide.reverse(), ...arrangedTeams, ...rightSide]

  return (
    <div 
      className={`fixed inset-0 bg-zinc-950 flex flex-col justify-center items-center overflow-hidden cursor-pointer ${showConfetti ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
      onClick={() => {
        if (revealedCount < ranksToReveal) setRevealedCount(prev => prev + 1)
      }}
    >
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-50">
        <div className="absolute bottom-0 left-0 w-full h-[50vh] bg-gradient-to-t from-spidey-blue/20 to-transparent"></div>
        <div className="absolute top-[20%] left-[10%] w-[50vw] h-[50vw] bg-spidey-blue/10 rounded-full blur-[150px] mix-blend-screen animate-pulse"></div>
        <div className="absolute bottom-[20%] right-[10%] w-[60vw] h-[60vw] bg-gwen-pink/10 rounded-full blur-[150px] mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {showConfetti && (
        <div className="absolute inset-0 z-50 pointer-events-none">
          <Confetti width={width} height={height} recycle={true} numberOfPieces={800} gravity={0.35} colors={['#ca8a04', '#facc15', '#a16207', '#ffffff', '#fbbf24']} />
        </div>
      )}

      {/* Exit Button */}
      <div className="absolute top-8 left-8 z-50 opacity-10 hover:opacity-100 transition-opacity">
        <button onClick={() => setCeremonyStarted(false)} className="bg-zinc-900 border-2 border-zinc-700 text-white px-4 py-2 font-hero text-xl uppercase tracking-widest shadow-[4px_4px_0_#111]">EXIT CEREMONY</button>
      </div>

      {/* Header and Prompt */}
      <div className="absolute top-12 left-0 right-0 z-40 flex flex-col items-center pointer-events-none">
        <h2 className="font-hero text-5xl sm:text-7xl uppercase text-white tracking-[0.2em] drop-shadow-[4px_4px_0_#111]">
          {ceremonyTrack} Track
        </h2>
        {revealedCount === 0 ? (
          <p className="font-hero text-2xl uppercase text-gwen-cyan mt-6 tracking-widest bg-gwen-cyan/10 border-2 border-gwen-cyan px-6 py-2 animate-pulse">COMMENCE SEQUENCE [PRESS SPACEBAR]</p>
        ) : revealedCount < ranksToReveal ? (
           <p className="font-hero text-xl uppercase text-zinc-500 mt-4 tracking-widest">[PRESS SPACEBAR TO REVEAL NEXT]</p>
        ) : null}
      </div>

      {/* Podium Stage Container */}
      <div className="relative z-10 w-full h-full flex items-end justify-center px-4 overflow-hidden gap-1 sm:gap-4 md:gap-6 lg:gap-10 pb-0">
        <AnimatePresence>
          {podiumLayout.map(({ rank, name, total, id }) => {
            
            // Logic to determine if this specific pedestal should be raised yet
            const isVisible = rank > ranksToReveal - revealedCount
            
            // Theme map based on rank
            const isFirst = rank === 1
            const isSecond = rank === 2
            const isThird = rank === 3
            
            const themeBorder = isFirst ? 'border-yellow-400' : isSecond ? 'border-slate-300' : isThird ? 'border-amber-700' : 'border-gwen-cyan'
            const themeColBg = isFirst ? 'bg-gradient-to-t from-yellow-600 to-yellow-400/20' : isSecond ? 'bg-gradient-to-t from-slate-600 to-slate-400/20' : isThird ? 'bg-gradient-to-t from-amber-900 to-amber-700/20' : 'bg-gradient-to-t from-cyan-900 to-cyan-500/20'
            const themeText = isFirst ? 'text-yellow-400' : isSecond ? 'text-slate-300' : isThird ? 'text-amber-600' : 'text-gwen-cyan'
            const medal = isFirst ? '🥇' : isSecond ? '🥈' : isThird ? '🥉' : ''

            // Calculate heights (Rank 1 is tallest, sliding down from there)
            const baseHeight = Math.max(20, 85 - ((rank - 1) * 15)) // 85vh, 70vh, 55vh, etc.

            return (
              <MotionDiv
                key={id}
                className="flex flex-col items-center justify-end w-full max-w-[320px] flex-1"
                initial={{ y: '100%' }}
                animate={{ y: isVisible ? '0%' : '100%' }}
                transition={{ type: "spring", bounce: 0.25, duration: 1.2 }}
                style={{ height: `${baseHeight}vh` }}
              >
                {/* Team Info Card sitting perpetually ON TOP of the pedestal */}
                <div className={`relative z-20 w-full border-4 lg:border-8 backdrop-blur-xl flex flex-col items-center justify-center -mb-2 ${themeBorder} ${isFirst ? 'bg-yellow-400/10 shadow-[0_-20px_60px_rgba(250,204,21,0.3)]' : 'bg-zinc-950'} py-6 lg:py-10 px-2 lg:px-6`}>
                  
                  {isFirst && isVisible && (
                    <div className="absolute -inset-4 border-8 border-yellow-400/30 animate-[pulse_1.5s_ease-in-out_infinite] z-[-1] pointer-events-none"></div>
                  )}

                  <div className={`font-hero text-6xl lg:text-8xl tracking-tighter drop-shadow-[4px_4px_0_#000] mb-2 ${themeText}`}>#{rank}</div>
                  
                  <div className="text-center w-full mb-4 px-2">
                    <h3 className="font-hero text-3xl lg:text-5xl uppercase tracking-wider text-white drop-shadow-[3px_3px_0_#000] leading-tight text-wrap-balance break-words">
                      {medal} {name}
                    </h3>
                  </div>

                  <div className={`font-hero text-5xl lg:text-7xl drop-shadow-[4px_4px_0_#000] mt-auto ${themeText}`}>
                    {Number(total).toFixed(1)}
                  </div>
                </div>

                {/* The Solid Pedestal Block */}
                <div className={`w-[90%] border-x-4 border-t-4 border-b-0 ${themeBorder} ${themeColBg} flex-1 relative flex justify-center shadow-[inset_0_20px_50px_rgba(0,0,0,0.5)]`}>
                   {/* Cool inner pedestal sci-fi styling */}
                   <div className="w-1/3 h-full bg-black/20 border-x-2 border-black/30"></div>
                </div>
              </MotionDiv>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
