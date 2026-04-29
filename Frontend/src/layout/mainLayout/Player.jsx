const Player = () => {
  return (
    <footer className="
      fixed bottom-4 left-1/2 z-30
      w-[900px] max-w-[90%] -translate-x-1/2
      grid grid-cols-[1fr_auto_1fr] items-center
      rounded-2xl
      border border-white/10
      bg-zinc-900/40
      px-6 py-4
      shadow-[0_8px_40px_rgba(0,0,0,0.5)]
      backdrop-blur-xl backdrop-saturate-150
    ">
      <div>
        <p className="text-sm font-medium text-white">Now Playing</p>
        <p className="text-xs text-zinc-400">Track name • Artist name</p>
      </div>

      <div className="flex items-center gap-3">
        <button className="rounded-full border border-white/10 bg-zinc-800/40 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700/40 transition">
          Prev
        </button>

        <button className="rounded-full bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white transition">
          Play
        </button>

        <button className="rounded-full border border-white/10 bg-zinc-800/40 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700/40 transition">
          Next
        </button>
      </div>

      <div className="justify-self-end text-xs text-zinc-400">
        03:24
      </div>
    </footer>
  );
};

export default Player;