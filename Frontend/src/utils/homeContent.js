import { routePaths } from "../routes/routePaths";

export const getResourceId = (item) => item?.id ?? item?._id ?? "";

export const mapAlbumsToContentCards = (albums = []) =>
  albums.map((album) => {
    const albumId = getResourceId(album);

    return {
      id: albumId,
      type: "album",
      image: album?.coverImage ?? "",
      title: album?.title ?? "",
      subtitle: album?.artist?.name ?? "",
      href: albumId ? routePaths.albumDetail(albumId) : undefined,
      raw: album,
    };
  });

export const mapSystemPlaylistsToContentCards = (playlists = []) =>
  playlists.map((playlist) => {
    const playlistId = getResourceId(playlist);

    return {
      id: playlistId,
      type: playlist?.type ?? "",
      image: playlist?.coverImage ?? "",
      title: playlist?.title ?? "",
      subtitle: playlist?.description ?? "",
      href: playlistId ? routePaths.playlistDetail(playlistId) : undefined,
      raw: playlist,
    };
  });
