import { AnimatePresence, motion } from 'framer-motion'

const MotionDiv = motion.div

function MedalEmoji({ rank }) {
  if (rank === 1) return <span className="text-2xl sm:text-3xl md:text-4xl leading-none">🥇</span>
  if (rank === 2) return <span className="text-2xl sm:text-3xl md:text-4xl leading-none">🥈</span>
  if (rank === 3) return <span className="text-2xl sm:text-3xl md:text-4xl leading-none">🥉</span>
  return null
}

function rowBg(rank) {
  if (rank === 1) return 'bg-gradient-to-r from-spidey-red to-spidey-red/90 border-spidey-red text-zinc-950'
  if (rank === 2) return 'bg-gradient-to-r from-gwen-cyan to-gwen-cyan/90 border-gwen-cyan text-zinc-900'
  if (rank === 3) return 'bg-gradient-to-r from-2099-orange to-2099-orange/90 border-2099-orange text-zinc-900'
  return 'bg-zinc-900/90 border-zinc-700 text-zinc-200 hover:border-gwen-pink/60'
}

function textTone(rank) {
  if (rank <= 3) return 'text-zinc-950 font-bold'
  return 'text-zinc-100'
}

function scoreTone(rank) {
  if (rank <= 3) return 'text-zinc-950 font-black'
  return 'text-gwen-cyan font-bold'
}

function labelTone(rank) {
  if (rank <= 3) return 'text-zinc-950/50'
  return 'text-zinc-500'
}

function chipBg(rank) {
  if (rank <= 3) return 'bg-black/15'
  return 'bg-zinc-800/80'
}

