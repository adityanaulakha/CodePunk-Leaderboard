import { useState, useMemo, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Confetti from 'react-confetti'
import { useWindowSize } from 'react-use'
import LeaderboardTable from '../components/LeaderboardTable.jsx'
import useTeamsRealtime from '../hooks/useTeamsRealtime.js'
import { useAuthState, useRoles } from './AdminPage.jsx'

function LiveIndicator() {
  return (
    <div className="flex items-center gap-2 bg-neo-yellow border-4 border-neo-black px-4 py-2 shadow-[4px_4px_0_#111]">
      <motion.div
        animate={{ opacity: [1, 0.2, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="w-3 h-3 bg-neo-red border-2 border-neo-black rounded-full"
      />
      <span className="font-black text-xs uppercase tracking-[0.2em] text-neo-black pt-1">LIVE DATA</span>
    </div>
  )
}

function CategoryTabs({ current, onChange, tracks = [] }) {
  if (!tracks || tracks.length <= 1) return null;
  return (
    <div className="flex flex-wrap items-center bg-white border-4 border-neo-black p-1 shadow-[6px_6px_0_#111]">
      {tracks.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex-1 px-6 py-3 font-hero text-2xl uppercase transition-colors whitespace-nowrap ${
            current === t.id 
              ? 'bg-neo-black text-neo-yellow' 
              : 'text-neo-black hover:bg-neo-lightgray'
          }`}
        >
          {t.name}
        </button>
      ))}
    </div>
  )
}

export default function LeaderboardPage() {
  const { hackathonId } = useParams()
  const user = useAuthState()
  const { isAdmin, isJudge } = useRoles(user, hackathonId)
  const { width, height } = useWindowSize()

  const { 
    teams, 
    tracks,
    roundsByTrack,
    bonusesByTrack,
    isFrozen,
    celebrationAt,
    updatedIds,
  } = useTeamsRealtime(hackathonId)

  const [track, setTrack] = useState('')
  const [displayTeams, setDisplayTeams] = useState(teams)
  const [showConfetti, setShowConfetti] = useState(false)

  // Initialize track
  useEffect(() => {
    if (tracks && tracks.length > 0 && !track) {
      setTrack(tracks[0].id)
    }
  }, [tracks, track])

  // Freeze functionality
  useEffect(() => {
    if (!isFrozen) {
      setDisplayTeams(teams)
    } else if (displayTeams.length === 0 && teams.length > 0) {
      setDisplayTeams(teams)
    }
  }, [teams, isFrozen, displayTeams.length])

  // Celebration functionality
  useEffect(() => {
    if (celebrationAt) {
      const timeDiff = Date.now() - celebrationAt
      if (timeDiff < 15000) {
        setShowConfetti(true)
        const timer = setTimeout(() => setShowConfetti(false), 15000 - timeDiff)
        return () => clearTimeout(timer)
      }
    }
  }, [celebrationAt])



  const filteredTeams = useMemo(() => {
    return displayTeams.filter(t => t.track === track)
  }, [displayTeams, track])

  const roundNames = roundsByTrack?.[track] || []
  const bonusNames = bonusesByTrack?.[track] || []

  let backUrl = "/"
  if (user) {
    if (isAdmin) backUrl = `/${hackathonId}/admin`
    else if (isJudge) backUrl = `/${hackathonId}/judge`
    else backUrl = "/dashboard"
  }

  return (
    <div className="min-h-screen bg-neo-white text-neo-black font-base relative overflow-hidden flex flex-col">
      {showConfetti && (
        <div className="fixed inset-0 z-[100] pointer-events-none">
          <Confetti width={width} height={height} numberOfPieces={300} gravity={0.15} />
        </div>
      )}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(17,17,17,0.05)_2px,transparent_2px),linear-gradient(90deg,rgba(17,17,17,0.05)_2px,transparent_2px)] bg-[size:32px_32px] pointer-events-none"></div>

      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 relative z-10 flex flex-col">
        {/* Header Block */}
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-neo-black pb-8">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <Link to={backUrl} className="bg-white border-4 border-neo-black px-3 py-1 font-black text-xs uppercase tracking-[0.2em] hover:bg-neo-yellow transition-colors shadow-brutal-sm flex items-center gap-2">
                &larr; BACK
              </Link>
              {!isFrozen && <LiveIndicator />}
              {isFrozen && (
                <div className="bg-cyan-300 border-4 border-neo-black px-4 py-2 font-black text-xs uppercase tracking-[0.2em] shadow-[4px_4px_0_#111] animate-pulse">
                  ❄ LEADERBOARD FROZEN
                </div>
              )}
            </div>
            
            <h1 className="font-hero text-[4rem] sm:text-[5rem] lg:text-[7rem] tracking-tight uppercase leading-[0.85] text-neo-black">
              <span className="block">GLOBAL</span>
              <span className="inline-block bg-neo-yellow border-[4px] sm:border-[6px] border-neo-black px-4 sm:px-6 my-2 shadow-[8px_8px_0_#111] -rotate-1">
                RANKS
              </span>
            </h1>
          </div>

          <div className="flex flex-col gap-4 items-start md:items-end w-full md:w-auto">
             <CategoryTabs current={track} onChange={setTrack} tracks={tracks} />
             <div className="border-4 border-neo-black bg-white px-4 py-2 font-black text-xs uppercase tracking-[0.2em] shadow-[4px_4px_0_#111] flex items-center gap-3 w-full md:w-auto justify-center">
                <span>TOTAL TEAMS:</span>
                <span className="text-neo-yellow text-xl drop-shadow-[1px_1px_0_#111]">{filteredTeams.length}</span>
             </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1">
          {filteredTeams.length === 0 ? (
            <div className="border-4 border-dashed border-neo-black p-16 text-center bg-white/50 shadow-[12px_12px_0_#111]">
               <div className="w-20 h-20 mx-auto bg-neo-lightgray border-4 border-neo-black rounded-full flex items-center justify-center mb-6">
                 <span className="text-3xl">📡</span>
               </div>
               <h3 className="font-hero text-4xl mb-2">NO SIGNALS DETECTED</h3>
               <p className="font-black text-xs uppercase tracking-widest text-gray-500">Awaiting team data for {track} track...</p>
            </div>
          ) : (
            <LeaderboardTable 
              teams={filteredTeams} 
              roundNames={roundNames} 
              bonusNames={bonusNames}
              updatedIds={updatedIds}
            />
          )}
        </div>
      </main>

      {/* Footer Banner */}
      <div className="border-t-4 border-neo-black bg-neo-black py-3 mt-12 relative z-20">
         <div className="flex justify-between items-center px-6 max-w-[1400px] mx-auto">
           <div className="font-black text-[10px] text-neo-white uppercase tracking-[0.3em]">
             SYS.OP.NORMAL // SECURE CONNECTION
           </div>
           <div className="flex gap-2">
             <div className="w-3 h-3 border-2 border-neo-white bg-neo-yellow rounded-full"></div>
             <div className="w-3 h-3 border-2 border-neo-white bg-green-400 rounded-full"></div>
           </div>
         </div>
      </div>
    </div>
  )
}
