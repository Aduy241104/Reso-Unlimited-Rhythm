import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import trackService from "../../services/trackService";
import genreService from "../../services/genreService";
import { routePaths } from "../../routes/routePaths";
import { getApiErrorFullMessage } from "../../utils/apiError";
import {
  MAX_GENRE_IDS,
  TITLE_MAX_LENGTH,
  mapTrackCopyrightToForm,
  serializeCopyrightForApi,
} from "../../utils/trackWorkflow";
import AudioQualityDisplay from "./AudioQualityDisplay";
import AudioQualityPreview from "./AudioQualityPreview";
import TrackCopyrightFields from "../artist/TrackCopyrightFields";

const CreateTrackForm = () => {
  const navigate = useNavigate();
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
  const [errorMessage, setErrorMessage] = useState("");
  const [genres, setGenres] = useState([]);
  const [genresLoading, setGenresLoading] = useState(true);
  const [genresOpen, setGenresOpen] = useState(false);
  const [copyrightForm, setCopyrightForm] = useState(mapTrackCopyrightToForm());
  const [fieldErrors, setFieldErrors] = useState({});

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
    setCoverImages((prev) => [...prev, ...files]);
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    setAvatarFile(file);
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
        setErrorMessage(`Bạn chỉ có thể chọn tối đa ${MAX_GENRE_IDS} thể loại.`);
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
    setErrorMessage("");
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
      errors.audio = "Vui lòng tải lên tệp âm thanh.";
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
        throw new Error("Tải tệp lên thất bại.");
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
    } catch (error) {
      setErrorMessage(getApiErrorFullMessage(error, "Không thể tạo bài hát lúc này."));
      setUploadingQualities(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-[#241b15]">Tạo bài hát mới</h3>
      <p className="mt-2 text-sm text-neutral-600">
        Hãy tải lên file nhạc gốc trước. Hệ thống sẽ tự đọc thời lượng trực tiếp
        từ file âm thanh, nên bạn không cần nhập thủ công nữa.
      </p>

      {errorMessage ? (
        <div className="mt-4 whitespace-pre-line rounded-md bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {(uploadedQualities.length > 0 || uploadingQualities) && (
        <AudioQualityDisplay
          qualities={uploadedQualities}
          isLoading={uploadingQualities}
          sourceAnalysis={uploadedAudioAnalysis}
        />
      )}

      {uploadedQualities.length > 0 && !uploadingQualities && (
        <AudioQualityPreview qualities={uploadedQualities} />
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
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
            className={`mt-2 w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
              fieldErrors.title
                ? "border-red-500 focus:border-red-500"
                : "border-neutral-200 focus:border-[#8b5e3c]"
            }`}
            required
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
            placeholder="Ví dụ: Acoustic, Live, Remix..."
            className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-[#8b5e3c] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#241b15]">
            Tệp âm thanh *
          </label>
          <p className={`mt-1 text-xs ${fieldErrors.audio ? "text-red-500" : "text-neutral-500"}`}>
            {fieldErrors.audio ||
              "Tải lên một file nguồn chất lượng cao. Hệ thống sẽ tự lấy thời lượng và tạo nhiều mức chất lượng phát."}
          </p>
          <input
            type="file"
            accept=".mp3,.wav,.flac,.aac,.m4a,audio/mpeg,audio/wav,audio/flac,audio/aac,audio/mp4"
            onChange={handleAudioFileChange}
            disabled={loading}
            className={`mt-2 w-full rounded-md border px-3 py-2 text-sm disabled:bg-neutral-100 ${
              fieldErrors.audio ? "border-red-500" : "border-neutral-200"
            }`}
          />
          {audioFile ? (
            <div className="mt-2 flex items-center justify-between rounded-md bg-neutral-50 p-2">
              <p className="truncate text-sm text-neutral-700">{audioFile.name}</p>
              <button
                type="button"
                onClick={() => {
                  setAudioFile(null);
                  setUploadedQualities([]);
                  setUploadedAudioAnalysis(null);
                }}
                disabled={loading}
                className="ml-2 text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                x
              </button>
            </div>
          ) : null}
          {uploadedAudioAnalysis?.duration ? (
            <p className="mt-2 text-xs text-neutral-500">
              Thời lượng nhận diện được: {Math.round(uploadedAudioAnalysis.duration)} giây.
            </p>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-[#241b15]">
            Ảnh đại diện hoặc ảnh bìa *
          </label>
          <p className={`mt-1 text-xs ${fieldErrors.media ? "text-red-500" : "text-neutral-500"}`}>
            {fieldErrors.media || "Thêm ảnh đại diện cho bài hát hoặc ít nhất một ảnh bìa."}
          </p>

          <div className="mt-2 space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#241b15]">Ảnh đại diện</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={loading}
                className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm disabled:bg-neutral-100"
              />
              {avatarFile ? (
                <div className="mt-2 flex items-center justify-between rounded-md bg-neutral-50 p-2">
                  <p className="truncate text-sm text-neutral-700">{avatarFile.name}</p>
                  <button
                    type="button"
                    onClick={() => setAvatarFile(null)}
                    disabled={loading}
                    className="ml-2 text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    x
                  </button>
                </div>
              ) : null}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#241b15]">Ảnh bìa</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleCoverImagesChange}
                disabled={loading}
                className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm disabled:bg-neutral-100"
              />
              {coverImages.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {coverImages.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between rounded-md bg-neutral-50 p-2"
                    >
                      <p className="truncate text-sm text-neutral-700">{file.name}</p>
                      <button
                        type="button"
                        onClick={() => handleRemoveCoverImage(index)}
                        disabled={loading}
                        className="ml-2 text-red-500 hover:text-red-700 disabled:opacity-50"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#241b15]">
            Lời bài hát
          </label>
          <textarea
            name="lyricsStatic"
            value={formData.lyricsStatic}
            onChange={handleInputChange}
            rows="4"
            className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-[#8b5e3c] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#241b15]">
            Lời đồng bộ (.lrc)
          </label>
          <input
            type="file"
            accept=".lrc,text/plain"
            onChange={handleLyricsSyncChange}
            disabled={loading}
            className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm disabled:bg-neutral-100"
          />
          {lyricsSyncFile ? (
            <div className="mt-2 flex items-center justify-between rounded-md bg-neutral-50 p-2">
              <p className="truncate text-sm text-neutral-700">{lyricsSyncFile.name}</p>
              <button
                type="button"
                onClick={() => setLyricsSyncFile(null)}
                disabled={loading}
                className="ml-2 text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                x
              </button>
            </div>
          ) : null}
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-[#241b15]">Thể loại *</label>
          <p className={`mt-1 text-xs ${fieldErrors.genres ? "text-red-500" : "text-neutral-500"}`}>
            {fieldErrors.genres || `Chọn tối đa ${MAX_GENRE_IDS} thể loại.`}
          </p>

          {genresLoading ? (
            <p className="mt-2 text-sm text-neutral-600">Đang tải thể loại...</p>
          ) : (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setGenresOpen((current) => !current)}
                disabled={loading}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${
                  fieldErrors.genres ? "border-red-500" : "border-neutral-200"
                }`}
              >
                <div className="truncate">
                  {formData.genreIds.length === 0
                    ? "Chọn thể loại..."
                    : genres
                        .filter((genre) => formData.genreIds.includes(String(genre._id)))
                        .map((genre) => genre.name)
                        .join(", ")}
                </div>
                <div className="ml-2 text-neutral-500">v</div>
              </button>

              {genresOpen ? (
                <div className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-md border border-neutral-200 bg-white p-2 shadow">
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
                </div>
              ) : null}
            </div>
          )}
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
                ? "Đang tải media..."
                : "Đang lưu bản nháp..."
              : "Lưu bản nháp"}
          </button>
          <button
            type="button"
            onClick={() => navigate(routePaths.artistMusic)}
            disabled={loading}
            className="rounded-md border border-neutral-300 px-4 py-2 font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTrackForm;