export default function LeaderboardTable({ teams, roundNames = [], bonusNames = [], updatedIds }) {
  const totalColumns = roundNames.length + bonusNames.length

  // Desktop grid
  const desktopGridStyle = {
    display: 'grid',
    gridTemplateColumns: `80px minmax(200px, 1fr) repeat(${totalColumns}, minmax(90px, 1fr)) 110px`,
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
      <div className="hidden md:block border-4 border-zinc-800 bg-zinc-950/50 overflow-hidden">
        <div className="overflow-x-auto overflow-y-hidden scrollbar-thin pb-2">
          <div style={{ minWidth: `${700 + totalColumns * 100}px` }}>
            {/* Header */}
            <div
              style={desktopGridStyle}
              className="gap-2 mb-3 px-4 py-3 font-hero text-xl lg:text-2xl tracking-[0.1em] text-white bg-spidey-blue border-4 border-zinc-950 shadow-comic skew-x-[-2deg]"
            >
              <div>RANK</div>
              <div>TEAM NAME</div>
              {roundNames.map((r, i) => (
                <div key={i} className="text-right uppercase">{r}</div>
              ))}
              {bonusNames.map((b, i) => (
                <div key={`hb_${i}`} className="text-right uppercase">{b}</div>
              ))}
              <div className="text-right">TOTAL</div>
            </div>

            {/* Rows */}
            <MotionDiv layout className="flex flex-col gap-3">
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
                        opacity: 1, x: 0, skewX: -2,
                        scale: isUpdated ? 1.02 : 1,
                        zIndex: isUpdated ? 10 : 1
                      }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      style={desktopGridStyle}
                      className={[
                        'gap-2 px-4 py-3 border-4 relative shadow-comic',
                        rowBg(rank),
                        isUpdated ? 'ring-4 ring-white shadow-comic-pink' : '',
                      ].join(' ')}
                    >
                      <div className={`flex items-center gap-1 font-hero text-2xl lg:text-3xl ${textTone(rank)}`}>
                        <motion.span
                          key={rank}
                          initial={{ scale: 1.5, y: -10, color: '#00F0FF' }}
                          animate={{ scale: 1, y: 0, color: '' }}
                          transition={{ type: 'spring', stiffness: 300 }}
                          className="tabular-nums inline-block"
                        >
                          #{rank}
                        </motion.span>
                        <MedalEmoji rank={rank} />
                      </div>

                      <div className="min-w-0 pr-4">
                        <div className={`truncate font-hero tracking-wide text-2xl lg:text-3xl ${textTone(rank)}`}>
                          {team.name}
                        </div>
                      </div>

                      {roundNames.map((r, i) => (
                        <div key={i} className={`text-right font-hero text-2xl lg:text-3xl tabular-nums ${textTone(rank)}`}>
                          <motion.span
                            key={"R_" + (team.scores_avg?.[r] || 0)}
                            initial={{ scale: 1.5, color: '#FF00A0' }}
                            animate={{ scale: 1, color: '' }}
                            className="inline-block"
                          >
                            {team.scores_avg?.[r] || 0}
                          </motion.span>
                        </div>
                      ))}

                      {bonusNames.map((b, i) => (
                        <div key={`db_${i}`} className={`text-right font-hero text-2xl lg:text-3xl tabular-nums ${textTone(rank)}`}>
                          <motion.span
                            key={`B_${b}_${team.bonuses?.[b] || 0}`}
                            initial={{ scale: 1.5, color: '#FF00A0' }}
                            animate={{ scale: 1, color: '' }}
                            className="inline-block"
                          >
                            {team.bonuses?.[b] || 0}
                          </motion.span>
                        </div>
                      ))}

                      <div className={`text-right font-hero text-3xl lg:text-4xl tabular-nums ${scoreTone(rank)} drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]`}>
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
      </div>

      {/* ========= MOBILE VIEW (<768px) ========= */}
      <div className="md:hidden flex flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {teams.map((team, index) => {
            const rank = ranks[index]
            const isUpdated = updatedIds?.has?.(team.id)
            const isTop3 = rank <= 3

            return (
              <MotionDiv
                layout
                key={team.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{
                  opacity: 1, y: 0,
                  scale: isUpdated ? 1.02 : 1,
                }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={[
                  'border-2 rounded-sm overflow-hidden transition-colors',
                  rowBg(rank),
                  isUpdated ? 'ring-2 ring-white' : '',
                ].join(' ')}
              >
                {/* Main Row: Rank | Name | Total */}
                <div className="flex items-center px-3 py-2.5 gap-2.5">
                  {/* Rank + Trophy */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`font-hero text-2xl tabular-nums ${textTone(rank)}`}>#{rank}</span>
                    <MedalEmoji rank={rank} />
                  </div>

                  {/* Team Name */}
                  <div className={`flex-1 min-w-0 font-hero text-xl truncate ${textTone(rank)}`}>
                    {team.name}
                  </div>

                  {/* Total Score */}
                  <div className="flex-shrink-0 flex items-baseline gap-1">
                    <motion.span
                      key={team.total}
                      initial={{ scale: 1.4, color: '#fff' }}
                      animate={{ scale: 1, color: '' }}
                      transition={{ type: 'spring', stiffness: 400 }}
                      className={`font-hero text-3xl tabular-nums inline-block ${scoreTone(rank)}`}
                    >
                      {team.total}
                    </motion.span>
                    <span className={`text-[10px] font-bold uppercase ${labelTone(rank)}`}>pts</span>
                  </div>
                </div>

                {/* Scores Row - inline chips */}
                {(roundNames.length > 0 || bonusNames.length > 0) && (
                  <div className={`flex flex-wrap gap-1.5 px-3 pb-2.5 ${isTop3 ? '' : ''}`}>
                    {roundNames.map((r, i) => (
                      <div key={i} className={`${chipBg(rank)} px-2 py-0.5 flex items-center gap-1.5 rounded-sm`}>
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${labelTone(rank)}`}>{r}</span>
                        <motion.span
                          key={"R_" + (team.scores_avg?.[r] || 0)}
                          initial={{ scale: 1.2, color: '#FF00A0' }}
                          animate={{ scale: 1, color: '' }}
                          className={`font-hero text-sm tabular-nums inline-block ${textTone(rank)}`}
                        >
                          {team.scores_avg?.[r] || 0}
                        </motion.span>
                      </div>
                    ))}
                    {bonusNames.map((b, i) => (
                      <div key={`mb_${i}`} className={`${chipBg(rank)} px-2 py-0.5 flex items-center gap-1.5 rounded-sm`}>
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${labelTone(rank)}`}>{b}</span>
                        <motion.span
                          key={`B_${b}_${team.bonuses?.[b] || 0}`}
                          initial={{ scale: 1.2, color: '#FF00A0' }}
                          animate={{ scale: 1, color: '' }}
                          className={`font-hero text-sm tabular-nums inline-block ${textTone(rank)}`}
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
