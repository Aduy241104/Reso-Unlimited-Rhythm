import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Disc3,
  FileAudio,
  FileText,
  Loader2,
  Music4,
  ShieldCheck,
} from "lucide-react";
import TrackCopyrightFields from "../../components/artist/TrackCopyrightFields";
import TrackReviewAppealModal from "../../components/artist/TrackReviewAppealModal";
import ConfirmActionModal from "../../components/common/ConfirmActionModal";
import genreService from "../../services/genreService";
import trackService from "../../services/trackService";
import { routePaths } from "../../routes/routePaths";
import { ARTIST_INPUT_LIMITS } from "../../constants/artistInputLimits";
import { getApiErrorFullMessage, getApiErrorMessage } from "../../utils/apiError";
import {
  IMAGE_FILE_ACCEPT,
  getImageFileValidationError,
  getImageFilesValidationError,
} from "../../utils/imageFileValidation";
import {
  showArtistError,
  showArtistInfo,
  showArtistSuccess,
} from "../../utils/artistNotification";
import {
  canArtistEditTrack,
  canArtistSubmitTrack,
  getCopyrightValidationErrors,
  getArtistTrackReviewStatus,
  getSubmitReadinessIssues,
  LYRICS_STATIC_MAX_LENGTH,
  mapTrackCopyrightToForm,
  MAX_GENRE_IDS,
  serializeCopyrightForApi,
  TITLE_MAX_LENGTH,
} from "../../utils/trackWorkflow";
import {
  formatTrackDate,
  formatTrackDateTime,
  getTrackDisplayDuration,
  getTrackActiveStatusMeta,
  getTrackApprovalStatusMeta,
  resolveTrackArtwork,
} from "../../utils/artistTrackPresentation";

const getEditableTrackSource = (track) => track?.pendingUpdate?.data || track || null;

const mapCopyrightApiErrors = (error) => {
  const details = Array.isArray(error?.errors)
    ? error.errors
    : error?.errors?.field
      ? [error.errors]
      : [];
  return details.reduce((result, detail) => {
    const field = String(detail?.field || "");
    if (!field.startsWith("copyright.")) return result;
    const normalizedField = field
      .replace(/^copyright\./, "")
      .split(".")[0];
    if (normalizedField && detail?.message) result[normalizedField] = detail.message;
    return result;
  }, {});
};

