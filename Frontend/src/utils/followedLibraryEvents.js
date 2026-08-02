export const FOLLOWED_ARTISTS_CHANGED_EVENT = "user-followed-artists:changed";
export const FOLLOWED_ALBUMS_CHANGED_EVENT = "user-followed-albums:changed";

const dispatchFollowedLibraryEvent = (eventName, detail) => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(eventName, { detail }));
};

export const emitFollowedArtistChangedEvent = ({
  type,
  artist = null,
  artistId = "",
} = {}) => {
  dispatchFollowedLibraryEvent(FOLLOWED_ARTISTS_CHANGED_EVENT, {
    type,
    artist,
    artistId:
      artistId || artist?.artistId || artist?.id || artist?._id || "",
  });
};

export const emitFollowedAlbumChangedEvent = ({
  type,
  album = null,
  albumId = "",
} = {}) => {
  dispatchFollowedLibraryEvent(FOLLOWED_ALBUMS_CHANGED_EVENT, {
    type,
    album,
    albumId: albumId || album?.albumId || album?.id || "",
  });
};
