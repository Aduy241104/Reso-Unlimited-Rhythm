import { useMemo, useState } from "react";

const sectionClassName = `
   sm:p-2
`;

const hasLongLyrics = (lyrics = "") => {
  const lineCount = lyrics.split("\n").filter((line) => line.trim()).length;
  return lineCount > 6 || lyrics.length > 260;
};

const TrackDetailLyrics = ({ lyrics }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const shouldCollapse = useMemo(() => hasLongLyrics(lyrics), [lyrics]);

  if (!lyrics) {
    return (
      <section className={ sectionClassName }>
        <h2 className="text-2xl font-semibold tracking-tight text-[#111111] dark:text-white">
          { "L\u1eddi b\u00e0i h\u00e1t" }
        </h2>
        <p className="mt-4 text-sm leading-7 text-[#52525b] dark:text-[#a1a1aa]">
          { "Ch\u01b0a c\u00f3 l\u1eddi b\u00e0i h\u00e1t cho track n\u00e0y." }
        </p>
      </section>
    );
  }

  return (
    <section className={ sectionClassName }>
      <h2 className="text-2xl font-semibold tracking-tight text-[#111111] dark:text-white">
        { "L\u1eddi b\u00e0i h\u00e1t" }
      </h2>

      <div className="relative mt-5">
        <p
          className={[
            "whitespace-pre-line text-sm leading-7 text-[#27272a] dark:text-white/90 sm:text-base sm:leading-8",
            shouldCollapse && !isExpanded ? "max-h-64 overflow-hidden" : "",
          ].join(" ")}
        >
          { lyrics }
        </p>

        { shouldCollapse && !isExpanded ? (
          <div
            className="
              pointer-events-none absolute inset-x-0 bottom-0 h-24
              bg-gradient-to-t from-white via-white/92 to-transparent
              dark:from-[#181818] dark:via-[#181818]/92
            "
          />
        ) : null }
      </div>

      { shouldCollapse ? (
        <button
          type="button"
          onClick={ () => setIsExpanded((currentValue) => !currentValue) }
          className="mt-4 text-sm font-semibold text-[#111111] transition hover:opacity-80 dark:text-white"
        >
          { isExpanded ? "Thu gọn" : "Xem thêm" }
        </button>
      ) : null }
    </section>
  );
};

export default TrackDetailLyrics;
