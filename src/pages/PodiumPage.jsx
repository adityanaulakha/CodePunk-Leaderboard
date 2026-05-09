import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Confetti from 'react-confetti'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useWindowSize } from 'react-use'
import useTeamsRealtime from '../hooks/useTeamsRealtime.js'
import { useAuthState } from './AdminPage.jsx'

const MotionDiv = motion.div

export default function PodiumPage() {
  const { hackathonId } = useParams()
  const navigate = useNavigate()
  const user = useAuthState()
  const { teams, tracks } = useTeamsRealtime(hackathonId)
  const { width, height } = useWindowSize()

  const [ceremonyTrack, setCeremonyTrack] = useState('')

  useEffect(() => {
    if (tracks && tracks.length > 0 && !ceremonyTrack) {
      setCeremonyTrack(tracks[0].id)
    }
  }, [tracks, ceremonyTrack])
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
    .filter(t => (t.track || '').toLowerCase() === ceremonyTrack.toLowerCase())
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
  if (user === undefined) return <div className="h-dvh bg-neo-white flex items-center justify-center font-hero text-4xl animate-pulse text-neo-black border-4 border-neo-black shadow-brutal p-8 m-8">INITIALIZING SECURE FEED...</div>
  // Handle unauthorized users
  if (user === null) {
    return (
      <div className="min-h-dvh bg-neo-white flex flex-col items-center justify-center text-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(17,17,17,0.05)_2px,transparent_2px),linear-gradient(90deg,rgba(17,17,17,0.05)_2px,transparent_2px)] bg-[size:32px_32px]"></div>
        <div className="relative z-10 border-4 border-neo-black bg-neo-white p-12 shadow-[12px_12px_0_#111]">
          <div className="font-hero text-6xl text-neo-black mb-4 uppercase bg-neo-red px-6 py-2 border-4 border-neo-black shadow-[6px_6px_0_#111] inline-block -rotate-2">ACCESS DENIED</div>
          <p className="text-neo-black font-black tracking-widest uppercase mb-8 mt-6">You must be authenticated as an Admin to enter Podium Mode.</p>
          <Link to={`/${hackathonId}/admin`} className="px-8 py-4 border-4 border-neo-black bg-neo-yellow text-neo-black font-hero text-3xl uppercase hover:-translate-y-1 shadow-[6px_6px_0_#111] hover:shadow-[8px_8px_0_#111] transition-all inline-block">Go to Admin Portal to Login</Link>
        </div>
      </div>
    )
  }

  // 1. Setup Screen
  if (!ceremonyStarted) {
    return (
      <div className="min-h-dvh bg-neo-white flex flex-col items-center justify-center p-8 relative overflow-hidden text-center">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(17,17,17,0.05)_2px,transparent_2px),linear-gradient(90deg,rgba(17,17,17,0.05)_2px,transparent_2px)] bg-[size:32px_32px] pointer-events-none"></div>
        
        <MotionDiv initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 w-full max-w-2xl border-4 border-neo-black bg-white p-10 lg:p-14 shadow-[12px_12px_0_#111]">
          <h1 className="font-hero text-6xl uppercase tracking-widest text-neo-black drop-shadow-[4px_4px_0_#FFD600] mb-2">PODIUM MODE</h1>
          <p className="text-neo-red font-black uppercase tracking-widest mb-10 border-b-4 border-neo-black pb-4">Admin Ceremony Control Setup</p>

          <form onSubmit={handleStart} className="flex flex-col gap-8 text-left">
            <div className="flex flex-col gap-3">
              <label className="font-hero text-3xl uppercase text-neo-black">Select Track</label>
              <select value={ceremonyTrack} onChange={e => setCeremonyTrack(e.target.value)} className="border-4 border-neo-black bg-neo-white p-4 font-hero text-3xl uppercase text-neo-black outline-none focus:bg-neo-yellow transition-colors cursor-pointer shadow-[4px_4px_0_#111]">
                {tracks?.map(t => (
                  <option key={t.id} value={t.id}>{t.name.toUpperCase()} TRACK</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-3">
              <label className="font-hero text-3xl uppercase text-neo-black">Ranks To Reveal</label>
              <input type="number" min="1" max="50" value={ranksToReveal} onChange={e => setRanksToReveal(Number(e.target.value))} className="border-4 border-neo-black bg-neo-white p-4 font-hero text-3xl uppercase text-neo-black outline-none focus:bg-neo-yellow transition-colors shadow-[4px_4px_0_#111]" />
            </div>

            <button type="submit" className="mt-4 bg-neo-black border-4 border-neo-black w-full py-6 font-hero text-4xl uppercase tracking-widest text-neo-white shadow-[8px_8px_0_#FFD600] hover:-translate-y-2 hover:shadow-[12px_12px_0_#FFD600] transition-all">
              Initialize Ceremony Sequence
            </button>
            <Link to={`/${hackathonId}/admin`} className="text-center font-black text-sm text-neo-black uppercase hover:text-neo-red transition-colors underline underline-offset-4 mt-2 tracking-widest">ESCAPE BACK TO ADMIN PORTAL</Link>
          </form>
        </MotionDiv>
      </div>
    )
  }

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
      className={`fixed inset-0 bg-neo-white flex flex-col justify-center items-center overflow-hidden cursor-pointer ${showConfetti ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
      onClick={() => {
        if (revealedCount < ranksToReveal) setRevealedCount(prev => prev + 1)
      }}
    >
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-50">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(17,17,17,0.05)_2px,transparent_2px),linear-gradient(90deg,rgba(17,17,17,0.05)_2px,transparent_2px)] bg-[size:32px_32px]"></div>
      </div>

      {showConfetti && (
        <div className="absolute inset-0 z-50 pointer-events-none">
          <Confetti width={width} height={height} recycle={true} numberOfPieces={800} gravity={0.35} colors={['#111111', '#FFD600', '#FF0000', '#ffffff', '#4ade80']} />
        </div>
      )}

      {/* Exit Button */}
      <div className="absolute top-8 left-8 z-50 opacity-50 hover:opacity-100 transition-opacity">
        <button onClick={() => setCeremonyStarted(false)} className="bg-white border-4 border-neo-black text-neo-black px-4 py-2 font-hero text-xl uppercase tracking-widest shadow-[4px_4px_0_#111] hover:-translate-y-1 hover:shadow-[6px_6px_0_#111] transition-all">EXIT CEREMONY</button>
      </div>

      {/* Header and Prompt */}
      <div className="absolute top-12 left-0 right-0 z-40 flex flex-col items-center pointer-events-none">
        <h2 className="font-hero text-5xl sm:text-7xl uppercase text-neo-black tracking-[0.2em] drop-shadow-[4px_4px_0_#FFD600]">
          {tracks?.find(t => t.id === ceremonyTrack)?.name || ceremonyTrack} Track
        </h2>
        {revealedCount === 0 ? (
          <p className="font-hero text-2xl uppercase text-neo-black mt-6 tracking-widest bg-neo-yellow border-4 border-neo-black px-6 py-2 animate-pulse shadow-[6px_6px_0_#111]">COMMENCE SEQUENCE [PRESS SPACEBAR]</p>
        ) : revealedCount < ranksToReveal ? (
           <p className="font-hero text-xl uppercase text-neo-black mt-4 tracking-widest border-4 border-neo-black bg-white px-4 py-1 shadow-[4px_4px_0_#111]">[PRESS SPACEBAR TO REVEAL NEXT]</p>
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
            
            const themeBg = isFirst ? 'bg-neo-yellow' : isSecond ? 'bg-neo-lightgray' : isThird ? 'bg-[#D2B48C]' : 'bg-white'
            const themeBorder = 'border-neo-black'
            const themeText = 'text-neo-black'
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
                <div className={`relative z-20 w-full border-4 lg:border-8 flex flex-col items-center justify-center -mb-2 ${themeBorder} ${themeBg} py-6 lg:py-10 px-2 lg:px-6 shadow-[12px_12px_0_#111]`}>
                  
                  {isFirst && isVisible && (
                    <div className="absolute -inset-4 border-8 border-neo-black animate-[pulse_1.5s_ease-in-out_infinite] z-[-1] pointer-events-none"></div>
                  )}

                  <div className={`font-hero text-6xl lg:text-8xl tracking-tighter drop-shadow-[4px_4px_0_#FFF] mb-2 ${themeText}`}>#{rank}</div>
                  
                  <div className="text-center w-full mb-4 px-2">
                    <h3 className="font-hero text-3xl lg:text-5xl uppercase tracking-wider text-neo-black drop-shadow-[2px_2px_0_#FFF] leading-tight text-wrap-balance break-words bg-white/50 px-2 py-1 border-2 border-neo-black">
                      {medal} {name}
                    </h3>
                  </div>

                  <div className={`font-hero text-5xl lg:text-7xl drop-shadow-[4px_4px_0_#FFF] mt-auto ${themeText} bg-white px-4 py-2 border-4 border-neo-black`}>
                    {Number(total).toFixed(1)}
                  </div>
                </div>

                {/* The Solid Pedestal Block */}
                <div className={`w-[90%] border-x-4 border-t-4 border-b-0 ${themeBorder} ${themeBg} flex-1 relative flex justify-center shadow-[inset_0_20px_50px_rgba(0,0,0,0.2)]`}>
                   {/* Cool inner pedestal sci-fi styling */}
                   <div className="w-1/3 h-full bg-neo-black/10 border-x-4 border-neo-black"></div>
                </div>
              </MotionDiv>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
