import { useNavigate } from "react-router-dom";
import { routePaths } from "../../routes/routePaths";
import { formatTrackDuration } from "../../utils/albumDetail";

const formatPlayCount = (value) => {
  const totalPlay = Number(value);

  if (!Number.isFinite(totalPlay) || totalPlay <= 0) {
    return "Moi cap nhat";
  }

  return `${new Intl.NumberFormat("vi-VN").format(totalPlay)} luot phat`;
};

const getTrackImage = (track) => {
  if (typeof track?.avatar === "string" && track.avatar.trim()) {
    return track.avatar.trim();
  }

  if (Array.isArray(track?.coverImage) && typeof track.coverImage[0] === "string") {
    return track.coverImage[0].trim();
  }

  if (typeof track?.coverImage === "string" && track.coverImage.trim()) {
    return track.coverImage.trim();
  }

  return "";
};

const getArtistName = (track) => {
  if (typeof track?.artist_artistId?.artistName === "string" && track.artist_artistId.artistName.trim()) {
    return track.artist_artistId.artistName.trim();
  }

  if (
    typeof track?.artist_artistId?.profile?.fullName === "string" &&
    track.artist_artistId.profile.fullName.trim()
  ) {
    return track.artist_artistId.profile.fullName.trim();
  }

  if (typeof track?.artist_artistId?.name === "string" && track.artist_artistId.name.trim()) {
    return track.artist_artistId.name.trim();
  }

  return "Nghe si khong xac dinh";
};

const GenreTrackCard = ({ track }) => {
  const navigate = useNavigate();
  const trackId = track?._id || track?.id || "";
  const image = getTrackImage(track);
  const title =
    typeof track?.title === "string" && track.title.trim()
      ? track.title.trim()
      : "Bai hat chua dat ten";
  const artistName = getArtistName(track);
  const duration = Number(track?.duration) > 0 ? formatTrackDuration(track.duration) : "";
  const totalPlay = track?.stats?.totalPlay ?? track?.totalPlay;

  const handleOpenTrackDetail = () => {
    if (!trackId) {
      return;
    }

    navigate(routePaths.trackDetail(trackId));
  };

  return (
    <article
      onClick={ handleOpenTrackDetail }
      className="cursor-pointer rounded-2xl bg-[#181818] p-3 transition-colors duration-200 hover:bg-[#242424]"
    >
      { image ? (
        <img
          src={ image }
          alt={ title }
          className="aspect-square w-full rounded-xl object-cover shadow-[0_18px_45px_rgba(0,0,0,0.28)]"
          loading="lazy"
        />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-[linear-gradient(145deg,#232323_0%,#131313_100%)] text-sm font-semibold uppercase tracking-[0.14em] text-white/45">
          N/A
        </div>
      ) }

      <div className="space-y-1 px-1 pb-1 pt-4">
        <h2 className="line-clamp-2 text-base font-bold text-white">
          { title }
        </h2>
        <p className="line-clamp-1 text-sm text-[#b3b3b3]">
          { artistName }
        </p>
        { duration || totalPlay ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#8c8c8c]">
            { duration ? <span>{ duration }</span> : null }
            { duration && totalPlay ? <span>•</span> : null }
            { totalPlay ? <span>{ formatPlayCount(totalPlay) }</span> : null }
          </div>
        ) : null }
      </div>
    </article>
  );
};

export default GenreTrackCard;
