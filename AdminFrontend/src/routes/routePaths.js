export const routePaths = {
  home: "/",
  login: "/login",
  systemTracks: "/system-tracks",
  systemPlaylists: "/system-playlists",
  systemPlaylistNew: "/system-playlists/new",
  systemPlaylistDetail: (playlistId = ":playlistId") =>
    `/system-playlists/${playlistId}`,
  systemPlaylistEdit: (playlistId = ":playlistId") =>
    `/system-playlists/${playlistId}/edit`,
};
