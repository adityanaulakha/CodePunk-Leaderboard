import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { auth } from '../lib/firebase.js'
import { signOut } from 'firebase/auth'

export default function LandingPage() {
  const [user, setUser] = useState(undefined)
  
  useEffect(() => {
    if (!auth) return undefined
    const unsub = auth.onAuthStateChanged((u) => setUser(u))
    return () => unsub()
  }, [])

  const marqueeItems = [
    "REAL-TIME SCORING",
    "NO MORE EXCUSES",
    "TRANSPARENT RANKS",
    "COMPETITION REDEFINED",
    "REAL-TIME SCORING",
    "NO MORE EXCUSES",
    "TRANSPARENT RANKS",
    "COMPETITION REDEFINED",
  ]

  const trustedBy = [
    "TECH CRUNCH DISRUPT", "MIT HACKATHON", "DEFCON", "MAJOR LEAGUE HACKING", "STANFORD WEB3", "Y COMBINATOR"
  ]

  const testimonials = [
    { name: "Sarah J.", role: "Lead Organizer, HackTheNorth", text: "LeadX completely removed the chaos of judging. Our mentors just opened the link and started grading. No spreadsheets, zero panic." },
    { name: "Dr. Alan T.", role: "Head of CS, Stanford", text: "The suspense mode where the leaderboard freezes during final evaluations... brilliant. It made our closing ceremony incredibly hype." },
    { name: "Mark V.", role: "Director, BuildSpace", text: "Finally, a platform that doesn't look like it was built in 2005. LeadX is fast, brutal, and does exactly what it promises." }
  ]

  const fadeUp = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  }

  return (
    <div className="min-h-screen bg-neo-white flex flex-col font-base text-neo-black overflow-x-hidden selection:bg-neo-yellow selection:text-neo-black">
      
      {/* Navigation */}
      <nav className="w-full flex items-center justify-between px-6 py-4 border-b-4 border-neo-black bg-neo-white z-50 fixed top-0">
        <div className="font-hero text-2xl lg:text-3xl font-black tracking-widest flex items-center gap-2 relative z-10 hover:scale-105 transition-transform cursor-pointer">
          <img src="/Lead-X.png" alt="LeadX Logo" className="h-12 lg:h-16 drop-shadow-[2px_2px_0_#111]" />
        </div>
        <div className="flex items-center gap-4 lg:gap-8 relative z-10">
          {user ? (
            <>
              <button onClick={() => signOut(auth)} className="font-black text-sm lg:text-base uppercase tracking-widest hover:text-neo-red transition-colors hidden sm:block">
                SIGN OUT
              </button>
              <Link 
                to="/dashboard" 
                className="font-black text-sm lg:text-base uppercase tracking-widest bg-neo-yellow border-4 border-neo-black px-6 py-2 shadow-[4px_4px_0_#111] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2"
              >
                DASHBOARD
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="font-black text-sm lg:text-base uppercase tracking-widest hover:underline underline-offset-8 transition-all hidden sm:block">
                LOG IN
              </Link>
              <Link 
                to="/login" 
                className="font-black text-sm lg:text-base uppercase tracking-widest bg-neo-yellow border-4 border-neo-black px-6 py-2 shadow-[4px_4px_0_#111] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2"
              >
                GET STARTED
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-start text-center px-4 pt-32 lg:pt-48 pb-24 relative z-10 w-full max-w-7xl mx-auto mt-16">
        
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="flex flex-col items-center w-full relative"
        >
          {/* Decorative elements */}
          <div className="absolute top-10 -left-10 w-64 h-64 bg-neo-yellow/20 rounded-full blur-3xl pointer-events-none -z-10"></div>
          <div className="absolute bottom-10 -right-10 w-64 h-64 bg-green-400/20 rounded-full blur-3xl pointer-events-none -z-10"></div>

          {/* Pill Tag */}
          <div className="border-4 border-neo-black px-5 py-2 font-black text-xs sm:text-sm uppercase tracking-[0.2em] mb-12 inline-flex items-center gap-3 bg-white shadow-[4px_4px_0_#111] hover:-translate-y-1 transition-transform">
            <div className="w-3 h-3 rounded-full border-4 border-neo-black bg-green-400 animate-pulse"></div>
            THE PREMIUM SCORING PROTOCOL
          </div>

          {/* Headline */}
          <h1 className="font-hero text-[4rem] sm:text-[6rem] lg:text-[8rem] xl:text-[9.5rem] leading-[0.85] tracking-tight uppercase text-neo-black flex flex-col items-center z-10">
            <span className="block drop-shadow-[4px_4px_0_#FFF]">COMPETITIVE</span>
            <span className="inline-block bg-neo-yellow border-[4px] sm:border-[6px] border-neo-black px-4 sm:px-8 my-2 sm:my-4 shadow-[8px_8px_0_#111] lg:shadow-[16px_16px_0_#111] -rotate-2 hover:rotate-0 transition-transform duration-300">
              SCORING
            </span>
            <span className="block drop-shadow-[4px_4px_0_#FFF]">MASTERED.</span>
          </h1>

          {/* Subheadline */}
          <div className="mt-8 lg:mt-10 max-w-3xl px-4 text-center">
            <p className="text-base sm:text-xl lg:text-2xl font-bold leading-relaxed text-zinc-700 tracking-wider">
              Never lose track of live ranks, judge evaluations, or dynamic leaderboards. Standardize your competitive events with absolute precision and raw efficiency.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="mt-16 flex flex-col sm:flex-row items-center gap-6 sm:gap-8 w-full max-w-2xl px-4">
            <Link 
              to={user ? "/dashboard" : "/login"} 
              className="w-full font-hero text-xl lg:text-3xl uppercase tracking-widest bg-neo-black text-neo-white border-4 border-neo-black py-5 shadow-[8px_8px_0_#FFD600] hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all flex items-center justify-center gap-3 relative group"
            >
              <span className="relative z-10">ORGANIZER</span>
              <div className="absolute inset-0 bg-neo-yellow scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 z-0"></div>
              <span className="relative z-10 group-hover:text-neo-black hidden sm:inline">&rarr;</span>
            </Link>
            <Link 
              to={user ? "/assignments" : "/login"} 
              className="w-full font-hero text-xl lg:text-3xl uppercase tracking-widest bg-white text-neo-black border-4 border-neo-black py-5 shadow-[8px_8px_0_#111] hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all flex items-center justify-center gap-3"
            >
              JUDGE PORTAL
            </Link>
          </div>
        </motion.div>

        {/* Product Mockup Component */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="mt-32 w-full max-w-5xl border-4 border-neo-black bg-white shadow-[16px_16px_0_#111] lg:shadow-[24px_24px_0_#111] overflow-hidden flex flex-col group hover:-translate-y-2 transition-transform duration-500"
        >
          <div className="border-b-4 border-neo-black bg-neo-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border-4 border-neo-black bg-neo-red"></div>
              <div className="w-4 h-4 rounded-full border-4 border-neo-black bg-neo-yellow"></div>
              <div className="w-4 h-4 rounded-full border-4 border-neo-black bg-green-400"></div>
            </div>
            <div className="font-mono text-xs font-black text-gray-500 uppercase tracking-widest bg-white border-2 border-neo-black px-4 py-1 shadow-[2px_2px_0_#111]">leaderboard.app/demo</div>
            <div className="w-20 hidden sm:block"></div>
          </div>
          
          <div className="p-6 sm:p-10 bg-white flex flex-col gap-6 relative min-h-[400px]">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(17,17,17,0.05)_2px,transparent_2px),linear-gradient(90deg,rgba(17,17,17,0.05)_2px,transparent_2px)] bg-[size:32px_32px] pointer-events-none"></div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-4 border-neo-black pb-4 relative z-10 gap-4">
              <div className="font-hero text-4xl sm:text-5xl text-neo-black uppercase tracking-wider drop-shadow-[2px_2px_0_#FFD600]">LIVE RANKS</div>
              <div className="bg-neo-black text-neo-white border-4 border-neo-black px-4 py-2 font-black text-sm uppercase tracking-widest shadow-[4px_4px_0_#FFD600] animate-pulse">
                ROUND 2 ACTIVE
              </div>
            </div>
            <div className="flex flex-col gap-4 flex-1 relative z-10">
              {[1, 2, 3].map((row) => (
                <div key={row} className="flex items-center justify-between p-4 sm:p-6 border-4 border-neo-black bg-neo-white hover:bg-neo-yellow hover:scale-[1.02] transition-all cursor-default">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="font-hero text-2xl sm:text-4xl text-zinc-400 w-8">0{row}</div>
                    <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full border-4 border-neo-black bg-white shadow-brutal-sm"></div>
                    <div className="font-hero text-xl sm:text-3xl uppercase tracking-widest text-neo-black">TEAM EPSILON {row}</div>
                  </div>
                  <div className="font-mono font-black text-lg sm:text-2xl tracking-tighter bg-neo-black text-white px-3 py-1 shadow-[4px_4px_0_#FFF] border-2 border-neo-black">{2500 - (row * 350)}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </main>

      {/* Trusted By Section */}
      <section className="w-full bg-white border-y-4 border-neo-black py-16 overflow-hidden">
        <div className="text-center font-black uppercase tracking-[0.2em] text-gray-500 mb-8 text-sm">Empowering elite hackathons worldwide</div>
        <div className="w-full relative flex opacity-70">
          <div className="flex whitespace-nowrap animate-marquee items-center">
            {[...trustedBy, ...trustedBy].map((item, i) => (
              <span key={i} className="font-hero text-3xl lg:text-5xl uppercase tracking-widest px-12 text-neo-black mx-8">{item}</span>
            ))}
          </div>
          <div className="flex whitespace-nowrap animate-marquee items-center" aria-hidden="true">
            {[...trustedBy, ...trustedBy].map((item, i) => (
              <span key={i + 'dup'} className="font-hero text-3xl lg:text-5xl uppercase tracking-widest px-12 text-neo-black mx-8">{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Box Features */}
      <section className="w-full max-w-7xl mx-auto py-24 px-4">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
          <h2 className="font-hero text-5xl sm:text-7xl uppercase text-neo-black drop-shadow-[4px_4px_0_#FFD600]">Everything you need.</h2>
          <p className="mt-4 font-bold uppercase tracking-widest text-gray-500">Nothing you don't. Pure efficiency.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(250px,auto)]">
          {/* Box 1 */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="md:col-span-2 border-4 border-neo-black bg-neo-yellow p-8 sm:p-12 shadow-brutal relative overflow-hidden group hover:bg-white transition-colors">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/30 rounded-full blur-3xl pointer-events-none group-hover:bg-neo-yellow/30 transition-colors"></div>
            <h3 className="font-hero text-4xl sm:text-6xl text-neo-black uppercase tracking-widest mb-4 relative z-10">Real-Time Sync</h3>
            <p className="font-bold text-lg text-neo-black uppercase tracking-wider relative z-10 max-w-md">Every score, every update, instantly reflected across all screens. No refreshing required.</p>
            <div className="mt-8 border-4 border-neo-black bg-white p-4 font-mono font-black shadow-brutal inline-block rotate-2 group-hover:rotate-0 transition-transform">latency: ~40ms</div>
          </motion.div>

          {/* Box 2 */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp} className="border-4 border-neo-black bg-white p-8 shadow-brutal flex flex-col justify-between hover:-translate-y-2 transition-transform">
            <div>
              <div className="w-12 h-12 bg-neo-black text-neo-yellow border-4 border-neo-black flex items-center justify-center font-hero text-2xl shadow-brutal mb-6">2</div>
              <h3 className="font-hero text-3xl text-neo-black uppercase tracking-widest mb-2">Dual Tracks</h3>
              <p className="font-bold text-sm text-gray-500 uppercase tracking-widest">Hardware & Software</p>
            </div>
            <div className="flex gap-2 mt-8">
              <span className="flex-1 h-4 bg-neo-red border-2 border-neo-black"></span>
              <span className="flex-1 h-4 bg-neo-black border-2 border-neo-black"></span>
            </div>
          </motion.div>

          {/* Box 3 */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp} className="border-4 border-neo-black bg-neo-black text-white p-8 shadow-[8px_8px_0_#111] flex flex-col hover:shadow-[12px_12px_0_#FFD600] transition-shadow">
            <h3 className="font-hero text-4xl text-white uppercase tracking-widest mb-4">Dynamic Rubrics</h3>
            <p className="font-bold text-sm text-gray-400 uppercase tracking-widest leading-loose">
              Custom scoring parameters per round. Lock rounds to freeze judging. Inject bonuses on the fly.
            </p>
          </motion.div>

          {/* Box 4 */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp} className="md:col-span-2 border-4 border-neo-black bg-white p-8 sm:p-12 shadow-[8px_8px_0_#111] overflow-hidden relative flex flex-col justify-center items-start group">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(17,17,17,0.05)_2px,transparent_2px),linear-gradient(90deg,rgba(17,17,17,0.05)_2px,transparent_2px)] bg-[size:32px_32px] pointer-events-none"></div>
            <h3 className="font-hero text-4xl sm:text-6xl text-neo-black uppercase tracking-widest mb-4 z-10 group-hover:text-neo-yellow transition-colors drop-shadow-[2px_2px_0_#111]">Suspense Mode</h3>
            <p className="font-bold text-lg text-neo-black uppercase tracking-wider z-10">Freeze the public leaderboard. Let judges finish. Unfreeze with a global celebration event.</p>
            <button className="mt-8 bg-neo-yellow border-4 border-neo-black px-6 py-3 font-black uppercase tracking-widest shadow-brutal z-10 pointer-events-none">❄️ FROZEN</button>
          </motion.div>
        </div>
      </section>

      {/* How It Works (Workflow) */}
      <section className="w-full bg-neo-black text-neo-white py-24 border-y-4 border-neo-black relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_2px,transparent_2px),linear-gradient(90deg,rgba(255,255,255,0.05)_2px,transparent_2px)] bg-[size:64px_64px] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <h2 className="font-hero text-5xl sm:text-7xl uppercase text-neo-white drop-shadow-[4px_4px_0_#FFD600]">How it works</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: 1, title: "Setup Event", desc: "Create your hackathon, define tracks, and import your teams via CSV in seconds." },
              { step: 2, title: "Whitelist Judges", desc: "Judges log in, copy their unique ID, and you grant them secure grading access instantly." },
              { step: 3, title: "Go Live", desc: "Project the leaderboard. Watch ranks shift in real-time as evaluations pour in." }
            ].map((s) => (
              <motion.div key={s.step} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="border-4 border-neo-black bg-white p-8 shadow-[8px_8px_0_#FFD600] text-neo-black flex flex-col group hover:-translate-y-2 transition-transform">
                <div className="font-hero text-6xl text-neo-yellow drop-shadow-[2px_2px_0_#111] mb-6">{s.step}.</div>
                <h3 className="font-hero text-3xl uppercase tracking-widest mb-4">{s.title}</h3>
                <p className="font-bold text-gray-600 uppercase tracking-wider">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="w-full max-w-7xl mx-auto py-24 px-4">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
          <h2 className="font-hero text-5xl sm:text-7xl uppercase text-neo-black drop-shadow-[4px_4px_0_#111]">Wall of Love</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, idx) => (
            <motion.div key={idx} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="border-4 border-neo-black bg-neo-white p-8 shadow-brutal flex flex-col justify-between hover:bg-neo-yellow transition-colors">
              <div className="font-black text-4xl mb-6">"</div>
              <p className="font-bold text-lg text-neo-black uppercase tracking-wider mb-8 italic">{t.text}</p>
              <div>
                <div className="font-hero text-2xl uppercase tracking-widest">{t.name}</div>
                <div className="font-black text-xs text-gray-500 uppercase tracking-[0.2em] mt-1">{t.role}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="w-full bg-neo-yellow border-t-4 border-neo-black py-32 px-4 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-[linear-gradient(rgba(17,17,17,0.05)_2px,transparent_2px),linear-gradient(90deg,rgba(17,17,17,0.05)_2px,transparent_2px)] bg-[size:32px_32px] pointer-events-none"></div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="relative z-10 flex flex-col items-center">
          <h2 className="font-hero text-6xl sm:text-8xl lg:text-[10rem] uppercase text-neo-black drop-shadow-[4px_4px_0_#FFF] leading-none mb-8">
            START <br/> <span className="bg-white border-4 border-neo-black px-4 shadow-[8px_8px_0_#111] inline-block -rotate-2 mt-4 hover:rotate-0 transition-transform cursor-pointer">NOW.</span>
          </h2>
          <p className="font-bold text-xl uppercase tracking-widest text-neo-black mb-12 max-w-2xl">
            Stop using spreadsheets. Elevate your event with the ultimate real-time leaderboard platform.
          </p>
          <Link 
            to="/login" 
            className="font-hero text-3xl sm:text-5xl uppercase tracking-widest bg-neo-black text-neo-white border-4 border-neo-black px-12 py-6 shadow-[8px_8px_0_#FFF] hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all"
          >
            GET STARTED &rarr;
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t-4 border-neo-black bg-white py-12 px-6 flex flex-col sm:flex-row items-center justify-between z-20">
        <div className="font-hero text-2xl font-black tracking-widest flex items-center gap-2 mb-4 sm:mb-0">
          <img src="/Lead-X.png" alt="LeadX Logo" className="h-10 drop-shadow-[2px_2px_0_#111]" />
        </div>
        <div className="flex gap-6 font-black uppercase text-xs tracking-widest text-gray-500">
          <span className="hover:text-neo-black cursor-pointer transition-colors">Privacy</span>
          <span className="hover:text-neo-black cursor-pointer transition-colors">Terms</span>
          <span className="hover:text-neo-black cursor-pointer transition-colors">Twitter</span>
        </div>
      </footer>
      
    </div>
  )
}
