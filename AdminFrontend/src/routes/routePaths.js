export const routePaths = {
  home: "/",
  login: "/login",
  systemTracks: "/system-tracks",
  systemPlaylists: "/system-playlists",
  genres: "/genres",
  genreNew: "/genres/new",
  genreEdit: (genreId = ":genreId") => `/genres/${genreId}/edit`,
  users: "/users",
  userDetail: (userId = ":userId") => `/users/${userId}`,
  systemPlaylistNew: "/system-playlists/new",
  systemPlaylistDetail: (playlistId = ":playlistId") =>
    `/system-playlists/${playlistId}`,
  systemPlaylistEdit: (playlistId = ":playlistId") =>
    `/system-playlists/${playlistId}/edit`,
};
