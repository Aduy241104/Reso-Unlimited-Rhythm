import { useNavigate } from "react-router-dom";
import { routePaths } from "../../routes/routePaths";

const GENRE_CARD_COLORS = [
  "#E133A1",
  "#1E3264",
  "#27856A",
  "#509BF5",
  "#8D67AB",
  "#E8115B",
  "#148A08",
  "#BC5900",
];

const getGenreCardColor = (genre) => {
  const source = String(
    genre?._id || genre?.genreId || genre?.id || genre?.name || "genre"
  );

  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = source.charCodeAt(index) + ((hash << 5) - hash);
  }

  return GENRE_CARD_COLORS[Math.abs(hash) % GENRE_CARD_COLORS.length];
};

const GenreCard = ({ genre }) => {
  const navigate = useNavigate();
  const genreId = genre?._id || genre?.genreId || genre?.id || "";
  const genreName =
    typeof genre?.name === "string" && genre.name.trim()
      ? genre.name.trim()
      : "The loai";
  const genreImage =
    typeof genre?.image === "string" && genre.image.trim()
      ? genre.image.trim()
      : "";

  const handleOpenGenre = () => {
    if (!genreId) {
      return;
    }

    navigate(routePaths.userGenreDetail(genreId));
  };

  return (
    <article
      onClick={ handleOpenGenre }
      className="relative h-[174px] cursor-pointer overflow-hidden rounded-xl p-5 transition-transform duration-300 hover:scale-[1.02]"
      style={{ backgroundColor: getGenreCardColor(genre) }}
    >
      <h2 className="max-w-[70%] text-[1.65rem] font-bold leading-tight text-white">
        { genreName }
      </h2>

      { genreImage ? (
        <img
          src={ genreImage }
          alt={ genreName }
          className="absolute bottom-0 right-0 h-[110px] w-[110px] translate-x-4 translate-y-3 rotate-[23deg] object-cover shadow-2xl"
          loading="lazy"
        />
      ) : null }
    </article>
  );
};

export default GenreCard;
