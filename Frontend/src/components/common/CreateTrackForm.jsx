import { useState, useEffect } from "react";
import trackService from "../../services/trackService";
import AudioQualityDisplay from "./AudioQualityDisplay";
import AudioQualityPreview from "./AudioQualityPreview";

const CreateTrackForm = () => {
  const [formData, setFormData] = useState({
    title: "",
    duration: "",
    audioFiles: [],
    avatar: "",
    coverImage: [],
    lyricsStatic: "",
    lyricsSyncUrl: "",
    album_albumId: "",
    genreIds: [],
    activeStatus: "draft",
    releaseDate: "",
  });

  const [audioFiles, setAudioFiles] = useState([]);
  const [coverImages, setCoverImages] = useState([]);
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingQualities, setUploadingQualities] = useState(false);
  const [uploadedQualities, setUploadedQualities] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [albums, setAlbums] = useState([]);
  const [albumsLoading, setAlbumsLoading] = useState(true);

  // Mock data for dropdowns
  const genreOptions = [
    { id: "681300000000000000000201", name: "Seed Lofi" },
    { id: "681300000000000000000202", name: "Seed Pop" },
    { id: "681300000000000000000203", name: "Seed Talk" },
  ];

  const statusOptions = [
    { value: "draft", label: "Draft" },
    { value: "active", label: "Active" },
    { value: "hidden", label: "Hidden" },
    { value: "blocked", label: "Blocked" },
  ];

  // Fetch artist albums on mount
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "duration" ? parseFloat(value) || "" : value,
    }));
  };

  const handleAudioFilesChange = (e) => {
    const files = Array.from(e.target.files);
    setAudioFiles((prev) => [...prev, ...files]);
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

  const handleRemoveAudioFile = (index) => {
    setAudioFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveCoverImage = (index) => {
    setCoverImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
  };

  const handleGenreToggle = (genreId) => {
    setFormData((prev) => ({
      ...prev,
      genreIds: prev.genreIds.includes(genreId)
        ? prev.genreIds.filter((id) => id !== genreId)
        : [...prev.genreIds, genreId],
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
      // Validate required fields
      if (!formData.title.trim()) {
        throw new Error("Title is required");
      }
      if (!formData.duration || formData.duration <= 0) {
        throw new Error("Duration must be a positive number");
      }
      if (audioFiles.length === 0) {
        throw new Error("At least one audio file is required");
      }

      // Show uploading status
      setUploadingQualities(true);

      // Upload files to backend
      const uploadResponse = await trackService.uploadFiles(
        audioFiles,
        avatarFile,
        coverImages
      );

      if (!uploadResponse.success) {
        throw new Error("File upload failed");
      }

      const { audioFiles: uploadedAudioUrls, avatar: avatarUrl, coverImages: uploadedCoverUrls } =
        uploadResponse.data;

      // Store and display uploaded qualities
      setUploadedQualities(uploadedAudioUrls || []);
      setUploadingQualities(false);

      // Show success message with quality info
      const qualityCount = uploadedAudioUrls?.length || 0;
      setSuccessMessage(
        `✓ Files processed successfully! ${qualityCount} quality versions created.`
      );

      // Create track with uploaded URLs
      const trackDataToSubmit = {
        ...formData,
        audioFiles: uploadedAudioUrls,
        coverImage: uploadedCoverUrls,
        avatar: avatarUrl || formData.avatar,
      };

      const response = await trackService.createTrack(trackDataToSubmit);

      if (response.success) {
        setSuccessMessage(response.message || "Track created successfully!");
        // Reset form
        setFormData({
          title: "",
          duration: "",
          audioFiles: [],
          avatar: "",
          coverImage: [],
          lyricsStatic: "",
          lyricsSyncUrl: "",
          album_albumId: "",
          genreIds: [],
          activeStatus: "draft",
          releaseDate: "",
        });
        setAudioFiles([]);
        setCoverImages([]);
        setAvatarFile(null);
        setUploadedQualities([]);

        // Clear messages after 3 seconds
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

      {/* Audio Quality Display */}
      {(uploadedQualities.length > 0 || uploadingQualities) && (
        <AudioQualityDisplay
          qualities={uploadedQualities}
          isLoading={uploadingQualities}
        />
      )}

      {/* Audio Quality Preview */}
      {uploadedQualities.length > 0 && !uploadingQualities && (
        <AudioQualityPreview qualities={uploadedQualities} />
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Title */}
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

        {/* Duration */}
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

        {/* Audio Files Upload */}
        <div>
          <label className="block text-sm font-medium text-[#241b15]">
            Audio Files * (Upload MP3, WAV, MP4, etc.)
          </label>
          <p className="mt-1 text-xs text-neutral-500">
            💡 We'll automatically create 4 quality versions: High (320k), Medium (192k), Low (128k), Lowest (96k)
          </p>
          <input
            type="file"
            multiple
            accept="audio/*,video/mp4"
            onChange={handleAudioFilesChange}
            disabled={loading}
            className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm disabled:bg-neutral-100"
          />
          {audioFiles.length > 0 && (
            <p className="mt-2 text-sm text-neutral-600">
              {audioFiles.length} file(s) selected
            </p>
          )}
          <div className="mt-2 space-y-2">
            {audioFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-md bg-neutral-50 p-2"
              >
                <p className="truncate text-sm text-neutral-700">
                  {file.name}
                </p>
                <button
                  type="button"
                  onClick={() => handleRemoveAudioFile(index)}
                  disabled={loading}
                  className="ml-2 text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Avatar Upload */}
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

        {/* Cover Images Upload */}
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

        {/* Lyrics Static */}
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

        {/* Lyrics Sync URL */}
        <div>
          <label className="block text-sm font-medium text-[#241b15]">
            Sync Lyrics URL (LRC file)
          </label>
          <input
            type="text"
            name="lyricsSyncUrl"
            value={formData.lyricsSyncUrl}
            onChange={handleInputChange}
            placeholder="https://example.com/lyrics.lrc"
            className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-[#8b5e3c] focus:outline-none"
          />
        </div>

        {/* Genres */}
        <div>
          <label className="block text-sm font-medium text-[#241b15]">
            Genres
          </label>
          <div className="mt-2 space-y-2">
            {genreOptions.map((genre) => (
              <label
                key={genre.id}
                className="flex items-center gap-2 text-sm text-neutral-700"
              >
                <input
                  type="checkbox"
                  checked={formData.genreIds.includes(genre.id)}
                  onChange={() => handleGenreToggle(genre.id)}
                  className="rounded border-neutral-300"
                />
                {genre.name}
              </label>
            ))}
          </div>
        </div>

        {/* Album */}
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

        {/* Active Status */}
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

        {/* Release Date */}
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

        {/* Submit Button */}
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