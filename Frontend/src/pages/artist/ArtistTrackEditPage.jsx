import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Save, Send } from "lucide-react";
import TrackCopyrightFields from "../../components/artist/TrackCopyrightFields";
import ConfirmActionModal from "../../components/common/ConfirmActionModal";
import genreService from "../../services/genreService";
import trackService from "../../services/trackService";
import { routePaths } from "../../routes/routePaths";
import { getApiErrorFullMessage, getApiErrorMessage } from "../../utils/apiError";
import {
  canArtistEditTrack,
  canArtistSubmitTrack,
  getSubmitReadinessIssues,
  mapTrackCopyrightToForm,
  MAX_GENRE_IDS,
  serializeCopyrightForApi,
  TITLE_MAX_LENGTH,
} from "../../utils/trackWorkflow";

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
  const location = useLocation();
  const [track, setTrack] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittingForApproval, setSubmittingForApproval] = useState(false);
  const [copyrightForm, setCopyrightForm] = useState(mapTrackCopyrightToForm());
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
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
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    versionTitle: "",
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
        setCopyrightForm(mapTrackCopyrightToForm(trackDetail?.copyright));
        setFormData({
          title: trackDetail?.title || "",
          versionTitle: trackDetail?.versionTitle || "",
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
  const canEdit = canArtistEditTrack(track);
  const canSubmit = canArtistSubmitTrack(track);
  const submitIssues = useMemo(
    () =>
      getSubmitReadinessIssues(
        track
          ? {
              ...track,
              genres: track.genres,
              copyright: serializeCopyrightForApi(copyrightForm),
            }
          : null
      ),
    [track, copyrightForm]
  );
  const draftMessage = location.state?.message || "";

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: name === "duration" ? value : value,
    }));
  };

  const handleGenreToggle = (genreId) => {
    const nextGenreId = String(genreId);
    setFormData((current) => {
      if (current.genreIds.includes(nextGenreId)) {
        return {
          ...current,
          genreIds: current.genreIds.filter((item) => item !== nextGenreId),
        };
      }

      if (current.genreIds.length >= MAX_GENRE_IDS) {
        setErrorMessage(`Bạn chỉ có thể chọn tối đa ${MAX_GENRE_IDS} thể loại.`);
        return current;
      }

      return {
        ...current,
        genreIds: [...current.genreIds, nextGenreId],
      };
    });
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

  const validateFormFields = () => {
    const errors = {};
    
    const title = formData.title.trim();
    if (!title) {
      errors.title = "Vui lòng nhập tên bài nhạc.";
    } else if (title.length > TITLE_MAX_LENGTH) {
      errors.title = `Tên bài nhạc không được vượt quá ${TITLE_MAX_LENGTH} ký tự.`;
    }

    if (formData.genreIds.length === 0) {
      errors.genres = "Vui lòng chọn ít nhất một thể loại.";
    }

    const audioFiles = Array.isArray(track?.audioFiles) ? track.audioFiles : [];
    if (audioFiles.length === 0 && !audioFile) {
      errors.audio = "Vui lòng tải lên ít nhất một tệp âm thanh.";
    }

    if (!formData.duration || formData.duration <= 0) {
      errors.duration = "Thời lượng phải lớn hơn 0 giây.";
    }

    const hasAvatar = avatarFile || (track?.avatar && typeof track.avatar === "string" && track.avatar.trim());
    const hasCovers = coverImageFiles.length > 0 || (Array.isArray(track?.coverImage) && track.coverImage.length > 0);
    if (!hasAvatar && !hasCovers) {
      errors.media = "Vui lòng thêm ảnh đại diện bài nhạc hoặc ít nhất một ảnh bìa.";
    }

    if (!copyrightForm.copyrightOwner?.trim()) {
      errors.copyrightOwner = "Vui lòng nhập chủ sở hữu bản quyền.";
    }

    if (!copyrightForm.recordingOwner?.trim()) {
      errors.recordingOwner = "Vui lòng nhập chủ sở hữu bản ghi âm.";
    }

    if (!copyrightForm.declarationAccepted) {
      errors.declarationAccepted = "Vui lòng xác nhận chính sách bản quyền.";
    }

    return errors;
  };

  const handleSubmitForApproval = async () => {
    if (!track || !canSubmit) {
      return;
    }

    const issues = getSubmitReadinessIssues({
      ...track,
      title: formData.title.trim() || track.title,
      duration: formData.duration !== "" ? Number(formData.duration) : track.duration,
      genres: formData.genreIds.map((genreId) => ({ _id: genreId })),
      copyright: serializeCopyrightForApi(copyrightForm),
    });

    if (issues.length > 0) {
      setErrorMessage(
        `Vui lòng hoàn tất các mục sau trước khi gửi duyệt:\n${issues
          .map((item) => `• ${item}`)
          .join("\n")}`
      );
      return;
    }

    setSubmittingForApproval(true);
    setSuccessMessage("");
    setErrorMessage("");
    setIsSubmitConfirmOpen(false);

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
        setIsUploadingMedia(false);
      }

      const savePayload = {
        title: formData.title.trim(),
        versionTitle: formData.versionTitle.trim(),
        duration: Number(formData.duration),
        lyricsStatic: formData.lyricsStatic,
        album_albumId: formData.album_albumId,
        genreIds: formData.genreIds,
        releaseDate: formData.releaseDate || null,
        copyright: serializeCopyrightForApi(copyrightForm),
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
        savePayload.audioFiles = uploadedMedia.audioFiles;
      }

      const savedTrack = await trackService.updateArtistTrack(id, savePayload);
      setTrack(savedTrack);

      await trackService.submitForApproval(id);
      navigate(routePaths.artistTrackDetail(id), {
        state: { message: "Đã gửi bài nhạc lên để chờ phê duyệt." },
      });
    } catch (error) {
      setErrorMessage(
        getApiErrorFullMessage(error, "Không thể gửi bài nhạc để phê duyệt.")
      );
    } finally {
      setSubmittingForApproval(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canEdit) {
      setErrorMessage("Bài nhạc này không thể chỉnh sửa ở trạng thái phê duyệt hiện tại.");
      return;
    }

    setSuccessMessage("");
    setErrorMessage("");
    setFieldErrors({});

    const errors = validateFormFields();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);

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
        versionTitle: formData.versionTitle.trim(),
        duration: Number(formData.duration),
        lyricsStatic: formData.lyricsStatic,
        album_albumId: formData.album_albumId,
        genreIds: formData.genreIds,
        releaseDate: formData.releaseDate || null,
        copyright: serializeCopyrightForApi(copyrightForm),
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
      setSuccessMessage("Đã cập nhật bài nhạc thành công.");

      setTimeout(() => {
        navigate(routePaths.artistMusic);
      }, 900);

      setAudioFile(null);
      setAvatarFile(null);
      setCoverImageFiles([]);
      setLyricsSyncFile(null);
    } catch (error) {
      setErrorMessage(
        getApiErrorFullMessage(error, "Không thể cập nhật bài nhạc lúc này.")
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
            Complete draft details, copyright, and media, then submit for admin approval.
          </p>
        </div>

        {draftMessage ? (
          <div className="mt-4 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            {draftMessage}
          </div>
        ) : null}

        {!canEdit ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            This track is {track?.approvalStatus || "locked"} and cannot be edited.
            {track?.approvalStatus === "rejected" && track?.rejectReason
              ? ` Reason: ${track.rejectReason}`
              : ""}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 whitespace-pre-line rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {errorMessage}
          </div>
        ) : null}

        {canSubmit ? (
          <div className="mt-4 rounded-md border border-neutral-200 bg-white p-4">
            <p className="text-sm font-medium text-[#241b15]">Submit readiness</p>
            {submitIssues.length === 0 ? (
              <p className="mt-2 text-sm text-emerald-700">
                All required fields look ready. Save changes, then submit for approval.
              </p>
            ) : (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-600">
                {submitIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="rounded-md border border-neutral-200 bg-[#fcfaf7] p-4">
            <p className="text-sm font-medium text-[#241b15]">Media *</p>
            <p className={`mt-1 text-xs ${
              fieldErrors.audio || fieldErrors.media ? "text-red-500" : "text-neutral-600"
            }`}>
              {fieldErrors.audio || fieldErrors.media || "Upload or verify your audio, avatar, and cover images."}
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[#241b15]">
                  Audio file {!audioPreviewUrl && !audioFile ? "*" : ""}
                </label>
                <input
                  type="file"
                  accept=".mp3,.wav,.flac,.aac,.m4a,audio/mpeg,audio/wav,audio/flac,audio/aac,audio/mp4"
                  onChange={handleAudioChange}
                  className={`mt-2 w-full rounded-md border px-3 py-2 text-sm ${
                    fieldErrors.audio
                      ? "border-red-500"
                      : "border-neutral-200"
                  }`}
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
                  Avatar image {!avatarPreview && !avatarFile ? "*" : ""}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className={`mt-2 w-full rounded-md border px-3 py-2 text-sm ${
                    fieldErrors.media
                      ? "border-red-500"
                      : "border-neutral-200"
                  }`}
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
                maxLength={TITLE_MAX_LENGTH}
                disabled={!canEdit || submitting}
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
                Version title
              </label>
              <input
                type="text"
                name="versionTitle"
                value={formData.versionTitle}
                onChange={handleInputChange}
                disabled={!canEdit || submitting}
                className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-[#8b5e3c] focus:outline-none"
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
                disabled={!canEdit || submitting}
                className={`mt-2 w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
                  fieldErrors.duration
                    ? "border-red-500 focus:border-red-500"
                    : "border-neutral-200 focus:border-[#8b5e3c]"
                }`}
                required
              />
              {fieldErrors.duration && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.duration}</p>
              )}
            </div>
          </div>

          <TrackCopyrightFields
            value={copyrightForm}
            onChange={setCopyrightForm}
            disabled={!canEdit || submitting}
            errors={fieldErrors}
          />

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
              Genres *
            </label>
            <p className={`mt-1 text-xs ${
              fieldErrors.genres ? "text-red-500" : "text-neutral-500"
            }`}>
              {fieldErrors.genres || `Select at least one genre (max ${MAX_GENRE_IDS})`}
            </p>
            <button
              type="button"
              onClick={() => setGenresOpen((current) => !current)}
              disabled={!canEdit || submitting}
              className={`mt-2 w-full rounded-md border px-3 py-2 text-left text-sm flex items-center justify-between ${
                fieldErrors.genres
                  ? "border-red-500"
                  : "border-neutral-200"
              }`}
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

          <div className="flex flex-wrap gap-2 pt-4">
            <button
              type="submit"
              disabled={!canEdit || submitting || submittingForApproval}
              className="inline-flex items-center gap-2 rounded-md bg-[#8b5e3c] px-4 py-2 font-medium text-white hover:bg-[#6d4a2f] disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {submitting
                ? isUploadingMedia
                  ? "Uploading media..."
                  : "Saving..."
                : "Save draft changes"}
            </button>

            {canSubmit ? (
              <button
                type="button"
                onClick={() => {
                  setSuccessMessage("");
                  setErrorMessage("");
                  setIsSubmitConfirmOpen(true);
                }}
                disabled={!canEdit || submitting || submittingForApproval || submitIssues.length > 0}
                className="inline-flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-4 py-2 font-medium text-sky-900 hover:bg-sky-100 disabled:opacity-50"
              >
                {submittingForApproval ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {submittingForApproval ? "Đang gửi duyệt..." : "Gửi duyệt bài nhạc"}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => navigate(routePaths.artistTrackDetail(id))}
              className="rounded-md border border-neutral-200 px-4 py-2 font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>

      <ConfirmActionModal
        isOpen={isSubmitConfirmOpen}
        title="Gửi duyệt bài nhạc?"
        message="Sau khi gửi duyệt, bạn sẽ không thể chỉnh sửa bài nhạc trong thời gian chờ phê duyệt. Bạn có muốn tiếp tục không?"
        confirmText="Xác nhận gửi duyệt"
        cancelText="Quay lại"
        isLoading={submittingForApproval}
        onCancel={() => setIsSubmitConfirmOpen(false)}
        onConfirm={handleSubmitForApproval}
      />
    </section>
  );
};

export default ArtistTrackEditPage;