const FieldShell = ({ label, helper, error, children }) => (
  <label className="block">
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold text-[#241b45]">{label}</span>
      {helper ? <span className="text-xs text-[#9e98b8]">{helper}</span> : null}
    </div>
    <div className="mt-2">{children}</div>
    {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
  </label>
);

const SectionCard = ({ icon, eyebrow, title, description, children }) => {
  const IconComponent = icon;

  return (
    <section className="rounded-[28px] border border-[#ece8ff] bg-white p-5 shadow-[0_12px_35px_rgba(32,23,71,0.06)] sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#e6e0ff] bg-[#f8f6ff] text-[#6f5cf1]">
          <IconComponent className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8d87aa]">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#241b45]">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-[#8d87aa]">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
};

const SidebarCard = ({ title, children }) => (
  <div className="rounded-[28px] border border-[#ece8ff] bg-white p-5 shadow-[0_18px_40px_rgba(32,23,71,0.08)] sm:p-6">
    <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8d87aa]">
      {title}
    </h3>
    <div className="mt-4">{children}</div>
  </div>
);

const getFormDataFromTrack = (track) => {
  const source = getEditableTrackSource(track);

  return {
    title: source?.title || "",
    versionTitle: source?.versionTitle || "",
    description: source?.description || "",
    lyricsStatic: source?.lyricsStatic || "",
    genreIds: Array.isArray(source?.genres) && source.genres.length > 0
      ? source.genres.map((genre) => String(genre._id || genre.id || genre))
      : Array.isArray(source?.genreIds)
        ? source.genreIds.map((genre) => String(genre?._id || genre?.id || genre))
        : [],
  };
};

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
  const [copyrightEvidenceFiles, setCopyrightEvidenceFiles] = useState([]);
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
  const [isAppealModalOpen, setIsAppealModalOpen] = useState(false);
  const [latestAppeal, setLatestAppeal] = useState(null);
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

        const editableTrack = getEditableTrackSource(trackDetail);

        setTrack(trackDetail);
        if (trackDetail?.approvalStatus === "rejected") {
          const appeals = await trackService.getTrackReviewAppeals(id).catch(() => []);
          if (isMounted) setLatestAppeal(appeals[0] || null);
        }
        setGenres(Array.isArray(genreList) ? genreList : []);
        setFormData(getFormDataFromTrack(trackDetail));
        setCopyrightForm(mapTrackCopyrightToForm(editableTrack?.copyright || trackDetail?.copyright));
        setAvatarPreview(editableTrack?.avatar || trackDetail?.avatar || "");
        setCoverPreviews(
          Array.isArray(editableTrack?.coverImage)
            ? editableTrack.coverImage
            : Array.isArray(trackDetail?.coverImage)
              ? trackDetail.coverImage
              : []
        );
        setAudioPreviewUrl(
          Array.isArray(editableTrack?.audioFiles) && editableTrack.audioFiles.length > 0
            ? editableTrack.audioFiles[0].url
            : ""
        );
        setLyricsPreviewText(
          editableTrack?.lyricsSyncUrl
            ? editableTrack.lyricsSyncUrl.split("/").pop()
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
    if (!location.state?.message) {
      return;
    }

    showArtistSuccess(location.state.message);
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: { ...location.state, message: null },
    });
  }, [location.pathname, location.search, location.state, navigate]);

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
  const isEnforcement = track?.moderation?.automatic?.decision === "enforcement_block";
  const hasCurrentAppeal = latestAppeal?.rejectionSnapshot?.rejectionId && latestAppeal.rejectionSnapshot.rejectionId === track?.moderation?.lastRejection?.rejectionId;
  const reviewStatus = getArtistTrackReviewStatus(track);

  const previewTrackForSubmit = useMemo(() => {
    if (!track) {
      return null;
    }

    const editableTrack = getEditableTrackSource(track);

    return {
      ...track,
      ...editableTrack,
      title: formData.title.trim() || editableTrack?.title || track.title,
      versionTitle: formData.versionTitle.trim(),
      description: formData.description.trim(),
      lyricsStatic: formData.lyricsStatic,
      genres: formData.genreIds.map((genreId) => ({ _id: genreId })),
      genreIds: formData.genreIds,
      copyright: copyrightForm,
      avatar: avatarPreview || editableTrack?.avatar || track.avatar,
      coverImage:
        coverPreviews.length > 0
          ? coverPreviews
          : editableTrack?.coverImage || track.coverImage,
    };
  }, [avatarPreview, copyrightForm, coverPreviews, formData, track]);

  const submitIssues = useMemo(
    () => getSubmitReadinessIssues(previewTrackForSubmit),
    [previewTrackForSubmit]
  );
  const copyrightValidationErrors = useMemo(
    () => getCopyrightValidationErrors(copyrightForm),
    [copyrightForm]
  );
  const effectiveSubmitIssues = useMemo(
    () => copyrightEvidenceFiles.length > 0
      ? submitIssues.filter((issue) => !issue.includes("tài liệu bản quyền"))
      : submitIssues,
    [copyrightEvidenceFiles.length, submitIssues]
  );

  const selectedGenres = useMemo(
    () =>
      genres.filter((genre) => formData.genreIds.includes(String(genre._id))),
    [formData.genreIds, genres]
  );

  const activeMeta = getTrackActiveStatusMeta(track?.activeStatus);
  const approvalMeta = getTrackApprovalStatusMeta(reviewStatus);

  const readinessItems = [
    {
      label: "Thông tin cơ bản đã đầy đủ",
      ready: Boolean(formData.title.trim() && formData.genreIds.length > 0),
    },
    {
      label: "Đã có tệp âm thanh",
      ready: Boolean(audioFile || audioPreviewUrl),
    },
    {
      label: "Đã có ảnh minh họa",
      ready: Boolean(avatarPreview || coverPreviews.length > 0),
    },
    {
      label: "Đã xác nhận bản quyền",
      ready: Boolean(copyrightForm.declarationAccepted && copyrightForm.rightsConfirmed),
    },
  ];

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
        showArtistError(`Bạn chỉ có thể chọn tối đa ${MAX_GENRE_IDS} thể loại.`);
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
      Array.isArray(getEditableTrackSource(track)?.audioFiles) &&
      getEditableTrackSource(track).audioFiles.length > 0
        ? getEditableTrackSource(track).audioFiles[0].url
        : ""
    );
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0] || null;
    const validationError = getImageFileValidationError(file);

    if (validationError) {
      setFieldErrors((current) => ({ ...current, avatar: validationError }));
      event.target.value = "";
      return;
    }

    setAvatarFile(file);
    setFieldErrors((current) => ({ ...current, avatar: "" }));

    if (file) {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.push(url);
      setAvatarPreview(url);
      return;
    }

    setAvatarPreview(getEditableTrackSource(track)?.avatar || track?.avatar || "");
  };

  const handleCoverImageChange = (event) => {
    const files = Array.from(event.target.files || []);
    const validationError = getImageFilesValidationError(files);

    if (validationError) {
      setFieldErrors((current) => ({ ...current, media: validationError }));
      event.target.value = "";
      return;
    }

    setCoverImageFiles(files);
    setFieldErrors((current) => ({ ...current, media: "" }));

    if (files.length > 0) {
      const previews = files.map((file) => {
        const url = URL.createObjectURL(file);
        objectUrlsRef.current.push(url);
        return url;
      });
      setCoverPreviews(previews);
      return;
    }

    setCoverPreviews(
      Array.isArray(getEditableTrackSource(track)?.coverImage)
        ? getEditableTrackSource(track).coverImage
        : Array.isArray(track?.coverImage)
          ? track.coverImage
          : []
    );
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
      getEditableTrackSource(track)?.lyricsSyncUrl
        ? getEditableTrackSource(track).lyricsSyncUrl.split("/").pop()
        : ""
    );
  };

  const validateFormFields = ({ submitAfterSave = false } = {}) => {
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

    if (submitAfterSave) {
      const copyrightErrors = getCopyrightValidationErrors(copyrightForm);

      // A newly selected evidence file is uploaded before the submit request.
      // Do not reject the form before that upload has had a chance to complete.
      if (copyrightEvidenceFiles.length > 0) {
        delete copyrightErrors.copyrightEvidenceDocuments;
      }

      Object.assign(errors, copyrightErrors);
    }

    return errors;
  };

  const handleCopyrightChange = (nextCopyright) => {
    setCopyrightForm(nextCopyright);
    setFieldErrors((current) => Object.fromEntries(
      Object.entries(current).filter(([field]) => (
        !(field in (copyrightForm || {})) && !field.startsWith("licenseDocumentUrls.")
      ))
    ));
  };

  const buildPayload = (uploadedMedia) => {
    if (!track) {
      return {};
    }

    const editableTrack = getEditableTrackSource(track);
    const payload = {};
    const nextTitle = formData.title.trim();
    const nextVersionTitle = formData.versionTitle.trim();
    const nextDescription = formData.description.trim();
    const nextGenreIds = formData.genreIds;
    const nextCopyright = serializeCopyrightForApi(copyrightForm);
    const currentGenreIds =
      Array.isArray(editableTrack?.genres) && editableTrack.genres.length > 0
        ? editableTrack.genres.map((genre) => String(genre._id || genre.id || genre))
        : Array.isArray(editableTrack?.genreIds)
          ? editableTrack.genreIds.map((genre) => String(genre?._id || genre?.id || genre))
          : [];
    const currentCopyright = serializeCopyrightForApi(editableTrack?.copyright || {});

    if (nextTitle !== String(editableTrack?.title || "").trim()) {
      payload.title = nextTitle;
    }

    if (nextVersionTitle !== String(editableTrack?.versionTitle || "").trim()) {
      payload.versionTitle = nextVersionTitle;
    }

    if (nextDescription !== String(editableTrack?.description || "").trim()) {
      payload.description = nextDescription;
    }

    if (String(formData.lyricsStatic || "") !== String(editableTrack?.lyricsStatic || "")) {
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

    const errors = validateFormFields({ submitAfterSave });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

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
      if (submitAfterSave && !Object.prototype.hasOwnProperty.call(payload, "copyright")) {
        // Submit must persist the exact declaration currently shown in the
        // form, including data restored from a rejected draft/pending update.
        payload.copyright = serializeCopyrightForApi(copyrightForm);
      }
      const willRequireReview =
        track?.approvalStatus === "approved" &&
        Object.keys(payload).length > 0;

      let latestTrack = track;

      if (Object.keys(payload).length > 0) {
        latestTrack = await trackService.updateArtistTrack(id, payload);
        const editableLatestTrack = getEditableTrackSource(latestTrack);
        setTrack(latestTrack);
        setFormData(getFormDataFromTrack(latestTrack));
        setCopyrightForm(
          mapTrackCopyrightToForm(editableLatestTrack?.copyright || latestTrack?.copyright)
        );
        setAvatarPreview(editableLatestTrack?.avatar || latestTrack?.avatar || "");
        setCoverPreviews(
          Array.isArray(editableLatestTrack?.coverImage)
            ? editableLatestTrack.coverImage
            : Array.isArray(latestTrack?.coverImage)
              ? latestTrack.coverImage
              : []
        );
        setAudioPreviewUrl(
          Array.isArray(editableLatestTrack?.audioFiles) && editableLatestTrack.audioFiles.length > 0
            ? editableLatestTrack.audioFiles[0].url
            : ""
        );
        setLyricsPreviewText(
          editableLatestTrack?.lyricsSyncUrl
            ? editableLatestTrack.lyricsSyncUrl.split("/").pop()
            : ""
        );
      }

      if (copyrightEvidenceFiles.length > 0) {
        latestTrack = await trackService.uploadCopyrightEvidence(id, copyrightEvidenceFiles);
        setTrack(latestTrack);
        setCopyrightEvidenceFiles([]);
      }

      setAudioFile(null);
      setAvatarFile(null);
      setCoverImageFiles([]);
      setLyricsSyncFile(null);

      if (submitAfterSave) {
        const latestCopyright = getEditableTrackSource(latestTrack)?.copyright || latestTrack?.copyright || {};
        const submittedTrack = await trackService.submitForApproval(id, {
          copyright: serializeCopyrightForApi({
            ...copyrightForm,
            copyrightEvidenceDocuments: latestCopyright.copyrightEvidenceDocuments || [],
          }),
        });
        setTrack(submittedTrack);
        navigate(routePaths.artistTrackDetail(id), {
          state: { message: "Đã gửi bài hát để quản trị viên duyệt." },
        });
        return;
      }

      if (Object.keys(payload).length === 0 && copyrightEvidenceFiles.length === 0) {
        showArtistInfo("Chưa có thay đổi nào để lưu.");
      } else if (willRequireReview || latestTrack?.pendingUpdate?.status === "pending") {
        showArtistSuccess("Đã lưu thay đổi và chuyển bài hát về trạng thái chờ duyệt.");
      } else {
        showArtistSuccess("Đã lưu thay đổi bài hát thành công.");
      }
    } catch (error) {
      const copyrightErrors = mapCopyrightApiErrors(error);
      if (Object.keys(copyrightErrors).length > 0) setFieldErrors(copyrightErrors);
      showArtistError(
        getApiErrorFullMessage(
          error,
          submitAfterSave
            ? "Không thể gửi bài hát để duyệt vào lúc này."
            : "Không thể lưu thay đổi bài hát vào lúc này."
        )
      );
    } finally {
      setIsUploadingMedia(false);
      setSubmitting(false);
      setSubmittingForApproval(false);
    }
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    if (!canEdit) {
      showArtistError("Bài hát này hiện không thể chỉnh sửa.");
      return;
    }

    await saveTrackChanges({ submitAfterSave: false });
  };

  const handleSaveClick = async () => {
    if (!canEdit || submitting || submittingForApproval) {
      return;
    }

    await saveTrackChanges({ submitAfterSave: false });
  };

  const handleSubmitForApproval = async () => {
    if (!track || !canSubmit) {
      return;
    }

    if (effectiveSubmitIssues.length > 0) {
      showArtistError(
        `Vui lòng hoàn thiện các mục sau trước khi gửi duyệt:\n${effectiveSubmitIssues
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
      <section className="rounded-[28px] border border-[#ece8ff] bg-white p-8 text-sm text-[#6b6682] shadow-sm">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-[#6f5cf1]" />
          Đang tải trình chỉnh sửa bài hát...
        </div>
      </section>
    );
  }

  if (errorMessage && !track) {
    return (
      <section className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-rose-900">
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
        className="inline-flex items-center gap-2 text-sm font-medium text-[#6b6682] transition hover:text-[#3d2d73]"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại chi tiết bài hát
      </button>

      {track?.pendingUpdate?.status === "pending" ? (
        <div className="rounded-[22px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Bản chỉnh sửa của bài hát đã được gửi quản trị viên duyệt. Người nghe vẫn tiếp tục nghe phiên bản đang phát hành.
        </div>
      ) : null}

      {track?.pendingUpdate?.status === "rejected" && track?.pendingUpdate?.rejectReason ? (
        <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Bản chỉnh sửa trước bị từ chối: {track.pendingUpdate.rejectReason}
        </div>
      ) : null}

      {!canEdit ? (
        <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Bài hát này hiện đang bị khóa chỉnh sửa.
        </div>
      ) : null}

      {track?.approvalStatus === "rejected" && track?.rejectReason ? (
        <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Lý do từ chối: {track.rejectReason}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setIsAppealModalOpen(true)} disabled={Boolean(hasCurrentAppeal)} className="rounded-xl bg-rose-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{isEnforcement ? "Gửi khiếu nại" : "Phản hồi quyết định"}</button>
            {latestAppeal?.status === "pending" ? <span className="self-center text-xs font-semibold">Đang chờ Admin xem xét phản hồi.</span> : null}
          </div>
          {latestAppeal?.status === "rejected" && latestAppeal.adminResponse ? <p className="mt-3 rounded-xl bg-white/70 p-3 text-xs leading-5"><strong>Phản hồi của Admin:</strong> {latestAppeal.adminResponse}</p> : null}
        </div>
      ) : null}
      {track?.approvalStatus === "rejected" && !canSubmit && latestAppeal?.status !== "pending" ? (
        <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Bạn cần chỉnh sửa ít nhất một thông tin hoặc bổ sung bằng chứng trước khi gửi duyệt lại.
        </div>
      ) : null}

      {errorMessage ? (
        <div className="whitespace-pre-line rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_290px] 2xl:grid-cols-[minmax(0,1.55fr)_320px]">
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <SectionCard
            icon={Music4}
            eyebrow="Chỉnh sửa"
            title="Thông tin bài hát"
            description="Cập nhật phần nhận diện chính của bài hát. Khi thay đổi tên bài hát, tên phiên bản, tệp âm thanh hoặc thông tin bản quyền, bài hát có thể quay lại trạng thái chờ duyệt."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <FieldShell
                label="Tên bài hát"
                helper={`${formData.title.length}/${TITLE_MAX_LENGTH}`}
                error={fieldErrors.title}
              >
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  maxLength={TITLE_MAX_LENGTH}
                  disabled={!canEdit}
                  className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm text-[#241b45] outline-none transition ${
                    fieldErrors.title
                      ? "border-rose-300 focus:border-rose-400"
                      : "border-[#e6e0ff] focus:border-[#7c6cf2]"
                  }`}
                />
              </FieldShell>

              <FieldShell label="Tên phiên bản" helper="Không bắt buộc">
                <input
                  type="text"
                  name="versionTitle"
                  value={formData.versionTitle}
                  onChange={handleInputChange}
                  maxLength={ARTIST_INPUT_LIMITS.trackVersionTitle}
                  disabled={!canEdit}
                  className="h-12 w-full rounded-2xl border border-[#e6e0ff] bg-white px-4 text-sm text-[#241b45] outline-none transition focus:border-[#7c6cf2]"
                />
              </FieldShell>
            </div>

            <div className="mt-5">
              <FieldShell label="Mô tả">
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  maxLength={ARTIST_INPUT_LIMITS.trackDescription}
                  rows="4"
                  disabled={!canEdit}
                  className="w-full rounded-3xl border border-[#e6e0ff] bg-white px-4 py-4 text-sm leading-6 text-[#241b45] outline-none transition focus:border-[#7c6cf2]"
                />
              </FieldShell>
            </div>
          </SectionCard>

          <SectionCard
            icon={FileAudio}
            eyebrow="Tệp"
            title="Âm thanh và hình ảnh"
            description="Thay thế tệp âm thanh gốc, ảnh đại diện, ảnh bìa hoặc tệp lời đồng bộ mà không làm thay đổi quy trình xử lý hiện tại."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <FieldShell label="Tệp âm thanh gốc">
                <input
                  type="file"
                  accept=".mp3,.wav,.flac,.aac,.m4a,.mp4,audio/mpeg,audio/wav,audio/flac,audio/aac,audio/mp4,video/mp4"
                  onChange={handleAudioChange}
                  disabled={!canEdit}
                  className="block h-12 w-full rounded-2xl border border-[#e6e0ff] bg-white px-4 py-3 text-sm text-[#241b45] file:mr-3 file:rounded-xl file:border-0 file:bg-[#f3efff] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#5c4fe0]"
                />
                {audioFile ? (
                  <p className="mt-2 text-sm text-[#5e5678]">{audioFile.name}</p>
                ) : null}
                {audioPreviewUrl ? (
                  <audio controls src={audioPreviewUrl} className="mt-3 w-full" />
                ) : null}
              </FieldShell>

              <FieldShell label="Ảnh đại diện" error={fieldErrors.avatar}>
                <input
                  type="file"
                  accept={IMAGE_FILE_ACCEPT}
                  onChange={handleAvatarChange}
                  disabled={!canEdit}
                  className="block h-12 w-full rounded-2xl border border-[#e6e0ff] bg-white px-4 py-3 text-sm text-[#241b45] file:mr-3 file:rounded-xl file:border-0 file:bg-[#f3efff] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#5c4fe0]"
                />
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Xem trước ảnh đại diện"
                    className="mt-3 h-28 w-28 rounded-[22px] object-cover"
                  />
                ) : null}
              </FieldShell>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <FieldShell label="Ảnh bìa" error={fieldErrors.media}>
                <input
                  type="file"
                  accept={IMAGE_FILE_ACCEPT}
                  multiple
                  onChange={handleCoverImageChange}
                  disabled={!canEdit}
                  className="block h-12 w-full rounded-2xl border border-[#e6e0ff] bg-white px-4 py-3 text-sm text-[#241b45] file:mr-3 file:rounded-xl file:border-0 file:bg-[#f3efff] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#5c4fe0]"
                />
                {coverPreviews.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-3">
                    {coverPreviews.map((url, index) => (
                      <img
                        key={`${url}-${index}`}
                        src={url}
                        alt={`Ảnh bìa ${index + 1}`}
                        className="h-20 w-20 rounded-2xl object-cover"
                      />
                    ))}
                  </div>
                ) : null}
              </FieldShell>

              <FieldShell label="Lời đồng bộ (.lrc)">
                <input
                  type="file"
                  accept=".lrc,text/plain"
                  onChange={handleLyricsSyncChange}
                  disabled={!canEdit}
                  className="block h-12 w-full rounded-2xl border border-[#e6e0ff] bg-white px-4 py-3 text-sm text-[#241b45] file:mr-3 file:rounded-xl file:border-0 file:bg-[#f3efff] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#5c4fe0]"
                />
                {lyricsPreviewText ? (
                  <pre className="mt-3 max-h-44 overflow-auto rounded-3xl border border-[#ece8ff] bg-[#fbfaff] p-4 text-xs leading-6 text-[#5e5678]">
                    {lyricsPreviewText}
                  </pre>
                ) : null}
              </FieldShell>
            </div>
          </SectionCard>

          <SectionCard
            icon={FileText}
            eyebrow="Nội dung"
            title="Lời bài hát và thể loại"
            description="Điều chỉnh phần nội dung hỗ trợ cho việc kiểm duyệt và hiển thị trong danh mục bài hát."
          >
            <FieldShell label="Lời bài hát tĩnh" error={fieldErrors.lyricsStatic}>
              <textarea
                name="lyricsStatic"
                value={formData.lyricsStatic}
                onChange={handleInputChange}
                maxLength={LYRICS_STATIC_MAX_LENGTH}
                rows="8"
                disabled={!canEdit}
                className="w-full rounded-3xl border border-[#e6e0ff] bg-white px-4 py-4 text-sm leading-6 text-[#241b45] outline-none transition focus:border-[#7c6cf2]"
              />
            </FieldShell>

            <div className="mt-5">
              <FieldShell
                label="Thể loại"
                helper={`${formData.genreIds.length}/${MAX_GENRE_IDS} đã chọn`}
                error={fieldErrors.genres}
              >
                <button
                  type="button"
                  onClick={() => setGenresOpen((current) => !current)}
                  disabled={!canEdit}
                  className={`flex min-h-[52px] w-full items-center justify-between rounded-2xl border bg-white px-4 text-left text-sm text-[#241b45] transition ${
                    fieldErrors.genres
                      ? "border-rose-300"
                      : "border-[#e6e0ff] hover:border-[#d5ccff]"
                  }`}
                >
                  <span className="truncate">
                    {selectedGenres.length === 0
                      ? "Chọn thể loại..."
                      : selectedGenres.map((genre) => genre.name).join(", ")}
                  </span>
                  <Disc3 className="h-4 w-4 text-[#8d87aa]" />
                </button>

                {genresOpen ? (
                  <div className="mt-3 grid gap-2 rounded-3xl border border-[#ece8ff] bg-[#fbfaff] p-3 md:grid-cols-2">
                    {genres.map((genre) => {
                      const genreId = String(genre._id);
                      const checked = formData.genreIds.includes(genreId);

                      return (
                        <label
                          key={genreId}
                          className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                            checked
                              ? "border-[#cfc4ff] bg-white text-[#3f3164]"
                              : "border-transparent bg-transparent text-[#5e5678] hover:border-[#ece8ff] hover:bg-white"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleGenreToggle(genreId)}
                            disabled={!canEdit}
                            className="h-4 w-4 rounded border-neutral-300 text-[#6f5cf1]"
                          />
                          <span className="truncate">{genre.name}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : null}
              </FieldShell>
            </div>
          </SectionCard>

          <SectionCard
            icon={ShieldCheck}
            eyebrow="Bản quyền"
            title="Thông tin quyền sở hữu"
            description="Cập nhật siêu dữ liệu bản quyền mà không thay đổi cách hệ thống kiểm tra và lưu bài hát."
          >
            <TrackCopyrightFields
              value={copyrightForm}
              onChange={handleCopyrightChange}
              disabled={!canEdit}
              errors={fieldErrors}
            />
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <label className="block text-sm font-semibold text-amber-950">
                Tài liệu cấp phép / bằng chứng bản quyền *
              </label>
              <p className="mt-1 text-xs leading-5 text-amber-800">
                Bắt buộc ít nhất một tệp trước khi gửi duyệt. Dùng giấy chứng nhận, hợp đồng, giấy phép, project/stem hoặc tài liệu quá trình tạo bản ghi; audio thành phẩm đơn lẻ không tự chứng minh quyền sở hữu. Tối đa 5 tệp, mỗi tệp 25 MB.
              </p>
              <input
                type="file"
                multiple
                accept=".pdf,.zip,.mp3,.wav,.flac,.m4a,image/*,application/pdf,application/zip,audio/*"
                onChange={(event) => setCopyrightEvidenceFiles(Array.from(event.target.files || []))}
                disabled={!canEdit || submitting || submittingForApproval}
                className="mt-3 block h-11 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-[#241b45] file:mr-3 file:rounded-lg file:border-0 file:bg-amber-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-amber-800"
              />
              {copyrightEvidenceFiles.length > 0 ? (
                <p className="mt-2 text-xs font-medium text-amber-900">
                  Đang chờ tải lên: {copyrightEvidenceFiles.map((file) => file.name).join(", ")}
                </p>
              ) : null}
              {(fieldErrors.copyrightEvidenceDocuments || (
                copyrightEvidenceFiles.length === 0
                  ? copyrightValidationErrors.copyrightEvidenceDocuments
                  : ""
              )) ? (
                <p className="mt-2 text-xs font-medium text-rose-600">
                  {fieldErrors.copyrightEvidenceDocuments || copyrightValidationErrors.copyrightEvidenceDocuments}
                </p>
              ) : null}
            </div>
          </SectionCard>
        </form>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-1">
          <SidebarCard title="Trạng thái hiện tại">
            <div className="overflow-hidden rounded-[24px] bg-[#f6f2ff]">
              <img
                src={
                  avatarPreview ||
                  coverPreviews[0] ||
                  resolveTrackArtwork(track || { title: formData.title || "Bài hát" })
                }
                alt={formData.title || "Xem trước bài hát"}
                className="aspect-square w-full object-cover"
              />
            </div>
            <h3 className="mt-5 text-xl font-semibold tracking-tight text-[#241b45]">
              {formData.title.trim() || "Chưa có tên bài hát"}
            </h3>
            <p className="mt-1 text-sm text-[#8d87aa]">
              {formData.versionTitle.trim() || "Phiên bản gốc"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={["rounded-full border px-3 py-1 text-xs font-semibold", activeMeta.className].join(" ")}>
                {activeMeta.label}
              </span>
              <span className={["rounded-full border px-3 py-1 text-xs font-semibold", approvalMeta.className].join(" ")}>
                {approvalMeta.label}
              </span>
            </div>
          </SidebarCard>

          <SidebarCard title="Mức độ hoàn thiện">
            <div className="space-y-3">
              {readinessItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-[#f0ebff] bg-[#fbfaff] px-4 py-3 text-sm"
                >
                  <span className="text-[#5e5678]">{item.label}</span>
                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      item.ready
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500",
                    ].join(" ")}
                  >
                    {item.ready ? "Đã sẵn sàng" : "Chưa xong"}
                  </span>
                </div>
              ))}
            </div>
            {canSubmit ? (
              <div className="mt-5 rounded-[22px] border border-[#ece8ff] bg-[#fbfaff] p-4">
                <p className="text-sm font-semibold text-[#241b45]">
                  Danh sách cần kiểm tra trước khi gửi duyệt
                </p>
                {effectiveSubmitIssues.length === 0 ? (
                  <p className="mt-2 text-sm text-emerald-700">
                    Bài hát này đã sẵn sàng để gửi duyệt.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm text-[#5e5678]">
                    {effectiveSubmitIssues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </SidebarCard>

          <SidebarCard title="Thông tin nhanh">
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#8d87aa]">Thời lượng</span>
                <span className="text-right font-medium text-[#241b45]">
                  {getTrackDisplayDuration(track?.duration)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#8d87aa]">Thể loại</span>
                <span className="text-right font-medium text-[#241b45]">
                  {selectedGenres.length > 0
                    ? selectedGenres.map((genre) => genre.name).join(", ")
                    : "Chưa chọn"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#8d87aa]">Cập nhật</span>
                <span className="text-right font-medium text-[#241b45]">
                  {formatTrackDate(track?.updatedAt)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#8d87aa]">Ngày tạo</span>
                <span className="text-right font-medium text-[#241b45]">
                  {formatTrackDateTime(track?.createdAt)}
                </span>
              </div>
            </div>
          </SidebarCard>

          <div className="rounded-[28px] border border-[#ece8ff] bg-white p-5 shadow-[0_18px_40px_rgba(32,23,71,0.08)]">
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={!canEdit || submitting || submittingForApproval}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2f225d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#221745] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {submitting
                ? isUploadingMedia
                  ? "Đang tải media..."
                  : "Đang lưu thay đổi..."
                : "Lưu thay đổi"}
            </button>
            {canSubmit ? (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage("");
                  setIsSubmitConfirmOpen(true);
                }}
                disabled={submitting || submittingForApproval || effectiveSubmitIssues.length > 0}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-3 text-sm font-medium text-sky-800 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingForApproval ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {submittingForApproval ? "Đang gửi duyệt..." : "Gửi duyệt"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => navigate(routePaths.artistTrackDetail(id))}
              className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-[#e6e0ff] px-5 py-3 text-sm font-medium text-[#4d4569] transition hover:bg-[#faf8ff]"
            >
              Hủy
            </button>
          </div>
        </div>
      </div>

      <ConfirmActionModal
        isOpen={isSubmitConfirmOpen}
        title="Gửi bài hát để duyệt?"
        message="Sau khi gửi duyệt, bạn sẽ không thể chỉnh sửa bài hát cho đến khi quá trình kiểm duyệt hoàn tất. Bạn có muốn tiếp tục không?"
        confirmText="Gửi duyệt"
        cancelText="Hủy"
        isLoading={submittingForApproval}
        onCancel={() => setIsSubmitConfirmOpen(false)}
        onConfirm={handleSubmitForApproval}
      />
      {isAppealModalOpen && track?.approvalStatus === "rejected" ? (
        <TrackReviewAppealModal
          track={track}
          reviewTarget={isEnforcement ? "enforcement" : "track_submission"}
          onClose={() => setIsAppealModalOpen(false)}
          onCreated={(appeal) => {
            setLatestAppeal(appeal);
            setIsAppealModalOpen(false);
            showArtistSuccess("Đã gửi phản hồi. Đang chờ Admin xem xét.");
          }}
        />
      ) : null}
    </section>
  );
};

export default ArtistTrackEditPage;
