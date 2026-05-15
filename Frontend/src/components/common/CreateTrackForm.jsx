import { useState, useEffect } from "react";
import trackService from "../../services/trackService";
import genreService from "../../services/genreService";
import AudioQualityDisplay from "./AudioQualityDisplay";
import AudioQualityPreview from "./AudioQualityPreview";

const CreateTrackForm = () => {
  const [formData, setFormData] = useState({
    title: "",
    duration: "",
    avatar: "",
    coverImage: [],
    lyricsStatic: "",
    album_albumId: "",
    genreIds: [],
    activeStatus: "draft",
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

  const statusOptions = [
    { value: "draft", label: "Draft" },
    { value: "active", label: "Active" },
    { value: "hidden", label: "Hidden" },
    { value: "blocked", label: "Blocked" },
  ];

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
    setFormData((prev) => ({
      ...prev,
      genreIds: prev.genreIds.includes(id)
        ? prev.genreIds.filter((g) => g !== id)
        : [...prev.genreIds, id],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    setUploadedQualities([]);
    setUploadingQualities(false);

    try {
      if (!formData.title.trim()) {
        throw new Error("Title is required");
      }
      if (!formData.duration || formData.duration <= 0) {
        throw new Error("Duration must be a positive number");
      }
      if (!audioFile) {
        throw new Error("Please upload exactly one audio file for this track");
      }

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

      const {
        audioFiles: uploadedAudioUrls,
        avatar: avatarUrl,
        coverImages: uploadedCoverUrls,
        lyricsSyncUrl: uploadedLyricsSyncUrl,
      } = uploadResponse.data;

      setUploadedQualities(uploadedAudioUrls || []);
      setUploadingQualities(false);

      const qualityCount = uploadedAudioUrls?.length || 0;
      setSuccessMessage(
        `✓ Files processed successfully! ${qualityCount} quality version(s) created.`
      );

      const trackDataToSubmit = {
        ...formData,
        lyricsSyncUrl: uploadedLyricsSyncUrl || "",
        audioFiles: uploadedAudioUrls,
        coverImage: uploadedCoverUrls,
        avatar: avatarUrl || formData.avatar,
      };

      const response = await trackService.createTrack(trackDataToSubmit);

      if (response.success) {
        setSuccessMessage(response.message || "Track created successfully!");
        setFormData({
          title: "",
          duration: "",
          avatar: "",
          coverImage: [],
          lyricsStatic: "",
          album_albumId: "",
          genreIds: [],
          activeStatus: "draft",
          releaseDate: "",
        });
        setAudioFile(null);
        setLyricsSyncFile(null);
        setCoverImages([]);
        setAvatarFile(null);
        setUploadedQualities([]);

        setTimeout(() => {
          setSuccessMessage("");
          setUploadedQualities([]);
        }, 3000);
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to create track";
      setErrorMessage(errorMsg);
      setUploadingQualities(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-[#241b15]">Create New Track</h3>
      <p className="mt-2 text-sm text-neutral-600">
        Upload your track details and media files
      </p>

      {successMessage && (
        <div className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
          ✓ {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
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
            className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-[#8b5e3c] focus:outline-none"
            required
          />
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
            className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-[#8b5e3c] focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#241b15]">
            Audio file * (one file per track)
          </label>
          <p className="mt-1 text-xs text-neutral-500">
            One upload is transcoded into multiple qualities (e.g. 320k, 192k, 128k, 96k).
          </p>
          <input
            type="file"
            accept="audio/*,video/mp4"
            onChange={handleAudioFileChange}
            disabled={loading}
            className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm disabled:bg-neutral-100"
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
            Track Avatar (Image)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            disabled={loading}
            className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm disabled:bg-neutral-100"
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
          <label className="block text-sm font-medium text-[#241b15]">
            Cover Images (Upload images)
          </label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleCoverImagesChange}
            disabled={loading}
            className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm disabled:bg-neutral-100"
          />
          {coverImages.length > 0 && (
            <p className="mt-2 text-sm text-neutral-600">
              {coverImages.length} file(s) selected
            </p>
          )}
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

        <div>
          <label className="block text-sm font-medium text-[#241b15]">
            Genres
          </label>
          <p className="mt-1 text-xs text-neutral-500">
            Chọn một hoặc nhiều thể loại bằng cách tick vào ô tương ứng.
          </p>
          {genresLoading ? (
            <p className="mt-2 text-sm text-neutral-600">Loading genres...</p>
          ) : genres.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-600">
              No genres available. Seed the database or add genres in admin.
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {genres.map((genre) => {
                const id = String(genre._id);
                return (
                  <label
                    key={id}
                    className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700"
                  >
                    <input
                      type="checkbox"
                      checked={formData.genreIds.includes(id)}
                      onChange={() => handleGenreToggle(id)}
                      disabled={loading}
                      className="h-4 w-4 rounded border-neutral-300 text-[#8b5e3c] focus:ring-[#8b5e3c]"
                    />
                    <span>{genre.name}</span>
                  </label>
                );
              })}
            </div>
          )}
          {formData.genreIds.length > 0 && (
            <p className="mt-2 text-sm text-neutral-600">
              Đã chọn {formData.genreIds.length} thể loại
            </p>
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
            Active Status
          </label>
          <select
            name="activeStatus"
            value={formData.activeStatus}
            onChange={handleInputChange}
            className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-[#8b5e3c] focus:outline-none"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-[#8b5e3c] px-4 py-2 font-medium text-white hover:bg-[#6d4a2f] disabled:opacity-50"
          >
            {loading ? "Uploading & Creating..." : "Create Track"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTrackForm;
