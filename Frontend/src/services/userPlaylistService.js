import axiosClient from "../axios/axiosClient";

const USER_PLAYLIST_API_PREFIX = "/api/users";

export const getUserPlaylists = async () => {
  const response = await axiosClient.get(`${USER_PLAYLIST_API_PREFIX}/playlists`);

  return response?.data?.data;
};
export const getUserPlaylistDetail = async (playlistId) => {
  const response = await axiosClient.get(
    `${USER_PLAYLIST_API_PREFIX}/playlists/detail/${playlistId}`
  );

  return response?.data?.data?.playlist ?? null;
};

export const createUserPlaylist = async (payload = {}) => {
  const formData = new FormData();
  const title =
    typeof payload.title === "string" ? payload.title.trim() : "";
  const description =
    typeof payload.description === "string" ? payload.description.trim() : "";
  const isPublic = payload.isPublic === true;

  formData.append("title", title);
  formData.append("description", description);
  formData.append("isPublic", String(isPublic));

  if (payload.coverImage instanceof File) {
    formData.append("coverImage", payload.coverImage);
  }

  const response = await axiosClient.post(
    `${USER_PLAYLIST_API_PREFIX}/playlists`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response?.data?.data?.playlist ?? response?.data?.data ?? null;
};

export const updateUserPlaylist = async (playlistId, payload = {}) => {
  const formData = new FormData();
  const title =
    typeof payload.title === "string" ? payload.title.trim() : "";
  const description =
    typeof payload.description === "string" ? payload.description.trim() : "";
  const isPublic = payload.isPublic === true;

  formData.append("title", title);
  formData.append("description", description);
  formData.append("isPublic", String(isPublic));

  if (payload.coverImage instanceof File) {
    formData.append("coverImage", payload.coverImage);
  }

  const response = await axiosClient.patch(
    `${USER_PLAYLIST_API_PREFIX}/playlists/${playlistId}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response?.data?.data?.playlist ?? response?.data?.data ?? null;
};

export const addTrackToUserPlaylist = async (playlistId, trackId) => {
  const response = await axiosClient.post(
    `${USER_PLAYLIST_API_PREFIX}/playlists/${playlistId}/tracks`,
    {
      trackId,
    }
  );

  return response?.data?.data?.playlist ?? response?.data?.data ?? null;
};

export const deleteUserPlaylist = async (playlistId) => {
  const response = await axiosClient.delete(
    `${USER_PLAYLIST_API_PREFIX}/playlists/${playlistId}`
  );

  return response?.data?.data ?? null;
};
