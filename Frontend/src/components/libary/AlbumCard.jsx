const getAlbumInitial = (title) => {
  if (typeof title !== "string") {
    return "?";
  }

  const normalizedTitle = title.trim();

  return normalizedTitle ? normalizedTitle.charAt(0).toUpperCase() : "?";
};

const AlbumCard = ({ album }) => {
  const title =
    typeof album?.title === "string" && album.title.trim()
      ? album.title.trim()
      : "Album chưa đặt tên";

  const coverImage =
    typeof album?.coverImage === "string" && album.coverImage.trim()
      ? album.coverImage.trim()
      : "";

  const artistName =
    typeof album?.artistName === "string" && album.artistName.trim()
      ? album.artistName.trim()
      : "Nghệ sĩ không xác định";

  const trackCount = Array.isArray(album?.trackList)
    ? album.trackList.length
    : 0;

  return (
    <article className="flex items-center gap-5 rounded-2xl px-5 py-4 transition hover:bg-[#232323]">
      {coverImage ? (
        <img
          src={coverImage}
          alt={title}
          className="h-24 w-24 shrink-0 rounded-xl object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#2e2e2e_0%,#4a4a4a_100%)] text-3xl font-bold text-white">
          {getAlbumInitial(title)}
        </div>
      )}

      <div className="min-w-0">
        <h3 className="truncate text-xl font-bold text-white">
          {title}
        </h3>

        <p className="mt-1 truncate text-sm text-[#a7a7a7]">
          Album • {artistName}
        </p>

        <p className="mt-1 text-sm text-[#a7a7a7]">
          {trackCount} bài hát
        </p>
      </div>
    </article>
  );
};

export default AlbumCard;
