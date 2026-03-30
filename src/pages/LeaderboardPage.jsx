import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Confetti from 'react-confetti'
import { useWindowSize } from 'react-use'
import LiveIndicator from '../components/LiveIndicator.jsx'
import LeaderboardTable from '../components/LeaderboardTable.jsx'
import useTeamsRealtime from '../hooks/useTeamsRealtime.js'
import { firebaseEnabled } from '../lib/firebase.js'

const MotionDiv = motion.div

export default function LeaderboardPage() {
  const { width, height } = useWindowSize()
  const { teams, roundNamesSoftware, roundNamesHardware, bonusNamesSoftware, bonusNamesHardware, isFrozen, celebrationAt, updatedIds, lastUpdateAt } = useTeamsRealtime()

  const [activeTrack, setActiveTrack] = useState('software')
  const [showConfetti, setShowConfetti] = useState(false)
  useEffect(() => {
    if (!celebrationAt) return
    const now = Date.now()
    if (now - celebrationAt < 10000) {
      setShowConfetti(true)
      const t = setTimeout(() => setShowConfetti(false), 10000 - (now - celebrationAt))
      return () => clearTimeout(t)
    } else {
      setShowConfetti(false)
    }
  }, [celebrationAt])

  return (
    <div className="min-h-screen relative overflow-x-clip text-zinc-100">
      {showConfetti && (
        <Confetti 
          width={width} 
          height={height} 
          recycle={false}
          numberOfPieces={800}
          gravity={0.15}
          initialVelocityY={20}
          colors={['#FF003C', '#00F0FF', '#FF00A0', '#FF4D00', '#111111', '#FFFFFF']}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, pointerEvents: 'none' }}
        />
      )}
      {/* Decorative Glitch Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gwen-pink/20 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gwen-cyan/20 rounded-full mix-blend-screen filter blur-[120px] pointer-events-none"></div>
      
      <MotionDiv
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="mx-auto max-w-6xl px-4 py-10 relative z-10"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-12">
          <div className="relative">
            {/* Themed decorative accent */}
            <div className="absolute -left-4 top-0 w-1 h-full bg-spidey-red shadow-comic-red"></div>
            
            <div className="text-sm font-bold uppercase tracking-[0.4em] text-gwen-cyan mb-2">
              Droid Club
            </div>
            <h1 
              data-text="CODEPUNK V2.0 LEADERBOARD"
              className="font-hero text-5xl md:text-7xl font-bold tracking-wider text-white text-glitch uppercase drop-shadow-[4px_4px_0_rgba(0,0,0,1)]"
            >
              CodePunk v2.0 Leaderboard
            </h1>
            <p className="mt-3 max-w-2xl text-base font-medium text-zinc-300 bg-zinc-950/80 inline-block px-3 py-1 border-l-2 border-gwen-pink backdrop-blur-sm shadow-comic">
              Scores update in real time. Rankings auto-sort by total marks.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 md:justify-end">
            <LiveIndicator lastUpdateAt={lastUpdateAt} />
            <Link
              to="/judge"
              className="font-hero text-xl rounded-none border-2 border-zinc-900 bg-spidey-blue hover:bg-gwen-pink px-6 py-2 uppercase tracking-widest text-zinc-900 transition-all shadow-comic hover:-translate-y-1 hover:-translate-x-1 hover:shadow-comic-cyan"
            >
              Judge Portal
            </Link>
            <Link
              to="/admin"
              className="font-hero text-xl rounded-none border-2 border-zinc-900 bg-gwen-cyan hover:bg-gwen-pink px-6 py-2 uppercase tracking-widest text-zinc-900 transition-all shadow-comic hover:-translate-y-1 hover:-translate-x-1 hover:shadow-comic-cyan"
            >
              Admin Portal
            </Link>
          </div>
        </div>

        {!firebaseEnabled ? (
          <div className="mt-8 relative overflow-hidden rounded-none border-4 border-spidey-blue bg-zinc-900 p-6 text-base font-bold text-white shadow-comic-cyan">
            <div className="absolute top-0 right-0 w-16 h-16 bg-spidey-red rotate-45 translate-x-8 -translate-y-8"></div>
            WARNING: Firebase is not configured! Add your `VITE_FIREBASE_*` env vars, then restart.
          </div>
        ) : null}

        <div className="flex gap-4 justify-center mt-6">
          <button 
            onClick={() => setActiveTrack('software')} 
            className={`px-8 py-3 font-hero text-3xl border-4 transition-all uppercase tracking-widest ${activeTrack==='software' ? 'bg-gwen-cyan text-zinc-900 border-gwen-cyan scale-105 shadow-comic-cyan z-10' : 'bg-transparent text-zinc-400 border-zinc-700 shadow-comic hover:border-zinc-500'}`}
          >
            SOFTWARE
          </button>
          <button 
            onClick={() => setActiveTrack('hardware')} 
            className={`px-8 py-3 font-hero text-3xl border-4 transition-all uppercase tracking-widest ${activeTrack==='hardware' ? 'bg-2099-orange text-zinc-900 border-2099-orange scale-105 shadow-comic z-10' : 'bg-transparent text-zinc-400 border-zinc-700 shadow-comic hover:border-zinc-500'}`}
          >
            HARDWARE
          </button>
        </div>

        <div className="mt-8 relative">
          {isFrozen && (
            <div className="absolute inset-0 z-50 backdrop-blur-xl bg-zinc-950/60 flex items-center justify-center p-8 border-4 border-gwen-pink shadow-comic-pink">
              <div className="text-center">
                <h2 className="font-hero text-6xl md:text-8xl text-white tracking-widest text-glitch uppercase drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">
                  Final Results Pending
                </h2>
                <div className="mt-4 inline-block bg-spidey-blue text-white px-6 py-3 font-hero text-3xl tracking-widest shadow-[4px_4px_0_#111] animate-pulse">
                  Stand by for the ultimate reveal...
                </div>
              </div>
            </div>
          )}
          
          <div className={`max-w-full ${isFrozen ? 'opacity-30 pointer-events-none' : ''}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTrack}
                initial={{ opacity: 0, x: activeTrack === 'hardware' ? 50 : -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: activeTrack === 'hardware' ? -50 : 50 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <LeaderboardTable 
                  teams={teams.filter(t => t.track === activeTrack)} 
                  roundNames={activeTrack === 'hardware' ? roundNamesHardware : roundNamesSoftware} 
                  bonusNames={activeTrack === 'hardware' ? bonusNamesHardware : bonusNamesSoftware}
                  updatedIds={updatedIds} 
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-10 inline-block font-hero text-xl bg-zinc-900 border-2 border-zinc-800 text-gwen-cyan px-4 py-2 shadow-comic skew-x-[-2deg]">
          Total = {[
            ...(activeTrack === 'hardware' ? roundNamesHardware : roundNamesSoftware),
            ...(activeTrack === 'hardware' ? bonusNamesHardware : bonusNamesSoftware)
          ].join(' + ')}
        </div>
      </MotionDiv>
    </div>
  )
}
