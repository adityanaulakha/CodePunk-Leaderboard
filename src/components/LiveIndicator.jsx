export default function LiveIndicator({ lastUpdateAt }) {
  return (
    <div
      className="inline-flex items-center gap-3 border-2 border-gwen-cyan bg-zinc-950 px-3 py-1 font-hero text-lg tracking-[0.1em] text-gwen-cyan shadow-comic-cyan transition-all"
      title={lastUpdateAt ? `Last update: ${new Date(lastUpdateAt).toLocaleTimeString()}` : 'Waiting for updates'}
    >
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping bg-gwen-cyan opacity-80" />
        <span className="relative inline-flex h-3 w-3 bg-gwen-cyan" />
      </span>
      <span className="mt-0.5">Live</span>
    </div>
  )
}
