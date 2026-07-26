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
  LYRICS_STATIC_MAX_LENGTH,
  mapTrackCopyrightToForm,
  MAX_GENRE_IDS,
  serializeCopyrightForApi,
  TITLE_MAX_LENGTH,
} from "../../utils/trackWorkflow";

const getFormDataFromTrack = (track) => ({
  title: track?.title || "",
  versionTitle: track?.versionTitle || "",
  description: track?.description || "",
  lyricsStatic: track?.lyricsStatic || "",
  genreIds: Array.isArray(track?.genres)
    ? track.genres.map((genre) => String(genre._id || genre.id || genre))
    : [],
});

const sortStringArray = (values = []) =>
  values.map((value) => String(value)).sort();

const areArraysEqual = (left = [], right = []) =>
  JSON.stringify(sortStringArray(left)) === JSON.stringify(sortStringArray(right));

const stringifyValue = (value) => JSON.stringify(value ?? null);

const ArtistTrackEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [track, setTrack] = useState(null);
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
  const [genresOpen, setGenresOpen] = useState(false);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    versionTitle: "",
    description: "",
    lyricsStatic: "",
    genreIds: [],
  });
  const objectUrlsRef = useRef([]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const [trackDetail, genreList] = await Promise.all([
          trackService.getArtistTrackDetail(id),
          genreService.getGenresService(),
        ]);

        if (!isMounted) {
          return;
        }

        setTrack(trackDetail);
        setGenres(Array.isArray(genreList) ? genreList : []);
        setFormData(getFormDataFromTrack(trackDetail));
        setCopyrightForm(mapTrackCopyrightToForm(trackDetail?.copyright));
        setAvatarPreview(trackDetail?.avatar || "");
        setCoverPreviews(Array.isArray(trackDetail?.coverImage) ? trackDetail.coverImage : []);
        setAudioPreviewUrl(
          Array.isArray(trackDetail?.audioFiles) && trackDetail.audioFiles.length > 0
            ? trackDetail.audioFiles[0].url
            : ""
        );
        setLyricsPreviewText(
          trackDetail?.lyricsSyncUrl
            ? trackDetail.lyricsSyncUrl.split("/").pop()
            : ""
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setTrack(null);
        setGenres([]);
        setErrorMessage(
          getApiErrorMessage(error, "Không thể tải dữ liệu chỉnh sửa bài hát lúc này.")
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (!id) {
      setLoading(false);
      setErrorMessage("Thiếu mã bài hát.");
      return () => {
        isMounted = false;
      };
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
      objectUrlsRef.current = [];
    };
  }, []);

  const canEdit = canArtistEditTrack(track);
  const canSubmit = canArtistSubmitTrack(track);
  const locationMessage = location.state?.message || "";

  const previewTrackForSubmit = useMemo(() => {
    if (!track) {
      return null;
    }

    return {
      ...track,
      title: formData.title.trim() || track.title,
      versionTitle: formData.versionTitle.trim(),
      description: formData.description.trim(),
      lyricsStatic: formData.lyricsStatic,
      genres: formData.genreIds.map((genreId) => ({ _id: genreId })),
      genreIds: formData.genreIds,
      copyright: serializeCopyrightForApi(copyrightForm),
    };
  }, [copyrightForm, formData, track]);

  const submitIssues = useMemo(
    () => getSubmitReadinessIssues(previewTrackForSubmit),
    [previewTrackForSubmit]
  );

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
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
      return;
    }

    setAudioPreviewUrl(
      Array.isArray(track?.audioFiles) && track.audioFiles.length > 0
        ? track.audioFiles[0].url
        : ""
    );
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0] || null;
    setAvatarFile(file);

    if (file) {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.push(url);
      setAvatarPreview(url);
      return;
    }

    setAvatarPreview(track?.avatar || "");
  };

  const handleCoverImageChange = (event) => {
    const files = Array.from(event.target.files || []);
    setCoverImageFiles(files);

    if (files.length > 0) {
      const previews = files.map((file) => {
        const url = URL.createObjectURL(file);
        objectUrlsRef.current.push(url);
        return url;
      });
      setCoverPreviews(previews);
      return;
    }

    setCoverPreviews(Array.isArray(track?.coverImage) ? track.coverImage : []);
  };

  const handleLyricsSyncChange = (event) => {
    const file = event.target.files?.[0] || null;
    setLyricsSyncFile(file);

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || "");
        setLyricsPreviewText(text.split(/\r?\n/).slice(0, 10).join("\n"));
      };
      reader.readAsText(file);
      return;
    }

    setLyricsPreviewText(
      track?.lyricsSyncUrl ? track.lyricsSyncUrl.split("/").pop() : ""
    );
  };

  const validateFormFields = () => {
    const errors = {};
    const title = formData.title.trim();

    if (!title) {
      errors.title = "Vui lòng nhập tên bài hát.";
    } else if (title.length > TITLE_MAX_LENGTH) {
      errors.title = `Tên bài hát không được vượt quá ${TITLE_MAX_LENGTH} ký tự.`;
    }

    if (formData.genreIds.length === 0) {
      errors.genres = "Vui lòng chọn ít nhất một thể loại.";
    }

    if (String(formData.lyricsStatic || "").length > LYRICS_STATIC_MAX_LENGTH) {
      errors.lyricsStatic = `Lời bài hát không được vượt quá ${LYRICS_STATIC_MAX_LENGTH} ký tự.`;
    }

    return errors;
  };

  const buildPayload = (uploadedMedia) => {
    if (!track) {
      return {};
    }

    const payload = {};
    const nextTitle = formData.title.trim();
    const nextVersionTitle = formData.versionTitle.trim();
    const nextDescription = formData.description.trim();
    const nextGenreIds = formData.genreIds;
    const nextCopyright = serializeCopyrightForApi(copyrightForm);
    const currentGenreIds = Array.isArray(track?.genres)
      ? track.genres.map((genre) => String(genre._id || genre.id || genre))
      : [];
    const currentCopyright = serializeCopyrightForApi(track?.copyright || {});

    if (nextTitle !== String(track?.title || "").trim()) {
      payload.title = nextTitle;
    }

    if (nextVersionTitle !== String(track?.versionTitle || "").trim()) {
      payload.versionTitle = nextVersionTitle;
    }

    if (nextDescription !== String(track?.description || "").trim()) {
      payload.description = nextDescription;
    }

    if (String(formData.lyricsStatic || "") !== String(track?.lyricsStatic || "")) {
      payload.lyricsStatic = formData.lyricsStatic;
    }

    if (!areArraysEqual(nextGenreIds, currentGenreIds)) {
      payload.genreIds = nextGenreIds;
    }

    if (stringifyValue(nextCopyright) !== stringifyValue(currentCopyright)) {
      payload.copyright = nextCopyright;
    }

    if (uploadedMedia?.avatar) {
      payload.avatar = uploadedMedia.avatar;
    }

    if (Array.isArray(uploadedMedia?.coverImages) && uploadedMedia.coverImages.length > 0) {
      payload.coverImage = uploadedMedia.coverImages;
    }

    if (uploadedMedia?.lyricsSyncUrl) {
      payload.lyricsSyncUrl = uploadedMedia.lyricsSyncUrl;
    }

    if (Array.isArray(uploadedMedia?.audioFiles) && uploadedMedia.audioFiles.length > 0) {
      payload.audioFiles = uploadedMedia.audioFiles;
      payload.audioAnalysis = uploadedMedia.audioAnalysis;
    }

    return payload;
  };

  const saveTrackChanges = async ({ submitAfterSave = false }) => {
    if (!track) {
      return;
    }

    const errors = validateFormFields();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSuccessMessage("");
    setErrorMessage("");
    setFieldErrors({});

    if (submitAfterSave) {
      setSubmittingForApproval(true);
    } else {
      setSubmitting(true);
    }

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

      const payload = buildPayload(uploadedMedia);
      const willRequireReview =
        track?.approvalStatus === "approved" &&
        (
          payload.title !== undefined ||
          payload.versionTitle !== undefined ||
          payload.audioFiles !== undefined ||
          payload.copyright !== undefined
        );

      let latestTrack = track;

      if (Object.keys(payload).length > 0) {
        latestTrack = await trackService.updateArtistTrack(id, payload);
        setTrack(latestTrack);
        setFormData(getFormDataFromTrack(latestTrack));
        setCopyrightForm(mapTrackCopyrightToForm(latestTrack?.copyright));
        setAvatarPreview(latestTrack?.avatar || "");
        setCoverPreviews(Array.isArray(latestTrack?.coverImage) ? latestTrack.coverImage : []);
        setAudioPreviewUrl(
          Array.isArray(latestTrack?.audioFiles) && latestTrack.audioFiles.length > 0
            ? latestTrack.audioFiles[0].url
            : ""
        );
        setLyricsPreviewText(
          latestTrack?.lyricsSyncUrl
            ? latestTrack.lyricsSyncUrl.split("/").pop()
            : ""
        );
      }

      setAudioFile(null);
      setAvatarFile(null);
      setCoverImageFiles([]);
      setLyricsSyncFile(null);

      if (submitAfterSave) {
        const submittedTrack = await trackService.submitForApproval(id);
        setTrack(submittedTrack);
        navigate(routePaths.artistTrackDetail(id), {
          state: { message: "Đã gửi bài hát để admin duyệt." },
        });
        return;
      }

      if (Object.keys(payload).length === 0) {
        setSuccessMessage("Chưa có thay đổi nào để lưu.");
      } else if (willRequireReview && latestTrack?.approvalStatus === "pending") {
        setSuccessMessage("Đã lưu thay đổi và chuyển bài hát sang chờ duyệt.");
      } else {
        setSuccessMessage("Đã lưu thay đổi bài hát thành công.");
      }
    } catch (error) {
      setErrorMessage(
        getApiErrorFullMessage(
          error,
          submitAfterSave
            ? "Không thể gửi bài hát để duyệt."
            : "Không thể lưu thay đổi bài hát lúc này."
        )
      );
    } finally {
      setIsUploadingMedia(false);
      setSubmitting(false);
      setSubmittingForApproval(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canEdit) {
      setErrorMessage("Bài hát này không thể chỉnh sửa ở trạng thái hiện tại.");
      return;
    }

    await saveTrackChanges({ submitAfterSave: false });
  };

  const handleSubmitForApproval = async () => {
    if (!track || !canSubmit) {
      return;
    }

    if (submitIssues.length > 0) {
      setErrorMessage(
        `Vui lòng hoàn thiện các mục sau trước khi gửi duyệt:\n${submitIssues
          .map((issue) => `- ${issue}`)
          .join("\n")}`
      );
      return;
    }

    setIsSubmitConfirmOpen(false);
    await saveTrackChanges({ submitAfterSave: true });
  };

  if (loading) {
    return (
      <section className="rounded-md border border-neutral-200 bg-white p-8 text-sm text-neutral-600 shadow-sm">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-[#8b5e3c]" />
          Đang tải trình chỉnh sửa bài hát...
        </div>
      </section>
    );
  }

  if (errorMessage && !track) {
    return (
      <section className="rounded-md border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <h2 className="text-lg font-semibold">Không thể tải bài hát</h2>
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
        Quay lại chi tiết bài hát
      </button>

      <div className="rounded-md border border-neutral-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#8b5e3c]">
            Bảng điều khiển nghệ sĩ
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#241b15]">
            Chỉnh sửa bài hát
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Mô tả, lời bài hát, thể loại và hình ảnh sẽ được lưu ngay. Nếu thay đổi tên
            bài hát, tên phiên bản, file nhạc hoặc thông tin bản quyền thì bài hát sẽ
            chuyển sang trạng thái chờ admin duyệt lại.
          </p>
        </div>

        {locationMessage ? (
          <div className="mt-4 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            {locationMessage}
          </div>
        ) : null}

        {!canEdit ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Bài hát này không thể chỉnh sửa ở trạng thái hiện tại.
          </div>
        ) : null}

        {track?.approvalStatus === "rejected" && track?.rejectReason ? (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            Lý do từ chối: {track.rejectReason}
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
            <p className="text-sm font-medium text-[#241b15]">Tình trạng sẵn sàng gửi duyệt</p>
            {submitIssues.length === 0 ? (
              <p className="mt-2 text-sm text-emerald-700">
                Bài hát này đã sẵn sàng để gửi duyệt.
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
            <p className="text-sm font-medium text-[#241b15]">Tệp media</p>
            <p className="mt-1 text-xs text-neutral-600">
              Bạn có thể cập nhật file nhạc, ảnh đại diện, ảnh bìa và file lời đồng bộ tại đây.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[#241b15]">
                  Tệp âm thanh
                </label>
                <input
                  type="file"
                  accept=".mp3,.wav,.flac,.aac,.m4a,audio/mpeg,audio/wav,audio/flac,audio/aac,audio/mp4"
                  onChange={handleAudioChange}
                  disabled={!canEdit}
                  className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                />
                {audioFile ? (
                  <p className="mt-2 text-xs text-neutral-600">Đã chọn: {audioFile.name}</p>
                ) : null}
                {audioPreviewUrl ? (
                  <div className="mt-2">
                    <audio controls src={audioPreviewUrl} className="w-full" />
                  </div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#241b15]">
                  Ảnh đại diện
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={!canEdit}
                  className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                />
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Xem trước ảnh đại diện"
                    className="mt-3 h-24 w-24 rounded border border-neutral-200 object-cover"
                  />
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[#241b15]">
                  Ảnh bìa
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleCoverImageChange}
                  disabled={!canEdit}
                  className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                />
                {coverPreviews.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {coverPreviews.map((url, index) => (
                      <img
                        key={`${url}-${index}`}
                        src={url}
                        alt={`Ảnh bìa ${index + 1}`}
                        className="h-20 w-20 rounded border border-neutral-200 object-cover"
                      />
                    ))}
                  </div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#241b15]">
                  Lời đồng bộ (.lrc)
                </label>
                <input
                  type="file"
                  accept=".lrc,text/plain"
                  onChange={handleLyricsSyncChange}
                  disabled={!canEdit}
                  className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
                />
                {lyricsPreviewText ? (
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-neutral-50 p-2 text-xs text-neutral-700">
                    {lyricsPreviewText}
                  </pre>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[#241b15]">
                Tên bài hát *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                maxLength={TITLE_MAX_LENGTH}
                disabled={!canEdit}
                className={`mt-2 w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
                  fieldErrors.title
                    ? "border-red-500 focus:border-red-500"
                    : "border-neutral-200 focus:border-[#8b5e3c]"
                }`}
              />
              {fieldErrors.title ? (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.title}</p>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#241b15]">
                Tên phiên bản
              </label>
              <input
                type="text"
                name="versionTitle"
                value={formData.versionTitle}
                onChange={handleInputChange}
                disabled={!canEdit}
                className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-[#8b5e3c] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#241b15]">
              Mô tả
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="4"
              disabled={!canEdit}
              className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-[#8b5e3c] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#241b15]">
              Lời bài hát
            </label>
            <textarea
              name="lyricsStatic"
              value={formData.lyricsStatic}
              onChange={handleInputChange}
              rows="6"
              disabled={!canEdit}
              className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-[#8b5e3c] focus:outline-none"
            />
            {fieldErrors.lyricsStatic ? (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.lyricsStatic}</p>
            ) : null}
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-[#241b15]">
              Thể loại *
            </label>
            <p className={`mt-1 text-xs ${fieldErrors.genres ? "text-red-500" : "text-neutral-500"}`}>
              {fieldErrors.genres || `Chọn tối đa ${MAX_GENRE_IDS} thể loại.`}
            </p>
            <button
              type="button"
              onClick={() => setGenresOpen((current) => !current)}
              disabled={!canEdit}
              className={`mt-2 flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${
                fieldErrors.genres ? "border-red-500" : "border-neutral-200"
              }`}
            >
              <span className="truncate text-neutral-700">
                {formData.genreIds.length === 0
                  ? "Chọn thể loại..."
                  : genres
                      .filter((genre) => formData.genreIds.includes(String(genre._id)))
                      .map((genre) => genre.name)
                      .join(", ")}
              </span>
              <span className="ml-2 text-neutral-500">v</span>
            </button>

            {genresOpen ? (
              <div className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-md border border-neutral-200 bg-white p-2 shadow">
                {genres.map((genre) => {
                  const nextId = String(genre._id);
                  return (
                    <label
                      key={nextId}
                      className="flex items-center gap-2 px-2 py-1 text-sm text-neutral-700 hover:bg-neutral-50"
                    >
                      <input
                        type="checkbox"
                        checked={formData.genreIds.includes(nextId)}
                        onChange={() => handleGenreToggle(nextId)}
                        disabled={!canEdit}
                        className="h-4 w-4 rounded border-neutral-300 text-[#8b5e3c] focus:ring-[#8b5e3c]"
                      />
                      <span className="truncate">{genre.name}</span>
                    </label>
                  );
                })}
              </div>
            ) : null}
          </div>

          <TrackCopyrightFields
            value={copyrightForm}
            onChange={setCopyrightForm}
            disabled={!canEdit}
            errors={fieldErrors}
          />

          <div className="flex flex-wrap gap-2 pt-4">
            <button
              type="submit"
              disabled={!canEdit || submitting || submittingForApproval}
              className="inline-flex items-center gap-2 rounded-md bg-[#8b5e3c] px-4 py-2 font-medium text-white hover:bg-[#6d4a2f] disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {submitting
                ? isUploadingMedia
                  ? "Đang tải media..."
                  : "Đang lưu..."
                : "Lưu thay đổi"}
            </button>

            {canSubmit ? (
              <button
                type="button"
                onClick={() => {
                  setSuccessMessage("");
                  setErrorMessage("");
                  setIsSubmitConfirmOpen(true);
                }}
                disabled={submitting || submittingForApproval || submitIssues.length > 0}
                className="inline-flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-4 py-2 font-medium text-sky-900 hover:bg-sky-100 disabled:opacity-50"
              >
                {submittingForApproval ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {submittingForApproval ? "Đang gửi duyệt..." : "Gửi duyệt"}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => navigate(routePaths.artistTrackDetail(id))}
              className="rounded-md border border-neutral-200 px-4 py-2 font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>

      <ConfirmActionModal
        isOpen={isSubmitConfirmOpen}
        title="Gửi bài hát để duyệt?"
        message="Sau khi gửi duyệt, bạn sẽ không thể chỉnh sửa bài hát cho đến khi admin xử lý xong. Bạn có muốn tiếp tục không?"
        confirmText="Gửi duyệt"
        cancelText="Quay lại"
        isLoading={submittingForApproval}
        onCancel={() => setIsSubmitConfirmOpen(false)}
        onConfirm={handleSubmitForApproval}
      />
    </section>
  );
};

export default ArtistTrackEditPage;
