import { AnimatePresence, motion } from 'framer-motion'

const MotionDiv = motion.div

function MedalEmoji({ rank }) {
  if (rank === 1) return <span className="text-2xl sm:text-3xl md:text-4xl leading-none">🏆</span>
  if (rank === 2) return <span className="text-2xl sm:text-3xl md:text-4xl leading-none">🥈</span>
  if (rank === 3) return <span className="text-2xl sm:text-3xl md:text-4xl leading-none">🥉</span>
  return null
}

function getOrdinalRank(rank) {
  if (rank === 1) return '1st'
  if (rank === 2) return '2nd'
  if (rank === 3) return '3rd'
  return `${rank}th`
}

function rowBg(rank) {
  if (rank === 1) return 'bg-neo-yellow border-neo-black text-neo-black z-30 shadow-[6px_6px_0_#111]'
  if (rank === 2) return 'bg-white border-neo-black text-neo-black z-20 shadow-[4px_4px_0_#111]'
  if (rank === 3) return 'bg-neo-lightgray border-neo-black text-neo-black z-10 shadow-[4px_4px_0_#111]'
  return 'bg-white border-neo-black text-zinc-500 hover:text-neo-black hover:-translate-y-1 hover:shadow-brutal transition-all shadow-[2px_2px_0_#111]'
}

function textTone(rank) {
  if (rank <= 3) return 'text-neo-black font-black'
  return 'text-neo-black font-bold'
}

function scoreTone(rank) {
  if (rank <= 3) return 'text-neo-black font-black'
  return 'text-neo-black font-bold'
}

function labelTone(rank) {
  if (rank <= 3) return 'text-zinc-600 font-bold'
  return 'text-gray-500 font-bold'
}

function chipBg(rank) {
  if (rank === 1) return 'bg-white border-2 border-neo-black'
  if (rank <= 3) return 'bg-neo-white border-2 border-neo-black'
  return 'bg-neo-white border-2 border-neo-black/20'
}

