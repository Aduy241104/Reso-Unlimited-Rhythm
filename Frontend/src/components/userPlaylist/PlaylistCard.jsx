import { useNavigate } from "react-router-dom";
import { routePaths } from "../../routes/routePaths";

const PlaylistCard = ({ playlist }) => {
  const navigate = useNavigate();
  const playlistId = playlist?.playlistId || playlist?.id || "";
  const playlisttitle =
    typeof playlist?.title === "string" && playlist.title.trim()
      ? playlist.title.trim()
      : typeof playlist?.name === "string" && playlist.name.trim()
        ? playlist.name.trim()
        : "Untitled Playlist";
  const coverImage =
    typeof playlist?.coverImage === "string" && playlist.coverImage.trim() ? playlist.coverImage.trim() : "";
  const userName =
    typeof playlist?.userName === "string" && playlist.userName.trim() ? playlist.userName.trim() : "Unknown";
  const description =
    typeof playlist?.description === "string" && playlist.description.trim() ? playlist.description.trim() : "";

  const handleOpenPlaylist = () => {
    if (!playlistId) {
      return;
    }

    navigate(routePaths.userPlaylistDetail(playlistId));
  };

  return (
    <article
      onClick={ handleOpenPlaylist }
      className="cursor-pointer rounded-2xl bg-[#121212] p-3 transition-all duration-200 hover:bg-[#1a1a1a]"
    >
      { coverImage ? (
        <img
          src={ coverImage }
          alt={ playlisttitle }
          className="aspect-square w-full rounded-xl object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-[linear-gradient(145deg,#242424_0%,#383838_100%)] text-5xl font-semibold text-white">
          {playlisttitle.charAt(0).toUpperCase()}
        </div>
      ) }

      <div className="space-y-1 px-1 pb-1 pt-4">
        <h2 className="line-clamp-2 text-lg font-semibold text-white">
          { playlisttitle }
        </h2>

        { description ? (
          <p className="line-clamp-2 text-sm text-[#a7a7a7]">
            { description }
          </p>
        ) : null }

        <p className="line-clamp-1 text-sm text-[#b3b3b3]">
          { userName }
        </p>
      </div>
    </article>
  );
};

export default PlaylistCard;
