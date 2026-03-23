import { AnimatePresence, motion } from 'framer-motion'
import { Trophy } from 'lucide-react'

const MotionDiv = motion.div

function Medal({ rank }) {
  if (rank === 1) return <Trophy className="h-6 w-6 text-zinc-950 fill-zinc-950" />
  if (rank === 2) return <Trophy className="h-6 w-6 text-zinc-900 fill-zinc-900" />
  if (rank === 3) return <Trophy className="h-6 w-6 text-zinc-900 fill-zinc-900" />
  return null
}

function rowTone(rank) {
  if (rank === 1) return 'border-spidey-red bg-spidey-red text-zinc-950 shadow-comic'
  if (rank === 2) return 'border-gwen-cyan bg-gwen-cyan text-zinc-900 shadow-comic'
  if (rank === 3) return 'border-2099-orange bg-2099-orange text-zinc-900 shadow-comic'
  return 'border-zinc-800 bg-zinc-900/90 text-zinc-200 border-4 hover:border-gwen-pink transition-colors'
}

function textTone(rank) {
  if (rank <= 3) return 'text-zinc-950 font-bold'
  return 'text-zinc-100'
}

function subTextTone(rank) {
  if (rank <= 3) return 'text-zinc-900 font-bold'
  return 'text-zinc-400'
}

function scoreTone(rank) {
  if (rank <= 3) return 'text-zinc-950 font-black'
  return 'text-gwen-cyan font-bold'
}

export default function LeaderboardTable({ teams, roundNames = [], updatedIds }) {
  const dynamicGridStyles = {
    display: 'grid',
    gridTemplateColumns: `80px minmax(250px, 1fr) repeat(${roundNames.length}, minmax(100px, 1fr)) 120px`,
    alignItems: 'center'
  }

  let currentRank = 1;
  const ranks = teams.map((team, index) => {
    if (index > 0 && team.total < teams[index - 1].total) {
      currentRank += 1;
    }
    return currentRank;
  });

  return (
    <div className="overflow-x-auto scrollbar-thin pb-4">
      <div className="min-w-[860px]">
        <div 
          style={dynamicGridStyles}
          className="gap-2 mb-4 px-4 py-3 font-hero text-2xl tracking-[0.1em] text-white bg-spidey-blue border-4 border-zinc-950 shadow-comic skew-x-[-2deg]"
        >
          <div>RANK</div>
          <div>TEAM NAME</div>
          {roundNames.map((r, i) => (
            <div key={i} className="text-right uppercase">{r}</div>
          ))}
          <div className="text-right">TOTAL</div>
        </div>

        <MotionDiv layout className="flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {teams.map((team, index) => {
              const rank = ranks[index]
              const isUpdated = updatedIds?.has?.(team.id)

              return (
                <MotionDiv
                  layout
                  key={team.id}
                  initial={{ opacity: 0, x: -20, skewX: -10 }}
                  animate={{ 
                    opacity: 1, 
                    x: 0, 
                    skewX: -2,
                    scale: isUpdated ? 1.02 : 1,
                    zIndex: isUpdated ? 10 : 1
                  }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  style={dynamicGridStyles}
                  className={[
                    'gap-2 px-4 py-4 border-4 relative',
                    rowTone(rank),
                    isUpdated ? 'ring-4 ring-white shadow-comic-pink' : '',
                  ].join(' ')}
                >
                  <div className={`flex items-center gap-2 font-hero text-3xl ${textTone(rank)}`}>
                    <motion.span 
                      key={rank}
                      initial={{ scale: 1.5, y: -10, color: '#00F0FF' }}
                      animate={{ scale: 1, y: 0, color: '' }}
                      transition={{ type: 'spring', stiffness: 300 }}
                      className="tabular-nums inline-block"
                    >
                      #{rank}
                    </motion.span>
                    <Medal rank={rank} />
                  </div>

                  <div className="min-w-0 pr-4">
                    <div className={`truncate font-hero tracking-wide text-3xl ${textTone(rank)}`}>
                      {team.name}
                    </div>
                    <div className={`mt-0.5 text-sm uppercase font-bold tracking-wider ${subTextTone(rank)}`}>
                      CodePunk v2.0
                    </div>
                  </div>

                  {roundNames.map((r, i) => (
                    <div key={i} className={`text-right font-hero text-3xl tabular-nums ${textTone(rank)}`}>
                      <motion.span
                        key={team.scores?.[r] || 0}
                        initial={{ scale: 1.5, color: '#FF00A0' }}
                        animate={{ scale: 1, color: '' }}
                        className="inline-block"
                      >
                        {team.scores?.[r] || 0}
                      </motion.span>
                    </div>
                  ))}

                  <div className={`text-right font-hero text-4xl tabular-nums ${scoreTone(rank)} drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]`}>
                    <motion.span
                      key={team.total}
                      initial={{ scale: 1.5, color: '#fff' }}
                      animate={{ scale: 1, color: '' }}
                      transition={{ type: 'spring', stiffness: 400 }}
                      className="inline-block"
                    >
                      {team.total}
                    </motion.span>
                  </div>
                </MotionDiv>
              )
            })}
          </AnimatePresence>
        </MotionDiv>
      </div>
    </div>
  )
}