export default function LeaderboardTable({ teams, roundNames = [], bonusNames = [], updatedIds }) {
  const totalColumns = roundNames.length + bonusNames.length

  // Desktop grid
  const desktopGridStyle = {
    display: 'grid',
    gridTemplateColumns: `90px minmax(200px, 1fr) repeat(${totalColumns}, minmax(90px, 1fr)) 110px`,
    alignItems: 'center'
  }

  let currentRank = 1
  const ranks = teams.map((team, index) => {
    if (index > 0 && team.total < teams[index - 1].total) {
      currentRank += 1
    }
    return currentRank
  })

  return (
    <div>
      {/* ========= DESKTOP VIEW (>=768px) ========= */}
      <div className="hidden md:block overflow-hidden pb-8">
        <div className="overflow-x-auto overflow-y-hidden scrollbar-thin pb-4">
          <div style={{ minWidth: `${700 + totalColumns * 100}px` }}>
            {/* Header */}
            <div
              style={desktopGridStyle}
              className="gap-4 mb-4 px-6 py-4 font-black text-sm lg:text-base tracking-[0.2em] text-neo-white bg-neo-black border-4 border-neo-black shadow-[6px_6px_0_#FFD600]"
            >
              <div>RANK</div>
              <div>TEAM DESIGNATION</div>
              {roundNames.map((r, i) => (
                <div key={i} className="text-right uppercase">{r}</div>
              ))}
              {bonusNames.map((b, i) => (
                <div key={`hb_${i}`} className="text-right uppercase">{b}</div>
              ))}
              <div className="text-right text-neo-yellow">TOTAL</div>
            </div>

            {/* Rows */}
            <MotionDiv layout className="flex flex-col gap-4">
              <AnimatePresence initial={false}>
                {teams.map((team, index) => {
                  const rank = ranks[index]
                  const isUpdated = updatedIds?.has?.(team.id)

                  return (
                    <MotionDiv
                      layout
                      key={team.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{
                        opacity: 1, x: 0,
                        scale: isUpdated ? 1.02 : 1,
                        zIndex: isUpdated ? 50 : (40 - rank)
                      }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      style={desktopGridStyle}
                      className={[
                        'gap-4 px-6 py-4 border-4 relative',
                        rowBg(rank),
                        isUpdated ? 'ring-4 ring-neo-yellow' : '',
                      ].join(' ')}
                    >
                      <div className={`font-hero text-3xl lg:text-4xl ${textTone(rank)}`}>
                        <motion.span
                          key={rank}
                          initial={{ scale: 1.5, y: -10 }}
                          animate={{ scale: 1, y: 0 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                          className="tabular-nums inline-block"
                        >
                          {getOrdinalRank(rank)}
                        </motion.span>
                      </div>

                      <div className="min-w-0 pr-4 flex items-center gap-3">
                        <MedalEmoji rank={rank} />
                        <div className={`font-hero tracking-wide text-3xl lg:text-4xl break-words leading-tight ${textTone(rank)}`}>
                          {team.name}
                        </div>
                      </div>

                      {roundNames.map((r, i) => {
                        let val = team.scores?.[r]
                        if (val && typeof val === 'object' && val.total === undefined) {
                           const vals = Object.values(val)
                           if (vals.length > 0) val = vals[0]
                        }
                        const score = (val && typeof val === 'object') ? (val.total ?? 0) : (val ?? 0)
                        return (
                          <div key={i} className={`text-right font-hero text-3xl lg:text-4xl tabular-nums ${textTone(rank)}`}>
                            <motion.span
                              key={"R_" + score}
                              initial={{ scale: 1.5 }}
                              animate={{ scale: 1 }}
                              className="inline-block"
                            >
                              {score}
                            </motion.span>
                          </div>
                        )
                      })}

                      {bonusNames.map((b, i) => (
                        <div key={`db_${i}`} className={`text-right font-hero text-3xl lg:text-4xl tabular-nums ${textTone(rank)}`}>
                          <motion.span
                            key={`B_${b}_${team.bonuses?.[b] || 0}`}
                            initial={{ scale: 1.5 }}
                            animate={{ scale: 1 }}
                            className="inline-block"
                          >
                            {team.bonuses?.[b] || 0}
                          </motion.span>
                        </div>
                      ))}

                      <div className={`text-right font-hero text-4xl lg:text-5xl tabular-nums ${scoreTone(rank)}`}>
                        <motion.span
                          key={team.total}
                          initial={{ scale: 1.5 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400 }}
                          className={`inline-block ${rank === 1 ? 'bg-white px-2 border-4 border-neo-black shadow-[4px_4px_0_#111] -rotate-2' : ''}`}
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
      </div>

      {/* ========= MOBILE VIEW (<768px) ========= */}
      <div className="md:hidden flex flex-col gap-4 pb-8">
        <AnimatePresence initial={false}>
          {teams.map((team, index) => {
            const rank = ranks[index]
            const isUpdated = updatedIds?.has?.(team.id)

            return (
              <MotionDiv
                layout
                key={team.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{
                  opacity: 1, y: 0,
                  scale: isUpdated ? 1.02 : 1,
                  zIndex: isUpdated ? 50 : (40 - rank)
                }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={[
                  'border-4 relative transition-colors',
                  rowBg(rank),
                  isUpdated ? 'ring-4 ring-neo-yellow' : '',
                ].join(' ')}
              >
                {/* Main Row: Rank | Name | Total */}
                <div className="flex items-center px-4 py-4 gap-3">
                  {/* Rank */}
                  <div className={`font-hero text-3xl tabular-nums flex-shrink-0 ${textTone(rank)}`}>
                    {getOrdinalRank(rank)}
                  </div>

                  {/* Team Name */}
                  <div className={`flex-1 min-w-0 flex items-center gap-2 font-hero text-xl sm:text-2xl ${textTone(rank)}`}>
                    <div className="flex-shrink-0 flex items-center">
                      <MedalEmoji rank={rank} />
                    </div>
                    <span className="min-w-0 break-words leading-tight">{team.name}</span>
                  </div>

                  {/* Total Score */}
                  <div className="flex-shrink-0 flex items-baseline gap-1">
                    <motion.span
                      key={team.total}
                      initial={{ scale: 1.4 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400 }}
                      className={`font-hero text-3xl sm:text-4xl tabular-nums inline-block ${scoreTone(rank)} ${rank === 1 ? 'bg-white px-2 border-2 border-neo-black shadow-[2px_2px_0_#111] -rotate-2' : ''}`}
                    >
                      {team.total}
                    </motion.span>
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${labelTone(rank)}`}>pts</span>
                  </div>
                </div>

                {/* Scores Row - inline chips */}
                {(roundNames.length > 0 || bonusNames.length > 0) && (
                  <div className="flex flex-wrap gap-2 px-4 pb-4">
                    {roundNames.map((r, i) => {
                      let val = team.scores?.[r]
                      if (val && typeof val === 'object' && val.total === undefined) {
                         const vals = Object.values(val)
                         if (vals.length > 0) val = vals[0]
                      }
                      const score = (val && typeof val === 'object') ? (val.total ?? 0) : (val ?? 0)
                      return (
                        <div key={i} className={`${chipBg(rank)} px-2 py-1 flex items-center gap-2`}>
                          <span className={`text-[10px] uppercase tracking-widest ${labelTone(rank)}`}>{r}</span>
                          <motion.span
                            key={"R_" + score}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            className={`font-hero text-lg tabular-nums inline-block ${textTone(rank)}`}
                          >
                            {score}
                          </motion.span>
                        </div>
                      )
                    })}
                    {bonusNames.map((b, i) => (
                      <div key={`mb_${i}`} className={`${chipBg(rank)} px-2 py-1 flex items-center gap-2`}>
                        <span className={`text-[10px] uppercase tracking-widest ${labelTone(rank)}`}>{b}</span>
                        <motion.span
                          key={`B_${b}_${team.bonuses?.[b] || 0}`}
                          initial={{ scale: 1.2 }}
                          animate={{ scale: 1 }}
                          className={`font-hero text-lg tabular-nums inline-block ${textTone(rank)}`}
                        >
                          {team.bonuses?.[b] || 0}
                        </motion.span>
                      </div>
                    ))}
                  </div>
                )}
              </MotionDiv>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
