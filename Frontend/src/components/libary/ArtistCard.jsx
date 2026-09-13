const getArtistInitial = (name) => {
  if (typeof name !== "string") {
    return "?";
  }

  const normalizedName = name.trim();

  return normalizedName ? normalizedName.charAt(0).toUpperCase() : "?";
};

const ArtistCard = ({ artist, onClick, subtitle = "Ngh\u1ec7 s\u0129" }) => {
  const artistName =
    typeof artist?.name === "string" && artist.name.trim() ? artist.name.trim() : "Nghệ sĩ không xác định";
  const avatar =
    typeof artist?.avatar === "string" && artist.avatar.trim() ? artist.avatar.trim() : "";

  return (
    <button
      type="button"
      onClick={ onClick }
      className="group flex w-full flex-col items-center rounded-[22px] bg-[#181818] px-2 py-4 text-center transition duration-200 hover:-translate-y-1 hover:bg-[#232323] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212] sm:rounded-[28px] sm:px-4 sm:py-5"
    >
      { avatar ? (
        <img
          src={ avatar }
          alt={ artistName }
          className="aspect-square w-full max-w-[220px] rounded-full object-cover shadow-[0_18px_40px_rgba(0,0,0,0.5)]"
          loading="lazy"
        />
      ) : (
        <div className="flex aspect-square w-full max-w-[220px] items-center justify-center rounded-full bg-[linear-gradient(145deg,#2d2d2d_0%,#3f3f3f_100%)] text-4xl font-semibold text-white shadow-[0_18px_40px_rgba(0,0,0,0.5)] sm:text-6xl">
          { getArtistInitial(artistName) }
        </div>
      ) }

      <div className="mt-3 space-y-1 sm:mt-5">
        <h2 className="line-clamp-2 text-lg font-bold leading-6 text-white">
          { artistName }
        </h2>
        <p className="text-sm font-medium text-[#a7a7a7]">{ subtitle }</p>
      </div>
    </button>
  );
};

export default ArtistCard;
