import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import genreService from "../../services/genreService";
import trackService from "../../services/trackService";
import { routePaths } from "../../routes/routePaths";
import { getApiErrorMessage } from "../../utils/apiError";

const toDateInputValue = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
};

// (removed unused helper)

const ArtistTrackEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [track, setTrack] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverImageFiles, setCoverImageFiles] = useState([]);
  const [lyricsSyncFile, setLyricsSyncFile] = useState(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [coverPreviews, setCoverPreviews] = useState([]);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState("");
  const [lyricsPreviewText, setLyricsPreviewText] = useState("");
  const objectUrlsRef = useRef([]);
  const [genresOpen, setGenresOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    duration: "",
    lyricsStatic: "",
    album_albumId: "",
    genreIds: [],
    releaseDate: "",
  });

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const [trackDetail, albumResponse, genreList] = await Promise.all([
          trackService.getArtistTrackDetail(id),
          trackService.getArtistAlbums(),
          genreService.getGenresService(),
        ]);

        if (!isMounted) {
          return;
        }

        setTrack(trackDetail);
        setAvatarPreview(trackDetail?.avatar || "");
        setCoverPreviews(Array.isArray(trackDetail?.coverImage) ? trackDetail.coverImage : []);
        setAudioPreviewUrl(
          Array.isArray(trackDetail?.audioFiles) && trackDetail.audioFiles.length > 0
            ? trackDetail.audioFiles[0].url
            : ""
        );
        setLyricsPreviewText(trackDetail?.lyricsSyncUrl ? trackDetail.lyricsSyncUrl.split("/").pop() : "");
        setAlbums(albumResponse?.data?.albums || []);
        setGenres(Array.isArray(genreList) ? genreList : []);
        setFormData({
          title: trackDetail?.title || "",
          duration: trackDetail?.duration ?? "",
          lyricsStatic: trackDetail?.lyricsStatic || "",
          album_albumId: trackDetail?.album?._id || "",
          genreIds: Array.isArray(trackDetail?.genres)
            ? trackDetail.genres.map((genre) => String(genre._id))
            : [],
          releaseDate: toDateInputValue(trackDetail?.releaseDate),
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setTrack(null);
        setErrorMessage(
          getApiErrorMessage(error, "Unable to load track edit data right now.")
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (!id) {
      setLoading(false);
      setErrorMessage("Track id is missing.");
      return () => {
        isMounted = false;
      };
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const genreOptions = useMemo(() => genres || [], [genres]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: name === "duration" ? value : value,
    }));
  };

  const handleGenreToggle = (genreId) => {
    const nextGenreId = String(genreId);
    setFormData((current) => ({
      ...current,
      genreIds: current.genreIds.includes(nextGenreId)
        ? current.genreIds.filter((item) => item !== nextGenreId)
        : [...current.genreIds, nextGenreId],
    }));
  };

  const handleAudioChange = (event) => {
    const file = event.target.files?.[0] || null;
    setAudioFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.push(url);
      setAudioPreviewUrl(url);
    } else {
      const first = Array.isArray(track?.audioFiles) ? track.audioFiles[0] : null;
      setAudioPreviewUrl(first?.url || "");
    }
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0] || null;
    setAvatarFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.push(url);
      setAvatarPreview(url);
    } else {
      setAvatarPreview(track?.avatar || "");
    }
  };

  const handleCoverImageChange = (event) => {
    const files = Array.from(event.target.files || []);
    setCoverImageFiles(files);
    if (files.length > 0) {
      const previews = files.map((f) => {
        const url = URL.createObjectURL(f);
        objectUrlsRef.current.push(url);
        return url;
      });
      setCoverPreviews(previews);
    } else {
      setCoverPreviews(Array.isArray(track?.coverImage) ? track.coverImage : []);
    }
  };

  const handleLyricsSyncChange = (event) => {
    const file = event.target.files?.[0] || null;
    setLyricsSyncFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || "");
        const lines = text.split(/\r?\n/).slice(0, 10).join("\n");
        setLyricsPreviewText(lines);
      };
      reader.readAsText(file);
    } else {
      setLyricsPreviewText(track?.lyricsSyncUrl ? track.lyricsSyncUrl.split("/").pop() : "");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      let uploadedMedia = null;
      const shouldUploadMedia = Boolean(
        audioFile || avatarFile || lyricsSyncFile || coverImageFiles.length > 0
      );

      if (shouldUploadMedia) {
        setIsUploadingMedia(true);
        const uploadResponse = await trackService.uploadFiles(
          audioFile,
          avatarFile,
          coverImageFiles,
          lyricsSyncFile
        );

        uploadedMedia = uploadResponse?.data || null;
      }

      const payload = {
        title: formData.title.trim(),
        duration: Number(formData.duration),
        lyricsStatic: formData.lyricsStatic,
        album_albumId: formData.album_albumId,
        genreIds: formData.genreIds,
        releaseDate: formData.releaseDate || null,
        avatar: uploadedMedia?.avatar || track?.avatar || "",
        coverImage:
          uploadedMedia?.coverImages?.length > 0
            ? uploadedMedia.coverImages
            : Array.isArray(track?.coverImage)
              ? track.coverImage
              : [],
        lyricsSyncUrl:
          uploadedMedia?.lyricsSyncUrl !== undefined && uploadedMedia?.lyricsSyncUrl !== ""
            ? uploadedMedia.lyricsSyncUrl
            : track?.lyricsSyncUrl || "",
      };

      if (uploadedMedia?.audioFiles?.length > 0) {
        payload.audioFiles = uploadedMedia.audioFiles;
      }

      const updatedTrack = await trackService.updateArtistTrack(id, payload);

      setTrack(updatedTrack);
      setAvatarPreview(updatedTrack?.avatar || "");
      setCoverPreviews(Array.isArray(updatedTrack?.coverImage) ? updatedTrack.coverImage : []);
      setAudioPreviewUrl(
        Array.isArray(updatedTrack?.audioFiles) && updatedTrack.audioFiles.length > 0
          ? updatedTrack.audioFiles[0].url
          : ""
      );
      setLyricsPreviewText(updatedTrack?.lyricsSyncUrl ? updatedTrack.lyricsSyncUrl.split("/").pop() : "");
      setSuccessMessage("Track updated successfully.");

      setTimeout(() => {
        navigate(routePaths.artistTrackDetail(id));
      }, 900);

      setAudioFile(null);
      setAvatarFile(null);
      setCoverImageFiles([]);
      setLyricsSyncFile(null);
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Unable to update this track right now.")
      );
    } finally {
      setIsUploadingMedia(false);
      setSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (objectUrlsRef.current && objectUrlsRef.current.length > 0) {
        objectUrlsRef.current.forEach((u) => {
          try {
            URL.revokeObjectURL(u);
          } catch {
            // ignore
          }
        });
        objectUrlsRef.current = [];
      }
    };
  }, []);

  if (loading) {
    return (
      <section className="rounded-md border border-neutral-200 bg-white p-8 text-sm text-neutral-600 shadow-sm">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-[#8b5e3c]" />
          Loading track editor...
        </div>
      </section>
    );
  }

  if (errorMessage && !track) {
    return (
      <section className="rounded-md border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <h2 className="text-lg font-semibold">Could not load track</h2>
        <p className="mt-2 text-sm leading-6">{errorMessage}</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(routePaths.artistTrackDetail(id))}
        className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 transition hover:text-[#8b5e3c]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Track Detail
      </button>

      <div className="rounded-md border border-neutral-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#8b5e3c]">
            Artist Dashboard
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#241b15]">
            Edit Track
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Update the track information, album, genres, and published metadata.
          </p>
        </div>

        {successMessage ? (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {errorMessage}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="rounded-md border border-neutral-200 bg-[#fcfaf7] p-4">
            <p className="text-sm font-medium text-[#241b15]">Replace Media (Optional)</p>
            <p className="mt-1 text-xs text-neutral-600">
              If you upload new media and save, old replaced files will be removed from Cloudinary automatically.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[#241b15]">
                  New audio file
                </label>
                <input
                  type="file"
                  accept="audio/*,video/mp4"
                  onChange={handleAudioChange}
                  className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                />
                {audioFile ? (
                  <p className="mt-2 text-xs text-neutral-600">Selected: {audioFile.name}</p>
                ) : null}
                {audioPreviewUrl ? (
                  <div className="mt-2">
                    <p className="text-xs text-neutral-600">Current / Selected Audio</p>
                    <audio controls src={audioPreviewUrl} className="mt-2 w-full" />
                  </div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#241b15]">
                  New avatar image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                />
                {avatarFile ? (
                  <p className="mt-2 text-xs text-neutral-600">Selected: {avatarFile.name}</p>
                ) : null}
                {avatarPreview ? (
                  <div className="mt-2 flex items-start gap-3">
                    <div>
                      <p className="text-xs text-neutral-600">Current / Selected Avatar</p>
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="mt-2 h-24 w-24 rounded object-cover border border-neutral-200"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[#241b15]">
                  New cover images
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleCoverImageChange}
                  className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                />
                {coverImageFiles.length > 0 ? (
                  <p className="mt-2 text-xs text-neutral-600">
                    Selected: {coverImageFiles.length} file(s)
                  </p>
                ) : null}
                {coverPreviews && coverPreviews.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {coverPreviews.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Cover ${idx + 1}`}
                        className="h-20 w-20 rounded object-cover border border-neutral-200"
                      />
                    ))}
                  </div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#241b15]">
                  New sync lyrics (.lrc)
                </label>
                <input
                  type="file"
                  accept=".lrc,text/plain"
                  onChange={handleLyricsSyncChange}
                  className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                />
                {lyricsSyncFile ? (
                  <p className="mt-2 text-xs text-neutral-600">Selected: {lyricsSyncFile.name}</p>
                ) : null}
                {lyricsPreviewText ? (
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-neutral-50 p-2 text-xs text-neutral-700">
                    {lyricsPreviewText}
                  </pre>
                ) : track?.lyricsSyncUrl ? (
                  <p className="mt-2 text-xs text-neutral-600">Current lyrics: {track.lyricsSyncUrl.split('/').pop()}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[#241b15]">
                Track Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
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
                min="1"
                step="1"
                className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-[#8b5e3c] focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
          </div>

          <div>
            <label className="block text-sm font-medium text-[#241b15]">
              Static Lyrics
            </label>
            <textarea
              name="lyricsStatic"
              value={formData.lyricsStatic}
              onChange={handleInputChange}
              rows="5"
              className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-[#8b5e3c] focus:outline-none"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-[#241b15]">
              Genres
            </label>
            <button
              type="button"
              onClick={() => setGenresOpen((current) => !current)}
              disabled={submitting}
              className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-left text-sm flex items-center justify-between"
            >
              <span className="truncate text-neutral-700">
                {formData.genreIds.length === 0
                  ? "Select genres..."
                  : genreOptions
                      .filter((genre) => formData.genreIds.includes(String(genre._id)))
                      .map((genre) => genre.name)
                      .join(", ")}
              </span>
              <span className="ml-2 text-neutral-500">▾</span>
            </button>

            {genresOpen ? (
              <div className="absolute z-20 mt-2 w-full max-h-56 overflow-auto rounded-md border border-neutral-200 bg-white p-2 shadow">
                {genreOptions.map((genre) => {
                  const idValue = String(genre._id);
                  return (
                    <label
                      key={idValue}
                      className="flex items-center gap-2 px-2 py-1 text-sm text-neutral-700 hover:bg-neutral-50"
                    >
                      <input
                        type="checkbox"
                        checked={formData.genreIds.includes(idValue)}
                        onChange={() => handleGenreToggle(idValue)}
                        disabled={submitting}
                        className="h-4 w-4 rounded border-neutral-300 text-[#8b5e3c] focus:ring-[#8b5e3c]"
                      />
                      <span className="truncate">{genre.name}</span>
                    </label>
                  );
                })}

                <div className="mt-2 flex items-center justify-between px-2">
                  <button
                    type="button"
                    onClick={() => setFormData((current) => ({ ...current, genreIds: [] }))}
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
            ) : null}

            {formData.genreIds.length > 0 ? (
              <p className="mt-2 text-sm text-neutral-600">
                Selected {formData.genreIds.length} genres
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#241b15]">
              Album (Optional)
            </label>
            <select
              name="album_albumId"
              value={formData.album_albumId}
              onChange={handleInputChange}
              className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-[#8b5e3c] focus:outline-none"
            >
              <option value="">No album</option>
              {albums.map((album) => (
                <option key={album._id} value={album._id}>
                  {album.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md bg-[#8b5e3c] px-4 py-2 font-medium text-white hover:bg-[#6d4a2f] disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {submitting
                ? isUploadingMedia
                  ? "Uploading media..."
                  : "Saving..."
                : "Save Changes"}
            </button>

            <button
              type="button"
              onClick={() => navigate(routePaths.artistTrackDetail(id))}
              className="rounded-md border border-neutral-200 px-4 py-2 font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default ArtistTrackEditPage;