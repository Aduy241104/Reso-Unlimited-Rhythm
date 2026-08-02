import { useEffect, useMemo, useState } from "react";
import { Disc3, FileAudio, FileText, Music4, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import trackService from "../../services/trackService";
import genreService from "../../services/genreService";
import { routePaths } from "../../routes/routePaths";
import { ARTIST_INPUT_LIMITS } from "../../constants/artistInputLimits";
import { showArtistError } from "../../utils/artistNotification";
import {
  IMAGE_FILE_ACCEPT,
  getImageFileValidationError,
  getImageFilesValidationError,
} from "../../utils/imageFileValidation";
import {
  MAX_GENRE_IDS,
  TITLE_MAX_LENGTH,
  mapTrackCopyrightToForm,
  serializeCopyrightForApi,
} from "../../utils/trackWorkflow";
import {
  formatTrackDate,
  getTrackDisplayDuration,
  resolveTrackArtwork,
} from "../../utils/artistTrackPresentation";
import AudioQualityDisplay from "./AudioQualityDisplay";
import AudioQualityPreview from "./AudioQualityPreview";
import TrackCopyrightFields from "../artist/TrackCopyrightFields";

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

const CreateTrackForm = () => {
  const navigate = useNavigate();
  const formId = "artist-create-track-form";
  const [formData, setFormData] = useState({
    title: "",
    versionTitle: "",
    lyricsStatic: "",
    genreIds: [],
  });
  const [audioFile, setAudioFile] = useState(null);
  const [coverImages, setCoverImages] = useState([]);
  const [avatarFile, setAvatarFile] = useState(null);
  const [lyricsSyncFile, setLyricsSyncFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingQualities, setUploadingQualities] = useState(false);
  const [uploadedQualities, setUploadedQualities] = useState([]);
  const [uploadedAudioAnalysis, setUploadedAudioAnalysis] = useState(null);
  const [genres, setGenres] = useState([]);
  const [genresLoading, setGenresLoading] = useState(true);
  const [genresOpen, setGenresOpen] = useState(false);
  const [copyrightForm, setCopyrightForm] = useState(mapTrackCopyrightToForm());
  const [fieldErrors, setFieldErrors] = useState({});
  const [artworkPreview, setArtworkPreview] = useState(() =>
    resolveTrackArtwork({ title: "Bài hát mới" })
  );

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const list = await genreService.getGenresService();
        setGenres(Array.isArray(list) ? list : []);
      } catch (error) {
        console.error("Không thể tải danh sách thể loại:", error);
        setGenres([]);
      } finally {
        setGenresLoading(false);
      }
    };

    fetchGenres();
  }, []);

  useEffect(() => {
    let previewUrl = "";

    if (avatarFile) {
      previewUrl = URL.createObjectURL(avatarFile);
    } else if (coverImages.length > 0) {
      previewUrl = URL.createObjectURL(coverImages[0]);
    }

    if (previewUrl) {
      setArtworkPreview(previewUrl);
      return () => {
        URL.revokeObjectURL(previewUrl);
      };
    }

    setArtworkPreview(
      resolveTrackArtwork({
        title: formData.title || "Bài hát mới",
      })
    );

    return undefined;
  }, [avatarFile, coverImages, formData.title]);

  const selectedGenres = useMemo(
    () =>
      genres.filter((genre) => formData.genreIds.includes(String(genre._id))),
    [formData.genreIds, genres]
  );

  const readinessItems = [
    {
      label: "Đã tải file âm thanh gốc",
      ready: Boolean(audioFile),
    },
    {
      label: "Đã chọn ảnh đại diện hoặc ảnh bìa",
      ready: Boolean(avatarFile || coverImages.length > 0),
    },
    {
      label: "Đã chọn ít nhất một thể loại",
      ready: formData.genreIds.length > 0,
    },
    {
      label: "Đã xác nhận bản quyền",
      ready: Boolean(copyrightForm.declarationAccepted),
    },
  ];

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAudioFileChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    setAudioFile(file);
    setUploadedQualities([]);
    setUploadedAudioAnalysis(null);
  };

  const handleCoverImagesChange = (event) => {
    const files = Array.from(event.target.files || []);
    const validationError = getImageFilesValidationError(files);

    if (validationError) {
      setFieldErrors((current) => ({ ...current, media: validationError }));
      event.target.value = "";
      return;
    }

    setCoverImages((prev) => [...prev, ...files]);
    setFieldErrors((current) => ({ ...current, media: "" }));
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    const validationError = getImageFileValidationError(file);

    if (validationError) {
      setFieldErrors((current) => ({ ...current, avatar: validationError }));
      event.target.value = "";
      return;
    }

    setAvatarFile(file);
    setFieldErrors((current) => ({ ...current, avatar: "" }));
  };

  const handleLyricsSyncChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    setLyricsSyncFile(file);
  };

  const handleRemoveCoverImage = (index) => {
    setCoverImages((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleGenreToggle = (genreId) => {
    const nextGenreId = String(genreId);

    setFormData((prev) => {
      if (prev.genreIds.includes(nextGenreId)) {
        return {
          ...prev,
          genreIds: prev.genreIds.filter((item) => item !== nextGenreId),
        };
      }

      if (prev.genreIds.length >= MAX_GENRE_IDS) {
        showArtistError(`Bạn chỉ có thể chọn tối đa ${MAX_GENRE_IDS} thể loại.`);
        return prev;
      }

      return {
        ...prev,
        genreIds: [...prev.genreIds, nextGenreId],
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFieldErrors({});

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

    if (!audioFile) {
      errors.audio = "Vui lòng tải lên file âm thanh chính.";
    }

    if (!avatarFile && coverImages.length === 0) {
      errors.media = "Vui lòng thêm ảnh đại diện hoặc ít nhất một ảnh bìa.";
    }

    if (!copyrightForm.copyrightOwner?.trim()) {
      errors.copyrightOwner = "Vui lòng nhập chủ sở hữu bản quyền.";
    }

    if (!copyrightForm.recordingOwner?.trim()) {
      errors.recordingOwner = "Vui lòng nhập chủ sở hữu bản ghi.";
    }

    if (!copyrightForm.declarationAccepted) {
      errors.declarationAccepted = "Vui lòng xác nhận cam kết bản quyền.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    setUploadedQualities([]);
    setUploadedAudioAnalysis(null);
    setUploadingQualities(false);

    try {
      setUploadingQualities(true);

      const uploadResponse = await trackService.uploadFiles(
        audioFile,
        avatarFile,
        coverImages,
        lyricsSyncFile
      );

      if (!uploadResponse?.success) {
        throw new Error("Tải file lên thất bại.");
      }

      const {
        audioFiles = [],
        audioAnalysis = null,
        avatar = "",
        coverImages: uploadedCoverImages = [],
        lyricsSyncUrl = "",
      } = uploadResponse.data || {};

      setUploadedQualities(audioFiles);
      setUploadedAudioAnalysis(audioAnalysis);
      setUploadingQualities(false);

      const response = await trackService.createTrack({
        title,
        versionTitle: formData.versionTitle.trim(),
        genreIds: formData.genreIds,
        lyricsStatic: formData.lyricsStatic,
        lyricsSyncUrl,
        audioFiles,
        audioAnalysis,
        coverImage: uploadedCoverImages,
        avatar,
        copyright: serializeCopyrightForApi(copyrightForm),
      });

      if (response?.success) {
        navigate(routePaths.artistMusic, {
          state: {
            message: "Đã tạo bản nháp bài hát thành công.",
          },
        });
      }
    } catch {
      showArtistError("Không thể tạo bài hát vào lúc này.");
      setUploadingQualities(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_290px] 2xl:grid-cols-[minmax(0,1.55fr)_320px]">
      <form id={formId} onSubmit={handleSubmit} className="space-y-6">
        <SectionCard
          icon={Music4}
          eyebrow="Tổng quan"
          title="Thông tin bài hát"
          description="Bắt đầu với phần nhận diện chính của bài hát. Bạn có thể tải file âm thanh gốc ngay bây giờ và hệ thống sẽ tự nhận diện thời lượng."
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
                placeholder="Ví dụ: Bản thu trực tiếp, phối lại..."
                className="h-12 w-full rounded-2xl border border-[#e6e0ff] bg-white px-4 text-sm text-[#241b45] outline-none transition focus:border-[#7c6cf2]"
              />
            </FieldShell>
          </div>
        </SectionCard>

        <SectionCard
          icon={FileAudio}
          eyebrow="Tệp"
          title="Tải lên âm thanh và hình ảnh"
          description="Tải lên một file âm thanh chất lượng cao cho bài hát, cùng với ảnh đại diện, ảnh bìa và file lời đồng bộ nếu có."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <FieldShell label="File âm thanh gốc" error={fieldErrors.audio}>
              <input
                type="file"
                accept=".mp3,.wav,.flac,.aac,.m4a,audio/mpeg,audio/wav,audio/flac,audio/aac,audio/mp4"
                onChange={handleAudioFileChange}
                disabled={loading}
                className="block h-12 w-full rounded-2xl border border-[#e6e0ff] bg-white px-4 py-3 text-sm text-[#241b45] file:mr-3 file:rounded-xl file:border-0 file:bg-[#f3efff] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#5c4fe0]"
              />
              {audioFile ? (
                <p className="mt-2 text-sm text-[#5e5678]">{audioFile.name}</p>
              ) : null}
              {uploadedAudioAnalysis?.duration ? (
                <p className="mt-2 text-xs text-[#8d87aa]">
                  Thời lượng nhận diện: {getTrackDisplayDuration(uploadedAudioAnalysis.duration)}
                </p>
              ) : null}
            </FieldShell>

            <FieldShell label="Ảnh đại diện" error={fieldErrors.avatar}>
              <input
                type="file"
                accept={IMAGE_FILE_ACCEPT}
                onChange={handleAvatarChange}
                disabled={loading}
                className="block h-12 w-full rounded-2xl border border-[#e6e0ff] bg-white px-4 py-3 text-sm text-[#241b45] file:mr-3 file:rounded-xl file:border-0 file:bg-[#f3efff] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#5c4fe0]"
              />
              {avatarFile ? (
                <p className="mt-2 text-sm text-[#5e5678]">{avatarFile.name}</p>
              ) : null}
            </FieldShell>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <FieldShell label="Ảnh bìa" error={fieldErrors.media}>
              <input
                type="file"
                multiple
                accept={IMAGE_FILE_ACCEPT}
                onChange={handleCoverImagesChange}
                disabled={loading}
                className="block h-12 w-full rounded-2xl border border-[#e6e0ff] bg-white px-4 py-3 text-sm text-[#241b45] file:mr-3 file:rounded-xl file:border-0 file:bg-[#f3efff] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#5c4fe0]"
              />
              {coverImages.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {coverImages.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between rounded-2xl border border-[#ece8ff] bg-[#fbfaff] px-4 py-3 text-sm text-[#5e5678]"
                    >
                      <span className="truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCoverImage(index)}
                        disabled={loading}
                        className="text-rose-500 transition hover:text-rose-700"
                      >
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </FieldShell>

            <FieldShell label="File lời đồng bộ (.lrc)">
              <input
                type="file"
                accept=".lrc,text/plain"
                onChange={handleLyricsSyncChange}
                disabled={loading}
                className="block h-12 w-full rounded-2xl border border-[#e6e0ff] bg-white px-4 py-3 text-sm text-[#241b45] file:mr-3 file:rounded-xl file:border-0 file:bg-[#f3efff] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#5c4fe0]"
              />
              {lyricsSyncFile ? (
                <p className="mt-2 text-sm text-[#5e5678]">{lyricsSyncFile.name}</p>
              ) : null}
            </FieldShell>
          </div>

          {(uploadedQualities.length > 0 || uploadingQualities) && (
            <div className="mt-5">
              <AudioQualityDisplay
                qualities={uploadedQualities}
                isLoading={uploadingQualities}
                sourceAnalysis={uploadedAudioAnalysis}
              />
            </div>
          )}

          {uploadedQualities.length > 0 && !uploadingQualities ? (
            <div className="mt-5">
              <AudioQualityPreview qualities={uploadedQualities} />
            </div>
          ) : null}
        </SectionCard>

        <SectionCard
          icon={FileText}
          eyebrow="Nội dung"
          title="Lời bài hát và thể loại"
          description="Thêm lời bài hát tĩnh để tham chiếu và phân loại bài hát với tối đa năm thể loại."
        >
          <FieldShell label="Lời bài hát tĩnh">
            <textarea
              name="lyricsStatic"
              value={formData.lyricsStatic}
              onChange={handleInputChange}
              maxLength={ARTIST_INPUT_LIMITS.trackLyrics}
              rows="7"
              className="w-full rounded-3xl border border-[#e6e0ff] bg-white px-4 py-4 text-sm leading-6 text-[#241b45] outline-none transition focus:border-[#7c6cf2]"
            />
          </FieldShell>

          <div className="mt-5">
            <FieldShell
              label="Thể loại"
              helper={genresLoading ? "Đang tải..." : `${formData.genreIds.length}/${MAX_GENRE_IDS} đã chọn`}
              error={fieldErrors.genres}
            >
              <button
                type="button"
                onClick={() => setGenresOpen((current) => !current)}
                disabled={loading || genresLoading}
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
                          disabled={loading}
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
          description="Hoàn thiện phần này để bài hát có thể đi vào quy trình kiểm duyệt thuận lợi khi bạn sẵn sàng gửi duyệt."
        >
          <TrackCopyrightFields
            value={copyrightForm}
            onChange={setCopyrightForm}
            disabled={loading}
            errors={fieldErrors}
          />
        </SectionCard>
      </form>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-1">
        <SidebarCard title="Xem trước">
          <div className="overflow-hidden rounded-[24px] bg-[#f6f2ff]">
            <img
              src={artworkPreview}
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
            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Bản nháp
            </span>
            <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
              Bài hát mới
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
        </SidebarCard>

        <SidebarCard title="Tóm tắt bài hát">
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#8d87aa]">Thể loại</span>
              <span className="text-right font-medium text-[#241b45]">
                {selectedGenres.length > 0
                  ? selectedGenres.map((genre) => genre.name).join(", ")
                  : "Chưa chọn"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#8d87aa]">Thời lượng</span>
              <span className="text-right font-medium text-[#241b45]">
                {uploadedAudioAnalysis?.duration
                  ? getTrackDisplayDuration(uploadedAudioAnalysis.duration)
                  : "Đang chờ tải lên"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#8d87aa]">Ảnh minh họa</span>
              <span className="text-right font-medium text-[#241b45]">
                {avatarFile ? "Đã có ảnh đại diện" : "Chưa có ảnh đại diện"}
                {coverImages.length > 0 ? ` · ${coverImages.length} ảnh bìa` : ""}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#8d87aa]">Lời đồng bộ</span>
              <span className="text-right font-medium text-[#241b45]">
                {lyricsSyncFile ? lyricsSyncFile.name : "Chưa tải lên"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#8d87aa]">Chuẩn bị ngày</span>
              <span className="text-right font-medium text-[#241b45]">
                {formatTrackDate(new Date().toISOString())}
              </span>
            </div>
          </div>
        </SidebarCard>

        <div className="rounded-[28px] border border-[#ece8ff] bg-white p-5 shadow-[0_18px_40px_rgba(32,23,71,0.08)]">
          <button
            type="submit"
            form={formId}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2f225d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#221745] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? uploadingQualities
                ? "Đang tải media..."
                : "Đang lưu bản nháp..."
              : "Lưu bản nháp"}
          </button>
          <button
            type="button"
            onClick={() => navigate(routePaths.artistMusic)}
            disabled={loading}
            className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-[#e6e0ff] px-5 py-3 text-sm font-medium text-[#4d4569] transition hover:bg-[#faf8ff] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateTrackForm;
