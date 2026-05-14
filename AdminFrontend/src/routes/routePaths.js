export const routePaths = {
  home: "/",
  login: "/login",
  systemPlaylists: "/system-playlists",
  systemPlaylistNew: "/system-playlists/new",
  systemPlaylistDetail: (playlistId = ":playlistId") =>
    `/system-playlists/${playlistId}`,
};
