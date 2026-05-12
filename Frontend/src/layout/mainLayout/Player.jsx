const Player = () => {
  return (
    <footer
      className="
      fixed bottom-3 left-1/2 z-30
      w-[calc(100%-24px)] max-w-[900px] -translate-x-1/2
      grid grid-cols-1 items-center gap-3
      rounded-2xl
      border border-zinc-300/40 dark:border-[#f5b66f]/20

      bg-zinc-700/90 text-white
      dark:bg-[#1b161d]/92 dark:text-[#f7f1ea]

      px-4 py-4
      shadow-[0_20px_60px_rgba(0,0,0,0.25)]
      dark:shadow-[0_20px_60px_rgba(255,255,255,0.2)]

      backdrop-blur-2xl backdrop-saturate-150
      sm:bottom-4 sm:w-[900px] sm:max-w-[90%]
      sm:grid-cols-[1fr_auto_1fr] sm:gap-0 sm:px-6
  "
    >
      <div className="text-center sm:text-left">
        <p className="text-sm font-medium text-[#fff7ef]">Now Playing</p>
        <p className="text-xs text-[#d7c9bc]">Track name - Artist name</p>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button className="rounded-full border border-[#f5b66f]/15 bg-[#241f28] px-3 py-2 text-sm text-[#fff7ef] transition hover:bg-[#2b252f]">
          Prev
        </button>

        <button className="rounded-full bg-gradient-to-r from-[#f5b66f] to-[#d98235] px-4 py-2 text-sm font-medium text-black transition hover:brightness-105">
          Play
        </button>

        <button className="rounded-full border border-[#f5b66f]/15 bg-[#241f28] px-3 py-2 text-sm text-[#fff7ef] transition hover:bg-[#2b252f]">
          Next
        </button>
      </div>

      <div className="text-center text-xs text-[#d7c9bc] sm:justify-self-end sm:text-right">
        03:24
      </div>
    </footer>
  );
};

export default Player;
