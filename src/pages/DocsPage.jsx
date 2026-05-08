import { Link } from 'react-router-dom'

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#F4F4F0] flex flex-col font-base text-[#111] selection:bg-[#FFD600] selection:text-[#111]">
      <nav className="w-full flex items-center justify-between px-8 py-5 border-b-2 border-[#111] bg-[#F4F4F0]">
        <Link to="/" className="font-hero text-2xl font-bold tracking-widest flex items-center gap-2 hover:scale-105 transition-transform">
          LEADERBOARD
        </Link>
        <div className="flex items-center gap-8">
          <Link to="/login" className="font-bold text-sm uppercase tracking-widest bg-[#FFD600] border-2 border-[#111] px-6 py-2 shadow-[4px_4px_0_#111] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
            GET STARTED
          </Link>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto w-full p-8 py-20">
        <h1 className="font-hero text-6xl tracking-tight uppercase mb-8">Documentation</h1>
        <div className="border-2 border-[#111] bg-white p-8 shadow-[8px_8px_0_#111]">
          <h2 className="font-hero text-3xl mb-4">Welcome to Leaderboard</h2>
          <p className="text-lg font-medium leading-relaxed mb-6">
            This platform allows you to spin up isolated, multi-tenant scoring environments for your events. It supports real-time synchronization, distinct hardware/software tracks, and dynamic rubrics.
          </p>
          <ul className="list-disc list-inside text-lg font-medium space-y-2">
            <li>Create an event from the Dashboard.</li>
            <li>Define your rubrics in the Admin Panel.</li>
            <li>Add Judges and provide them with the event link.</li>
            <li>Watch the public leaderboard update in real-time.</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
