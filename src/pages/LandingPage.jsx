import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { auth } from '../lib/firebase.js'
import { signOut } from 'firebase/auth'

export default function LandingPage() {
  const [user, setUser] = useState(undefined)
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeTab, setActiveTab] = useState('design') // For interactive Rubrics widget
  const [eventCode, setEventCode] = useState('')
  const navigate = useNavigate()

  const handleFindLeaderboard = (e) => {
    e.preventDefault()
    if (!eventCode.trim()) return
    const formattedId = eventCode.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')
    navigate(`/${formattedId}`)
  }

  useEffect(() => {
    if (!auth) return undefined
    const unsub = auth.onAuthStateChanged((u) => setUser(u))
    return () => unsub()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const trustedBy = [
    { name: "INC42", color: "bg-green-400" },
    { name: "IIT BOMBAY", color: "bg-neo-yellow" },
    { name: "NULLCON", color: "bg-neo-red text-white" },
    { name: "DEVFOLIO", color: "bg-white" },
    { name: "ETH INDIA", color: "bg-neo-lightgray" },
    { name: "SMART INDIA HACKATHON", color: "bg-[#FF9933] text-white" }
  ]

  const testimonials = [
    {
      name: "Neha Sharma",
      handle: "@neha_codes",
      role: "Lead Organizer, ETHIndia",
      text: "LeadX completely removed the chaos of judging. Our mentors just opened the link and started grading. No spreadsheets, zero panic.",
      stars: 5,
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Neha"
    },
    {
      name: "Dr. Arjun Patel",
      handle: "@arjun_cse",
      role: "Head of CSE, IIT Madras",
      text: "The suspense mode where the leaderboard freezes during final evaluations... brilliant. It made our closing ceremony incredibly hype.",
      stars: 5,
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun"
    },
    {
      name: "Ishaan Verma",
      handle: "@ishaan_builds",
      role: "Community Lead, Devfolio",
      text: "Finally, a platform that doesn't look like it was built in 2005. LeadX is fast, brutal, and does exactly what it promises.",
      stars: 5,
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ishaan"
    }
  ]

  const fadeUp = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  }

  return (
    <div className="min-h-screen bg-neo-white flex flex-col font-base text-neo-black overflow-x-hidden selection:bg-neo-yellow selection:text-neo-black">

      {/* Navigation */}
      <nav className={`w-full max-w-full flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b-4 border-neo-black bg-neo-white z-50 fixed top-0 transition-all duration-300 ${isScrolled ? 'shadow-[4px_4px_0_#111] py-2.5 sm:py-3 bg-white' : ''}`}>
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="font-hero text-2xl lg:text-3xl font-black tracking-widest flex items-center gap-2 relative z-10 hover:scale-105 transition-transform cursor-pointer"
        >
          <img src="/Lead-X.png" alt="LeadX Logo" className="h-10 sm:h-12 lg:h-16 drop-shadow-[2px_2px_0_#111]" />
        </div>
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-8 font-black uppercase text-sm tracking-wider">
          <a href="#features" className="hover:text-neo-yellow transition-colors underline-offset-4 hover:underline">Features</a>
          <a href="#workflow" className="hover:text-neo-yellow transition-colors underline-offset-4 hover:underline">Workflow</a>
          <a href="#testimonials" className="hover:text-neo-yellow transition-colors underline-offset-4 hover:underline">Wall of Love</a>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 lg:gap-8 relative z-10">
          {user ? (
            <>
              <button onClick={() => signOut(auth)} className="font-black text-sm lg:text-base uppercase tracking-widest hover:text-neo-red transition-colors hidden sm:block">
                SIGN OUT
              </button>
              <Link
                to="/dashboard"
                className="font-black text-xs sm:text-sm lg:text-base uppercase tracking-wider sm:tracking-widest bg-neo-yellow border-4 border-neo-black px-3 sm:px-6 py-2 shadow-[4px_4px_0_#111] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2"
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
                to="/login?mode=signup"
                className="font-black text-xs sm:text-sm lg:text-base uppercase tracking-wider sm:tracking-widest bg-neo-yellow border-4 border-neo-black px-3 sm:px-6 py-2 shadow-[4px_4px_0_#111] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2"
              >
                GET STARTED
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-start text-center px-4 pt-32 lg:pt-40 pb-24 relative z-10 w-full max-w-7xl mx-auto mt-16">

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
          }}
          className="flex flex-col items-center w-full relative"
        >
          {/* Floating Stickers/Decorations */}
          <motion.div variants={fadeUp} className="absolute -top-10 left-4 sm:left-10 lg:left-20 animate-[spin_10s_linear_infinite] z-0 hidden sm:block pointer-events-none">
            <svg width="100" height="100" viewBox="0 0 100 100" className="fill-neo-yellow drop-shadow-[4px_4px_0_#111]">
              <path d="M50 0 L60 40 L100 50 L60 60 L50 100 L40 60 L0 50 L40 40 Z" />
            </svg>
          </motion.div>
          <motion.div variants={fadeUp} className="absolute top-40 -right-4 sm:-right-10 lg:-right-10 z-20 hidden lg:block rotate-12 hover:rotate-0 transition-transform cursor-pointer">
            <div className="bg-neo-red text-white border-4 border-neo-black font-black uppercase tracking-widest px-4 py-2 shadow-[4px_4px_0_#111] whitespace-nowrap text-xl">
              V2.0 LIVE FIRE 🔥
            </div>
          </motion.div>

          {/* Pill Tag */}
          <motion.div variants={fadeUp} className="border-4 border-neo-black px-6 py-2 font-black text-xs sm:text-sm uppercase tracking-[0.2em] mb-10 inline-flex items-center gap-3 bg-white shadow-[4px_4px_0_#111] hover:-translate-y-1 transition-transform relative z-10 cursor-default">
            <div className="w-3 h-3 border-2 border-neo-black bg-green-400 animate-pulse"></div>
            THE PREMIUM SCORING PROTOCOL
          </motion.div>

          {/* Headline */}
          <motion.h1 variants={fadeUp} className="font-hero text-[2.8rem] sm:text-[4.5rem] md:text-[6rem] lg:text-[7.5rem] xl:text-[9rem] leading-[0.9] sm:leading-[0.85] tracking-tight uppercase text-neo-black flex flex-col items-center z-10 relative">
            <span className="block drop-shadow-[4px_4px_0_#FFF] relative">
              <span className="absolute -inset-1 text-neo-yellow opacity-50 blur-sm mix-blend-multiply pointer-events-none">COMPETITIVE</span>
              COMPETITIVE
            </span>
            <div className="relative inline-block my-2 sm:my-4 group">
              {/* Shadow Layer */}
              <div className="absolute inset-0 bg-neo-black translate-x-2 translate-y-2 sm:translate-x-4 sm:translate-y-4 transition-transform group-hover:translate-x-0 group-hover:translate-y-0 duration-300"></div>
              {/* Top Layer */}
              <span className="relative inline-block bg-neo-yellow border-[4px] sm:border-[6px] border-neo-black px-6 sm:px-10 py-1 -rotate-2 group-hover:rotate-0 group-hover:-translate-y-2 group-hover:-translate-x-2 transition-all duration-300">
                SCORING
              </span>
            </div>
            <span className="block drop-shadow-[4px_4px_0_#FFF]">MASTERED.</span>
          </motion.h1>

          {/* Subheadline & Social Proof */}
          <motion.div variants={fadeUp} className="mt-12 max-w-3xl px-4 text-center z-10 flex flex-col items-center">
            <p className="text-base sm:text-2xl font-bold leading-relaxed text-zinc-800 tracking-wide sm:tracking-wider">
              Never lose track of live ranks, judge evaluations, or dynamic leaderboards. Standardize your competitive events with absolute precision and raw efficiency.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 bg-white border-4 border-neo-black px-6 py-3 shadow-[4px_4px_0_#111] hover:-translate-y-1 hover:shadow-[6px_6px_0_#111] transition-all cursor-default">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <img key={i} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 50}&backgroundColor=b6e3f4,c0aede,d1d4f9`} alt="avatar" className="w-10 h-10 rounded-full border-2 border-neo-black bg-neo-lightgray" />
                ))}
              </div>
              <div className="font-black text-sm uppercase tracking-widest text-center sm:text-left leading-tight">
                Trusted by 500+ <br /> Organizers
              </div>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div variants={fadeUp} className="mt-16 flex flex-col sm:flex-row items-stretch sm:items-center gap-6 w-full max-w-2xl px-4 z-10">
            <Link
              to={user ? "/dashboard" : "/login?mode=signup"}
              className="w-full flex-1 font-hero text-xl lg:text-2xl uppercase tracking-widest bg-neo-black text-neo-white border-4 border-neo-black py-4 shadow-[8px_8px_0_#FFD600] hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all flex items-center justify-center gap-3 relative group overflow-hidden"
            >
              <span className="relative z-10">START ORGANIZING</span>
              <div className="absolute inset-0 bg-neo-yellow translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300 ease-out z-0 border-r-4 border-neo-black"></div>
              <span className="relative z-10 group-hover:text-neo-black transition-colors duration-300">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
            <Link
              to={user ? "/assignments" : "/login"}
              className="w-full sm:w-auto font-hero text-xl lg:text-2xl uppercase tracking-widest bg-white text-neo-black border-4 border-neo-black py-4 px-8 shadow-[8px_8px_0_#111] hover:bg-neo-lightgray hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all flex items-center justify-center"
            >
              JUDGE PORTAL
            </Link>
          </motion.div>

          {/* Find Live Leaderboard Search Block */}
          <motion.div
            variants={fadeUp}
            className="mt-12 w-full max-w-xl px-4 z-10"
          >
            <form onSubmit={handleFindLeaderboard} className="flex flex-col sm:flex-row border-4 border-neo-black bg-white shadow-[6px_6px_0_#FFD600] hover:-translate-y-1 hover:shadow-[8px_8px_0_#FFD600] transition-all relative group rounded-none">
              <input
                type="text"
                value={eventCode}
                onChange={(e) => setEventCode(e.target.value)}
                placeholder="ENTER EVENT CODE (e.g. code-punk)"
                className="flex-1 px-4 sm:px-5 py-4 font-black text-neo-black placeholder-zinc-500 uppercase tracking-wide sm:tracking-wider outline-none text-xs sm:text-base border-b-4 sm:border-b-0 sm:border-r-4 border-neo-black bg-white rounded-none"
              />
              <button
                type="submit"
                className="w-full sm:w-auto bg-neo-yellow px-6 py-4 font-hero text-lg uppercase tracking-wide sm:tracking-widest text-neo-black hover:bg-neo-black hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-2 rounded-none border-0"
              >
                FIND ⚡
              </button>
            </form>
          </motion.div>
        </motion.div>

        {/* Product Mockup Component */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="mt-32 w-full max-w-5xl relative z-10 group"
        >
          {/* Offset Background for Mockup */}
          <div className="absolute inset-0 bg-neo-yellow translate-x-4 translate-y-4 sm:translate-x-8 sm:translate-y-8 border-4 border-neo-black -z-10 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-500"></div>

          <div className="border-4 border-neo-black bg-white flex flex-col group-hover:-translate-y-2 transition-transform duration-500">
            <div className="border-b-4 border-neo-black bg-neo-lightgray px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 sm:border-4 border-neo-black bg-neo-red hover:bg-neo-black transition-colors"></div>
                <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 sm:border-4 border-neo-black bg-neo-yellow hover:bg-neo-black transition-colors"></div>
                <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 sm:border-4 border-neo-black bg-green-400 hover:bg-neo-black transition-colors"></div>
              </div>
              <div className="font-mono text-[10px] sm:text-xs font-black text-neo-black uppercase tracking-widest bg-white border-2 border-neo-black px-4 py-1 shadow-[2px_2px_0_#111]">leaderboard.app/demo</div>
              <div className="w-16 sm:w-20 hidden sm:block"></div>
            </div>

            <div className="p-4 sm:p-10 bg-white flex flex-col gap-6 relative min-h-[300px] sm:min-h-[400px] overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(17,17,17,0.05)_2px,transparent_2px),linear-gradient(90deg,rgba(17,17,17,0.05)_2px,transparent_2px)] bg-[size:32px_32px] pointer-events-none"></div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-4 border-neo-black pb-4 relative z-10 gap-4">
                <div className="font-hero text-3xl sm:text-5xl text-neo-black uppercase tracking-wider drop-shadow-[2px_2px_0_#FFD600] flex items-center gap-4">
                  LIVE RANKS
                  <div className="hidden sm:flex w-8 h-8 border-4 border-neo-black bg-neo-yellow rounded-full items-center justify-center animate-bounce">
                    <div className="w-2 h-2 bg-neo-black rounded-full"></div>
                  </div>
                </div>
                <div className="bg-neo-black text-neo-white border-4 border-neo-black px-4 py-2 font-black text-xs sm:text-sm uppercase tracking-widest shadow-[4px_4px_0_#FFD600] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full border border-neo-black bg-neo-red animate-pulse"></div>
                  ROUND 2 ACTIVE
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:gap-4 flex-1 relative z-10">
                {[1, 2, 3].map((row) => (
                  <div key={row} className="flex items-center justify-between p-3 sm:p-6 border-4 border-neo-black bg-neo-white hover:bg-neo-yellow hover:-translate-y-1 hover:shadow-[4px_4px_0_#111] transition-all cursor-default">
                    <div className="flex items-center gap-3 sm:gap-6">
                      <div className="font-hero text-xl sm:text-4xl text-neo-black/30 w-6 sm:w-8">0{row}</div>
                      <div className="w-8 h-8 sm:w-12 sm:h-12 border-4 border-neo-black bg-white shadow-brutal-sm overflow-hidden flex items-center justify-center">
                        <img src={`https://api.dicebear.com/7.x/shapes/svg?seed=${row * 123}&backgroundColor=ffffff`} alt="avatar" className="w-full h-full object-cover" />
                      </div>
                      <div className="font-hero text-lg sm:text-3xl uppercase tracking-widest text-neo-black truncate max-w-[120px] sm:max-w-none">TEAM EPSILON {row}</div>
                    </div>
                    <div className="font-mono font-black text-base sm:text-2xl tracking-tighter bg-neo-black text-white px-2 sm:px-3 py-1 shadow-[2px_2px_0_#FFF] sm:shadow-[4px_4px_0_#FFF] border-2 border-neo-black">{2500 - (row * 350)}</div>
                  </div>
                ))}
              </div>

              {/* Fake cursor element */}
              <div className="absolute bottom-8 right-1/4 z-20 animate-[bounce_3s_infinite] hidden sm:block pointer-events-none drop-shadow-[2px_2px_0_#111]">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="#FFD600" stroke="#111" strokeWidth="2">
                  <path d="M4 4l5.5 16.5L13 14l5 5 2.5-2.5-5-5 6.5-3.5L4 4z" />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Trusted By Section - High Density Brand Marquee */}
      <section className="w-full bg-neo-yellow border-y-4 border-neo-black py-12 overflow-hidden relative">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(17,17,17,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(17,17,17,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none"></div>
        <div className="text-center font-black uppercase tracking-[0.2em] text-neo-black mb-8 text-xs sm:text-sm relative z-10">EMPOWERING ELITE COMPETITIONS & HACKATHONS</div>
        <div className="w-full relative flex z-10">
          <div className="flex whitespace-nowrap animate-marquee items-center gap-6">
            {[...trustedBy, ...trustedBy].map((brand, i) => (
              <span key={i} className={`font-hero text-base sm:text-2xl uppercase tracking-wide sm:tracking-widest px-3 sm:px-6 py-3 border-4 border-neo-black shadow-[4px_4px_0_#111] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer ${brand.color}`}>
                ⚡ {brand.name}
              </span>
            ))}
          </div>
          <div className="flex whitespace-nowrap animate-marquee items-center gap-6" aria-hidden="true">
            {[...trustedBy, ...trustedBy].map((brand, i) => (
              <span key={i + 'dup'} className={`font-hero text-base sm:text-2xl uppercase tracking-wide sm:tracking-widest px-3 sm:px-6 py-3 border-4 border-neo-black shadow-[4px_4px_0_#111] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer ${brand.color}`}>
                ⚡ {brand.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Box Features - Premium Dense Widgets */}
      <section id="features" className="w-full max-w-7xl mx-auto py-24 px-4">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-20">
          <h2 className="font-hero text-5xl sm:text-7xl uppercase text-neo-black drop-shadow-[4px_4px_0_#FFD600]">CRITICAL CAPABILITIES</h2>
          <p className="mt-4 font-bold uppercase tracking-widest text-gray-500">ENGINEERED FOR PRODUCTION-SCALE COMPETITIONS.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 auto-rows-[minmax(300px,auto)]">
          {/* Box 1 - Real-Time Sync Interactive Widget */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="md:col-span-2 border-4 border-neo-black bg-neo-yellow p-8 sm:p-12 shadow-brutal relative overflow-hidden group hover:bg-white transition-colors duration-300">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(17,17,17,0.02)_2px,transparent_2px),linear-gradient(90deg,rgba(17,17,17,0.02)_2px,transparent_2px)] bg-[size:24px_24px] pointer-events-none"></div>
            <div className="flex flex-col h-full justify-between relative z-10">
              <div>
                <h3 className="font-hero text-4xl sm:text-5xl text-neo-black uppercase tracking-widest mb-4">REAL-TIME DATA FABRIC</h3>
                <p className="font-bold text-base sm:text-lg text-neo-black uppercase tracking-wider max-w-md">Every single evaluation, score update, and lock state reflects in real-time across all browser windows simultaneously.</p>
              </div>
              <div className="mt-8 flex flex-wrap gap-4 items-end justify-between">
                <div className="border-4 border-neo-black bg-white p-4 font-mono font-black shadow-brutal inline-block rotate-2 group-hover:rotate-0 transition-all duration-300">
                  <div className="text-xs text-gray-400">SYNC LATENCY</div>
                  <div className="text-2xl text-green-500 animate-pulse">~38ms ACTIVE</div>
                </div>
                <div className="flex gap-2 max-w-[200px] w-full border-4 border-neo-black bg-white p-3 shadow-brutal-sm">
                  <div className="h-8 bg-neo-black w-1/4 animate-[pulse_1s_infinite]"></div>
                  <div className="h-8 bg-neo-yellow w-2/4 animate-[pulse_1.5s_infinite]"></div>
                  <div className="h-8 bg-neo-red w-1/4 animate-[pulse_1.2s_infinite]"></div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Box 2 - Multiple Tracks Status Widget */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp} className="border-4 border-neo-black bg-white p-8 shadow-brutal flex flex-col justify-between hover:-translate-y-2 transition-transform duration-300">
            <div>
              <div className="w-12 h-12 bg-neo-black text-neo-yellow border-4 border-neo-black flex items-center justify-center font-hero text-2xl shadow-brutal mb-6 font-black">M</div>
              <h3 className="font-hero text-3xl text-neo-black uppercase tracking-widest mb-2">DYNAMIC TRACKS</h3>
              <p className="font-bold text-sm text-gray-500 uppercase tracking-widest mb-6">SUPPORT ANY EVENT TAXONOMY</p>

              <div className="flex flex-col gap-2">
                {['SOFTWARE DEV', 'ART & DESIGN', 'WEB3 HACKS'].map((track, i) => (
                  <div key={i} className="flex items-center justify-between border-2 border-neo-black px-3 py-1.5 font-black text-xs uppercase bg-neo-lightgray">
                    <span>{track}</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-neo-black"></span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-8">
              <span className="flex-1 h-4 bg-neo-red border-2 border-neo-black"></span>
              <span className="flex-1 h-4 bg-neo-black border-2 border-neo-black"></span>
              <span className="flex-1 h-4 bg-neo-yellow border-2 border-neo-black"></span>
            </div>
          </motion.div>

          {/* Box 3 - Interactive Rubrics Preview */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp} className="border-4 border-neo-black bg-neo-black text-white p-8 shadow-brutal flex flex-col justify-between hover:shadow-[12px_12px_0_#FFD600] transition-all duration-300">
            <div>
              <h3 className="font-hero text-3xl text-white uppercase tracking-widest mb-2">FLEXIBLE RUBRICS</h3>
              <p className="font-bold text-xs text-neo-yellow uppercase tracking-widest mb-6">LOCK PARAMETERS PER ROUND</p>

              <div className="flex border-2 border-white mb-4 overflow-hidden text-xs font-black">
                {['design', 'code'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-1.5 uppercase transition-colors ${activeTab === tab ? 'bg-white text-neo-black' : 'text-white'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === 'design' ? (
                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <div className="flex justify-between mb-1 text-gray-400"><span>UX FEEL</span><span>10pts</span></div>
                    <div className="h-2 bg-gray-800 border border-white"><div className="h-full bg-neo-yellow w-4/5"></div></div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1 text-gray-400"><span>UI AESTHETIC</span><span>10pts</span></div>
                    <div className="h-2 bg-gray-800 border border-white"><div className="h-full bg-neo-yellow w-3/5"></div></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <div className="flex justify-between mb-1 text-gray-400"><span>STABILITY</span><span>10pts</span></div>
                    <div className="h-2 bg-gray-800 border border-white"><div className="h-full bg-green-400 w-[95%]"></div></div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1 text-gray-400"><span>COMPLEXITY</span><span>10pts</span></div>
                    <div className="h-2 bg-gray-800 border border-white"><div className="h-full bg-green-400 w-1/2"></div></div>
                  </div>
                </div>
              )}
            </div>
            <div className="font-mono text-[10px] text-gray-400 border-t border-gray-800 pt-4 mt-6">
              * DYNAMIC RUBRICS SYSTEM V2
            </div>
          </motion.div>

          {/* Box 4 - Suspense Mode Freeze Widget */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp} className="md:col-span-2 border-4 border-neo-black bg-white p-8 sm:p-12 shadow-[8px_8px_0_#111] overflow-hidden relative flex flex-col justify-between group hover:bg-neo-lightgray transition-colors duration-300">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(17,17,17,0.05)_2px,transparent_2px),linear-gradient(90deg,rgba(17,17,17,0.05)_2px,transparent_2px)] bg-[size:32px_32px] pointer-events-none"></div>
            <div>
              <div className="border-4 border-neo-black bg-neo-red text-white font-black text-xs px-3 py-1 uppercase tracking-widest inline-block mb-4 shadow-brutal-sm">
                EXCLUSIVE FEATURE
              </div>
              <h3 className="font-hero text-4xl sm:text-5xl text-neo-black uppercase tracking-widest mb-4">SUSPENSE PROTOCOL</h3>
              <p className="font-bold text-base sm:text-lg text-neo-black uppercase tracking-wider max-w-xl">Freeze public leaderboards while allowing judges to submit final scores secretly. Reveal live results dramatically on stage to maximize energy.</p>
            </div>
            <div className="mt-8 flex items-center gap-4">
              <button className="bg-neo-yellow border-4 border-neo-black px-6 py-3 font-black uppercase tracking-widest shadow-brutal group-hover:-rotate-2 transition-transform cursor-default">❄️ FROZEN LEADERBOARD</button>
              <div className="w-12 h-12 rounded-full border-4 border-neo-black bg-white flex items-center justify-center font-black text-xl shadow-brutal-sm">!</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works - Connected Workflow Steps */}
      <section id="workflow" className="w-full bg-neo-black text-neo-white py-24 border-y-4 border-neo-black relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_2px,transparent_2px),linear-gradient(90deg,rgba(255,255,255,0.03)_2px,transparent_2px)] bg-[size:48px_48px] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-20">
            <h2 className="font-hero text-5xl sm:text-7xl uppercase text-neo-white drop-shadow-[4px_4px_0_#FFD600]">OPERATING MODEL</h2>
            <p className="mt-4 font-bold uppercase tracking-widest text-gray-400">ENGINEERED CONSOLES FOR COMPREHENSIVE TOURNAMENT MANAGEMENT</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative">
            {[
              {
                step: "01",
                phase: "MY EVENTS HUB",
                title: "YOUR HOME BASE",
                desc: "Your friendly central dashboard. See all your active and past contests at a glance, create new events in seconds, and quickly jump to your event control room or judge pages with simple links.",
                features: ["All Your Events Listed", "Friendly Event Links", "Simple New Event Setup", "Easy Password Updates"]
              },
              {
                step: "02",
                phase: "EVENT CONTROL ROOM",
                title: "EASY CUSTOMIZATION",
                desc: "Design your event exactly how you want it with zero coding! Create custom categories (like Art, Coding, or Pitch), set up scoring rounds, add your judges, and choose easy grading rules.",
                features: ["Custom Categories", "Grading Rules (Rubrics)", "Rounds & Bonus Points", "Add Unlimited Judges"]
              },
              {
                step: "03",
                phase: "JUDGING SCREEN",
                title: "TAP TO GRADE ON PHONES",
                desc: "A super clean screen designed for your judges. They can log in on any phone or tablet, see your simple grading questions, tap to score, and watch the scores calculate instantly.",
                features: ["Works on Any Phone", "Simple Tap Grading", "Instant Scoring Averages", "Safe & Secure Logins"]
              },
              {
                step: "04",
                phase: "LIVE LEADERBOARD",
                title: "SPECTATOR SHOWCASE",
                desc: "A beautiful, real-time board for your audience. Filter by categories, freeze the board near the end to keep the final winners a surprise, and tap a button to trigger screen-wide confetti!",
                features: ["Real-Time Score Updates", "Secret Climax (Freeze)", "Confetti Celebrations", "Animated Podium Views"]
              },
              {
                step: "05",
                phase: "FAST CODES",
                title: "INSTANT SPECTATOR ENTRY",
                desc: "No complicated links needed. Audience members and contestants can simply type your custom event code right on the homepage to open your live scoreboard or join as a grader.",
                features: ["Type Code to Enter", "Instant Score Lookup", "QR-Code Friendly Routes", "Custom Friendly Names"]
              }
            ].map((card, idx) => (
              <motion.div
                key={card.step}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="border-4 border-neo-black bg-white p-8 shadow-[8px_8px_0_#FFD600] text-neo-black flex flex-col justify-between group hover:-translate-y-2 hover:shadow-[12px_12px_0_#FFD600] transition-all duration-300 z-10 min-h-[380px]"
              >
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <span className="font-hero text-5xl text-neo-yellow drop-shadow-[3px_3px_0_#111]">{card.step}</span>
                    <span className="font-mono text-xs font-black text-gray-400 uppercase tracking-widest">{card.phase}</span>
                  </div>
                  <h3 className="font-hero text-2xl uppercase tracking-widest mb-4">{card.title}</h3>
                  <p className="font-bold text-gray-600 uppercase tracking-wider text-xs leading-relaxed mb-6">{card.desc}</p>

                  <div className="flex flex-wrap gap-2">
                    {card.features.map((f, i) => (
                      <span key={i} className="bg-neo-lightgray border-2 border-neo-black px-2 py-1 font-black text-[10px] uppercase tracking-wider text-neo-black">
                        ⚡ {f}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-8 border-t-2 border-neo-black pt-4 font-black text-xs uppercase tracking-widest text-neo-black flex items-center gap-2">
                  <span>EXPLORE CONSOLE</span> &rarr;
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials - Styled as Professional Tweet/Social Embed Grid */}
      <section id="testimonials" className="w-full max-w-7xl mx-auto py-24 px-4">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-20">
          <h2 className="font-hero text-5xl sm:text-7xl uppercase text-neo-black drop-shadow-[4px_4px_0_#111]">WALL OF LOVE</h2>
          <p className="mt-4 font-bold uppercase tracking-widest text-gray-500">REAL REVIEWS FROM ORGANIZERS DRIVING SUCCESS.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, idx) => (
            <motion.div
              key={idx}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="border-4 border-neo-black bg-white p-8 shadow-brutal flex flex-col justify-between hover:bg-neo-yellow hover:-translate-y-2 transition-all duration-300"
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full border-2 border-neo-black bg-neo-lightgray" />
                    <div>
                      <div className="font-hero text-lg uppercase tracking-wider leading-none">{t.name}</div>
                      <div className="font-mono text-xs text-gray-400 mt-1">{t.handle}</div>
                    </div>
                  </div>
                  <div className="flex text-neo-black font-black text-sm">
                    {"★".repeat(t.stars)}
                  </div>
                </div>
                <p className="font-bold text-base text-neo-black uppercase tracking-wider italic leading-relaxed mb-8">"{t.text}"</p>
              </div>
              <div className="border-t-2 border-neo-black pt-4">
                <div className="font-black text-xs text-gray-500 uppercase tracking-[0.2em]">{t.role}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA - Premium Grid-Split Layout */}
      <section className="w-full bg-neo-yellow border-t-4 border-neo-black py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(17,17,17,0.04)_2px,transparent_2px),linear-gradient(90deg,rgba(17,17,17,0.04)_2px,transparent_2px)] bg-[size:24px_24px] pointer-events-none"></div>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-left flex flex-col items-start">
            <h2 className="font-hero text-4xl sm:text-8xl uppercase text-neo-black drop-shadow-[4px_4px_0_#FFF] leading-none mb-6">
              UPGRADE <br /> YOUR EVENT.
            </h2>
            <p className="font-bold text-base sm:text-xl uppercase tracking-wide sm:tracking-widest text-neo-black mb-8 max-w-md leading-relaxed">
              Stop using legacy spreadsheets. Standardize on the robust scoring network engineered for hackathons, design challenges, and competitive sprints.
            </p>
            <Link
              to="/login?mode=signup"
              className="font-hero text-xl sm:text-4xl uppercase tracking-wide sm:tracking-widest bg-neo-black text-neo-white border-4 border-neo-black px-6 sm:px-10 py-4 sm:py-5 shadow-[8px_8px_0_#FFF] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
            >
              GET DEPLOYED &rarr;
            </Link>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="border-4 border-neo-black bg-white p-8 shadow-brutal relative rotate-2 hover:rotate-0 transition-transform duration-300">
            <div className="absolute -top-6 -right-6 bg-neo-red text-white border-4 border-neo-black px-4 py-1.5 font-black text-xs uppercase tracking-widest shadow-brutal-sm animate-bounce">
              FREE TIER ACTIVE
            </div>
            <h3 className="font-hero text-3xl mb-4 uppercase">STARTING PACK</h3>
            <ul className="space-y-3 font-bold uppercase text-sm mb-8">
              <li className="flex items-center gap-2">✓ Unlimited Public Teams</li>
              <li className="flex items-center gap-2">✓ Dynamic Rubrics Editor</li>
              <li className="flex items-center gap-2">✓ Multi-Track Judge Assignment</li>
              <li className="flex items-center gap-2">✓ Real-time Sync & Suspense Mode</li>
            </ul>
            <div className="font-mono text-xs text-gray-400">
              * Setup completes in under 3 minutes. No Credit Card required.
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer - Full Professional Multi-Column */}
      <footer className="w-full border-t-4 border-neo-black bg-white py-16 px-4 sm:px-8 relative z-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="flex flex-col items-start gap-4 md:col-span-3">
            <img
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              src="/Lead-X.png"
              alt="LeadX Logo"
              className="h-16 lg:h-20 drop-shadow-[2px_2px_0_#111] cursor-pointer hover:scale-105 transition-transform"
            />
            <p className="font-bold uppercase text-xs text-gray-500 tracking-wider max-w-xs leading-relaxed">
              Standardizing hackathons and competitive sprints with real-time scoring data fabric.
            </p>
          </div>
          <div className="md:justify-self-end">
            <h4 className="font-hero text-lg uppercase tracking-wider mb-4 text-neo-black">PRODUCT</h4>
            <ul className="space-y-2 font-black uppercase text-xs text-gray-500 tracking-widest">
              <li><a href="#features" className="hover:text-neo-black">Features</a></li>
              <li><a href="#workflow" className="hover:text-neo-black">How It Works</a></li>
              <li><Link to="/login" className="hover:text-neo-black">Sign Up</Link></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t-4 border-neo-black pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="font-black uppercase text-xs text-gray-500 tracking-widest">
            &copy; 2026 LEADX INC. ALL RIGHTS RESERVED.
          </div>
        </div>
      </footer>

    </div>
  )
}
