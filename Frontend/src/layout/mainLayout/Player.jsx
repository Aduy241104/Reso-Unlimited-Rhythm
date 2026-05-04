const Player = () => {
  return (
    <footer
      className="
        fixed bottom-4 left-1/2 z-30
        w-[900px] max-w-[90%] -translate-x-1/2
        grid grid-cols-[1fr_auto_1fr] items-center
        rounded-2xl
        border border-[#f5b66f]/20
        bg-[#1b161d]/92
        px-6 py-4
        text-[#f7f1ea]
        shadow-[0_20px_60px_rgba(255,255,255,0.2)]
        backdrop-blur-2xl backdrop-saturate-150
      "
    >
      <div>
        <p className="text-sm font-medium text-[#fff7ef]">Now Playing</p>
        <p className="text-xs text-[#d7c9bc]">Track name - Artist name</p>
      </div>

      <div className="flex items-center gap-3">
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

      <div className="justify-self-end text-xs text-[#d7c9bc]">
        03:24
      </div>
    </footer>
  );
};

export default Player;
