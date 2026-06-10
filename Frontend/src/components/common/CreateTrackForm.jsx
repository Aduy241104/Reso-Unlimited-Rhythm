import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import trackService from "../../services/trackService";
import genreService from "../../services/genreService";
import { routePaths } from "../../routes/routePaths";
import { getApiErrorFullMessage } from "../../utils/apiError";
import { MAX_GENRE_IDS, TITLE_MAX_LENGTH, mapTrackCopyrightToForm, serializeCopyrightForApi } from "../../utils/trackWorkflow";
import AudioQualityDisplay from "./AudioQualityDisplay";
import AudioQualityPreview from "./AudioQualityPreview";
import TrackCopyrightFields from "../artist/TrackCopyrightFields";

const CreateTrackForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    versionTitle: "",
    duration: "",
    avatar: "",
    coverImage: [],
    lyricsStatic: "",
    album_albumId: "",
    genreIds: [],
    releaseDate: "",
  });

  const [audioFile, setAudioFile] = useState(null);
  const [coverImages, setCoverImages] = useState([]);
  const [avatarFile, setAvatarFile] = useState(null);
  const [lyricsSyncFile, setLyricsSyncFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingQualities, setUploadingQualities] = useState(false);
  const [uploadedQualities, setUploadedQualities] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [albums, setAlbums] = useState([]);
  const [albumsLoading, setAlbumsLoading] = useState(true);
  const [genres, setGenres] = useState([]);
  const [genresLoading, setGenresLoading] = useState(true);
  const [genresOpen, setGenresOpen] = useState(false);
  const [copyrightForm, setCopyrightForm] = useState(mapTrackCopyrightToForm());
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const response = await trackService.getArtistAlbums();
        if (response.success) {
          setAlbums(response.data.albums || []);
        }
      } catch (error) {
        console.error("Failed to fetch albums:", error);
      } finally {
        setAlbumsLoading(false);
      }
    };

    fetchAlbums();
  }, []);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const list = await genreService.getGenresService();
        setGenres(Array.isArray(list) ? list : []);
      } catch (error) {
        console.error("Failed to fetch genres:", error);
        setGenres([]);
      } finally {
        setGenresLoading(false);
      }
    };

    fetchGenres();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "duration" ? parseFloat(value) || "" : value,
    }));
  };

  const handleAudioFileChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    setAudioFile(file);
  };

  const handleCoverImagesChange = (e) => {
    const files = Array.from(e.target.files);
    setCoverImages((prev) => [...prev, ...files]);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
    }
  };

  const handleLyricsSyncChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    setLyricsSyncFile(file);
  };

  const handleRemoveCoverImage = (index) => {
    setCoverImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
  };

  const handleGenreToggle = (genreId) => {
    const id = String(genreId);
    setFormData((prev) => {
      if (prev.genreIds.includes(id)) {
        return {
          ...prev,
          genreIds: prev.genreIds.filter((g) => g !== id),
        };
      }

      if (prev.genreIds.length >= MAX_GENRE_IDS) {
        setErrorMessage(`You can select at most ${MAX_GENRE_IDS} genres.`);
        return prev;
      }

      return {
        ...prev,
        genreIds: [...prev.genreIds, id],
      };
    });
  };

  const navigateToMusicPage = () => {
    navigate(routePaths.artistMusic);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setFieldErrors({});

    const errors = {};
    const title = formData.title.trim();

    if (!title) {
      errors.title = "Title is required.";
    } else if (title.length > TITLE_MAX_LENGTH) {
      errors.title = `Title cannot exceed ${TITLE_MAX_LENGTH} characters.`;
    }

    if (formData.genreIds.length === 0) {
      errors.genres = "Select at least one genre.";
    }

    if (!audioFile) {
      errors.audio = "Upload at least one audio file.";
    }

    if (!formData.duration || formData.duration <= 0) {
      errors.duration = "Duration must be greater than 0 seconds.";
    }

    if (!avatarFile && coverImages.length === 0) {
      errors.media = "Add a track avatar or at least one cover image.";
    }

    if (!copyrightForm.copyrightOwner?.trim()) {
      errors.copyrightOwner = "Copyright owner is required.";
    }

    if (!copyrightForm.recordingOwner?.trim()) {
      errors.recordingOwner = "Recording owner is required.";
    }

    if (!copyrightForm.declarationAccepted) {
      errors.declarationAccepted = "Accept the copyright declaration.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    setUploadedQualities([]);
    setUploadingQualities(false);

    try {
      let uploadedAudioUrls = [];
      let avatarUrl = formData.avatar || "";
      let uploadedCoverUrls = [];
      let uploadedLyricsSyncUrl = "";

      const shouldUploadMedia = Boolean(
        audioFile || avatarFile || coverImages.length > 0 || lyricsSyncFile
      );

      if (shouldUploadMedia) {
        setUploadingQualities(true);

        const uploadResponse = await trackService.uploadFiles(
          audioFile,
          avatarFile,
          coverImages,
          lyricsSyncFile
        );

        if (!uploadResponse.success) {
          throw new Error("File upload failed");
        }

        ({
          audioFiles: uploadedAudioUrls = [],
          avatar: avatarUrl = "",
          coverImages: uploadedCoverUrls = [],
          lyricsSyncUrl: uploadedLyricsSyncUrl = "",
        } = uploadResponse.data || {});

        setUploadedQualities(uploadedAudioUrls || []);
        setUploadingQualities(false);
      }

      const trackDataToSubmit = {
        title,
        versionTitle: formData.versionTitle?.trim() || "",
        album_albumId: formData.album_albumId,
        genreIds: formData.genreIds,
        lyricsStatic: formData.lyricsStatic,
        releaseDate: formData.releaseDate || null,
        lyricsSyncUrl: uploadedLyricsSyncUrl || "",
        audioFiles: uploadedAudioUrls,
        coverImage: uploadedCoverUrls,
        avatar: avatarUrl,
        copyright: serializeCopyrightForApi(copyrightForm),
      };

      if (formData.duration !== "" && formData.duration !== null) {
        trackDataToSubmit.duration = Number(formData.duration);
      }

      const response = await trackService.createTrack(trackDataToSubmit);

      if (response.success) {
        navigate(routePaths.artistMusic, {
          state: {
            message: "Draft track created successfully.",
          },
        });
      }
    } catch (error) {
      setErrorMessage(getApiErrorFullMessage(error, "Failed to create track"));
      setUploadingQualities(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-[#241b15]">Create New Track</h3>
      <p className="mt-2 text-sm text-neutral-600">
        Save a draft with a title first. Upload media, genres, cover, and copyright on
        the edit page, then submit for approval when everything is ready.
      </p>

      {successMessage && (
        <div className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
          ✓ {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 whitespace-pre-line rounded-md bg-red-50 p-3 text-sm text-red-700">
          ✗ {errorMessage}
        </div>
      )}

      {(uploadedQualities.length > 0 || uploadingQualities) && (
        <AudioQualityDisplay
          qualities={uploadedQualities}
          isLoading={uploadingQualities}
        />
      )}

      {uploadedQualities.length > 0 && !uploadingQualities && (
        <AudioQualityPreview qualities={uploadedQualities} />
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-[#241b15]">
            Track Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Enter track title"
            maxLength={TITLE_MAX_LENGTH}
            className={`mt-2 w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
              fieldErrors.title
                ? "border-red-500 focus:border-red-500"
                : "border-neutral-200 focus:border-[#8b5e3c]"
            }`}
            required
          />
          {fieldErrors.title && (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.title}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[#241b15]">
            Version title (optional)
          </label>
          <input
            type="text"
            name="versionTitle"
            value={formData.versionTitle}
            onChange={handleInputChange}
            placeholder="e.g. Acoustic, Live, Remix"
            className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-[#8b5e3c] focus:outline-none"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Use this to distinguish versions with the same main title.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#241b15]">
            Duration (seconds) *
          </label>
          <input
            type="number"
            name="duration"
            value={formData.duration}
            onChange={handleInputChange}
            placeholder="e.g., 240"
            min="1"
            step="1"
            className={`mt-2 w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
              fieldErrors.duration
                ? "border-red-500 focus:border-red-500"
                : "border-neutral-200 focus:border-[#8b5e3c]"
            }`}
          />
          {fieldErrors.duration ? (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.duration}</p>
          ) : (
            <p className="mt-1 text-xs text-neutral-500">
              Required before submit for approval.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[#241b15]">
            Audio file *
          </label>
          <p className={`mt-1 text-xs ${
            fieldErrors.audio ? "text-red-500" : "text-neutral-500"
          }`}>
            {fieldErrors.audio || "One upload is transcoded into multiple qualities (e.g. 320k, 192k, 128k, 96k)."}
          </p>
          <input
            type="file"
            accept="audio/*,video/mp4"
            onChange={handleAudioFileChange}
            disabled={loading}
            className={`mt-2 w-full rounded-md border px-3 py-2 text-sm disabled:bg-neutral-100 ${
              fieldErrors.audio
                ? "border-red-500"
                : "border-neutral-200"
            }`}
          />
          {audioFile && (
            <div className="mt-2 flex items-center justify-between rounded-md bg-neutral-50 p-2">
              <p className="truncate text-sm text-neutral-700">{audioFile.name}</p>
              <button
                type="button"
                onClick={() => setAudioFile(null)}
                disabled={loading}
                className="ml-2 text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[#241b15]">
            Track Avatar or Cover Images *
          </label>
          <p className={`mt-1 text-xs ${
            fieldErrors.media ? "text-red-500" : "text-neutral-500"
          }`}>
            {fieldErrors.media || "Upload at least one avatar or cover image."}
          </p>
          <div className="mt-2 space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#241b15]">Avatar</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={loading}
                className={`mt-1 w-full rounded-md border px-3 py-2 text-sm disabled:bg-neutral-100 ${
                  fieldErrors.media && !avatarFile && coverImages.length === 0
                    ? "border-red-500"
                    : "border-neutral-200"
                }`}
              />
              {avatarFile && (
                <div className="mt-2 flex items-center justify-between rounded-md bg-neutral-50 p-2">
                  <p className="truncate text-sm text-neutral-700">
                    {avatarFile.name}
                  </p>
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={loading}
                    className="ml-2 text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#241b15]">Cover Images</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleCoverImagesChange}
                disabled={loading}
                className={`mt-1 w-full rounded-md border px-3 py-2 text-sm disabled:bg-neutral-100 ${
                  fieldErrors.media && !avatarFile && coverImages.length === 0
                    ? "border-red-500"
                    : "border-neutral-200"
                }`}
              />
              {coverImages.length > 0 && (
                <div className="mt-2 space-y-2">
                  {coverImages.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-md bg-neutral-50 p-2"
                    >
                      <p className="truncate text-sm text-neutral-700">
                        {file.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRemoveCoverImage(index)}
                        disabled={loading}
                        className="ml-2 text-red-500 hover:text-red-700 disabled:opacity-50"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#241b15]">
            Static Lyrics
          </label>
          <textarea
            name="lyricsStatic"
            value={formData.lyricsStatic}
            onChange={handleInputChange}
            placeholder="Enter track lyrics..."
            rows="4"
            className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-[#8b5e3c] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#241b15]">
            Sync lyrics (.lrc)
          </label>
          <p className="mt-1 text-xs text-neutral-500">
            Optional timed lyrics file. Upload a .lrc file (plain text with timestamps).
          </p>
          <input
            type="file"
            accept=".lrc,text/plain"
            onChange={handleLyricsSyncChange}
            disabled={loading}
            className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm disabled:bg-neutral-100"
          />
          {lyricsSyncFile && (
            <div className="mt-2 flex items-center justify-between rounded-md bg-neutral-50 p-2">
              <p className="truncate text-sm text-neutral-700">
                {lyricsSyncFile.name}
              </p>
              <button
                type="button"
                onClick={() => setLyricsSyncFile(null)}
                disabled={loading}
                className="ml-2 text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-[#241b15]">Genres *</label>
          <p className={`mt-1 text-xs ${
            fieldErrors.genres ? "text-red-500" : "text-neutral-500"
          }`}>
            {fieldErrors.genres || `Select up to ${MAX_GENRE_IDS} genres.`}
          </p>

          {genresLoading ? (
            <p className="mt-2 text-sm text-neutral-600">Loading genres...</p>
          ) : genres.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-600">No genres available. Seed the database or add genres in admin.</p>
          ) : (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setGenresOpen((s) => !s)}
                disabled={loading}
                className={`w-full text-left rounded-md border px-3 py-2 text-sm flex items-center justify-between ${
                  fieldErrors.genres
                    ? "border-red-500"
                    : "border-neutral-200"
                }`}
              >
                <div className="truncate">
                  {formData.genreIds.length === 0
                    ? "Select genres..."
                    : genres
                        .filter((g) => formData.genreIds.includes(String(g._id)))
                        .map((g) => g.name)
                        .join(", ")}
                </div>
                <div className="ml-2 text-neutral-500">▾</div>
              </button>

              {genresOpen && (
                <div className="absolute z-20 mt-2 w-full max-h-56 overflow-auto rounded-md border border-neutral-200 bg-white p-2 shadow">
                  {genres.map((genre) => {
                    const id = String(genre._id);
                    return (
                      <label
                        key={id}
                        className="flex items-center gap-2 px-2 py-1 text-sm text-neutral-700 hover:bg-neutral-50"
                      >
                        <input
                          type="checkbox"
                          checked={formData.genreIds.includes(id)}
                          onChange={() => handleGenreToggle(id)}
                          disabled={loading}
                          className="h-4 w-4 rounded border-neutral-300 text-[#8b5e3c] focus:ring-[#8b5e3c]"
                        />
                        <span className="truncate">{genre.name}</span>
                      </label>
                    );
                  })}
                  <div className="mt-2 flex items-center justify-between px-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, genreIds: [] }));
                      }}
                      className="text-sm text-red-500"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenresOpen(false)}
                      className="text-sm text-neutral-700"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {formData.genreIds.length > 0 && (
            <p className="mt-2 text-sm text-neutral-600">Đã chọn {formData.genreIds.length} thể loại</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[#241b15]">
            Album (Optional)
          </label>
          {albumsLoading ? (
            <p className="mt-2 text-sm text-neutral-600">Loading albums...</p>
          ) : (
            <select
              name="album_albumId"
              value={formData.album_albumId}
              onChange={handleInputChange}
              className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-[#8b5e3c] focus:outline-none"
            >
              <option value="">Select an album (optional)</option>
              {albums.length === 0 ? (
                <option disabled>No albums available</option>
              ) : (
                albums.map((album) => (
                  <option key={album._id} value={album._id}>
                    {album.title}
                  </option>
                ))
              )}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[#241b15]">
            Release Date
          </label>
          <input
            type="date"
            name="releaseDate"
            value={formData.releaseDate}
            onChange={handleInputChange}
            className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-[#8b5e3c] focus:outline-none"
          />
        </div>

        <TrackCopyrightFields
          value={copyrightForm}
          onChange={setCopyrightForm}
          disabled={loading}
          errors={fieldErrors}
        />

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-[#8b5e3c] px-4 py-2 font-medium text-white hover:bg-[#6d4a2f] disabled:opacity-50"
          >
            {loading
              ? uploadingQualities
                ? "Uploading media..."
                : "Saving draft..."
              : "Save draft"}
          </button>
          <button
            type="button"
            onClick={navigateToMusicPage}
            disabled={loading}
            className="rounded-md border border-neutral-300 px-4 py-2 font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTrackForm;
