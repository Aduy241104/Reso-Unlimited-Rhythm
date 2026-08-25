import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  ImageUp,
  Info,
  Loader2,
  Music2,
  Save,
} from "lucide-react";
import { ARTIST_INPUT_LIMITS } from "../../constants/artistInputLimits";
import {
  editAlbumService,
  getArtistAlbumDetailService,
} from "../../services/artist/artistAlbumService";
import { routePaths } from "../../routes/routePaths";
import {
  showArtistError,
  showArtistSuccess,
} from "../../utils/artistNotification";
import {
  IMAGE_FILE_ACCEPT_WITH_GIF,
  getImageFileValidationError,
} from "../../utils/imageFileValidation";

const MAX_COVER_SIZE = 10 * 1024 * 1024;

const ArtistEditAlbumPage = () => {
  const navigate = useNavigate();
  const { id: albumId } = useParams();
  const fileInputRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingAlbum, setIsLoadingAlbum] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    releaseDate: "",
    coverImage: null,
    coverImagePreview: "",
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    let isMounted = true;

    const loadAlbumData = async () => {
      setIsLoadingAlbum(true);
      setLoadError("");

      try {
        const album = await getArtistAlbumDetailService(albumId);

        if (!isMounted) {
          return;
        }

        if (!album) {
          setLoadError("Không tìm thấy album.");
          return;
        }

        setFormData({
          title: album.title || "",
          releaseDate: album.releaseDate
            ? new Date(album.releaseDate).toISOString().split("T")[0]
            : "",
          coverImage: null,
          coverImagePreview: album.coverImage || "",
        });
      } catch {
        if (isMounted) {
          setLoadError("Không thể tải thông tin album.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingAlbum(false);
        }
      }
    };

    loadAlbumData();

    return () => {
      isMounted = false;
    };
  }, [albumId]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    if (formErrors[name]) {
      setFormErrors((current) => ({ ...current, [name]: "" }));
    }
  };

  const handleCoverImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError = getImageFileValidationError(file, {
      allowGif: true,
      maxSizeBytes: MAX_COVER_SIZE,
      maxSizeLabel: "10 MB",
    });

    if (validationError) {
      setFormErrors((current) => ({
        ...current,
        coverImage: validationError,
      }));
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((current) => ({
        ...current,
        coverImage: file,
        coverImagePreview: reader.result,
      }));
    };
    reader.readAsDataURL(file);
    setFormErrors((current) => ({ ...current, coverImage: "" }));
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.title.trim()) {
      errors.title = "Vui lòng nhập tên album.";
    } else if (
      formData.title.trim().length > ARTIST_INPUT_LIMITS.albumTitle
    ) {
      errors.title = `Tên album không được vượt quá ${ARTIST_INPUT_LIMITS.albumTitle} ký tự.`;
    }

    if (
      formData.releaseDate &&
      Number.isNaN(new Date(formData.releaseDate).getTime())
    ) {
      errors.releaseDate = "Vui lòng chọn ngày phát hành hợp lệ.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      const payload = new FormData();
      payload.append("title", formData.title.trim());

      if (formData.releaseDate) {
        payload.append(
          "releaseDate",
          new Date(formData.releaseDate).toISOString()
        );
      }

      if (formData.coverImage) {
        payload.append("coverImage", formData.coverImage);
      }

      await editAlbumService(albumId, payload);
      showArtistSuccess("Đã cập nhật album thành công.");
      navigate(routePaths.artistAlbumDetail(albumId));
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Không thể cập nhật album. Vui lòng thử lại.";

      if (error?.response?.data?.errors?.field === "title") {
        setFormErrors((current) => ({ ...current, title: message }));
      }
      showArtistError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingAlbum) {
    return (
      <div className="flex min-h-[520px] items-center justify-center gap-3 text-sm text-[#8d87aa]">
        <Loader2 className="h-5 w-5 animate-spin text-[#6f5cf1]" />
        Đang tải thông tin album...
      </div>
    );
  }

  if (loadError) {
    return (
      <section className="mx-auto max-w-[1200px] space-y-5">
        <button
          type="button"
          onClick={() => navigate(routePaths.artistAlbums)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#6f5cf1]"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách album
        </button>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {loadError}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1200px] space-y-5">
      <button
        type="button"
        onClick={() => navigate(routePaths.artistAlbumDetail(albumId))}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#6f5cf1] transition hover:text-[#5946db]"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại chi tiết album
      </button>

      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6f5cf1]">
          Thông tin album
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#241b45]">
          Chỉnh sửa album
        </h1>
        <p className="mt-2 text-sm text-[#817a99]">
          Cập nhật tên, ngày phát hành hoặc ảnh bìa của album.
        </p>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="rounded-[24px] border border-[#ece8ff] bg-white p-5 shadow-[0_14px_36px_rgba(32,23,71,0.06)] sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3efff] text-[#6f5cf1]">
              <Music2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#332a52]">
                Nội dung chỉnh sửa
              </h2>
              <p className="mt-1 text-xs text-[#9690ac]">
                Những thay đổi sẽ được áp dụng cho album hiện tại
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-7 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div>
              <label className="text-sm font-semibold text-[#40375e]">
                Ảnh bìa
              </label>

              {formData.coverImagePreview ? (
                <div className="mt-2 aspect-square overflow-hidden rounded-2xl border border-[#e7e2f5]">
                  <img
                    src={formData.coverImagePreview}
                    alt="Ảnh bìa album đang xem trước"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <label className="mt-2 flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#dcd5f7] bg-[#fcfbff] px-5 text-center transition hover:border-[#a99cf5] hover:bg-[#f9f7ff]">
                  <ImageUp className="h-10 w-10 text-[#7664ef]" />
                  <p className="mt-4 text-sm font-semibold text-[#40375e]">
                    Chọn ảnh bìa mới
                  </p>
                  <p className="mt-1 text-xs text-[#9690ac]">
                    JPG, PNG, GIF hoặc WEBP
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={IMAGE_FILE_ACCEPT_WITH_GIF}
                    onChange={handleCoverImageChange}
                    className="sr-only"
                  />
                </label>
              )}

              {formData.coverImagePreview ? (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#ddd7ff] bg-[#f7f4ff] text-sm font-semibold text-[#6552df] transition hover:bg-[#eeeaff]"
                  >
                    <ImageUp className="h-4 w-4" />
                    Thay ảnh bìa
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={IMAGE_FILE_ACCEPT_WITH_GIF}
                    onChange={handleCoverImageChange}
                    className="sr-only"
                  />
                </>
              ) : null}

              {formErrors.coverImage ? (
                <p className="mt-2 text-xs text-rose-600">
                  {formErrors.coverImage}
                </p>
              ) : null}
              <p className="mt-3 text-xs leading-5 text-[#9690ac]">
                Ảnh vuông được khuyến nghị. Dung lượng tối đa 10 MB.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-semibold text-[#40375e]"
                >
                  Tên album <span className="text-rose-500">*</span>
                </label>
                <div className="relative mt-2">
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    maxLength={ARTIST_INPUT_LIMITS.albumTitle}
                    placeholder="Nhập tên album"
                    className={`h-12 w-full rounded-xl border px-4 pr-16 text-sm text-[#332a52] outline-none transition placeholder:text-[#aaa4bd] focus:ring-4 focus:ring-[#7664ef]/10 ${
                      formErrors.title
                        ? "border-rose-300 focus:border-rose-400"
                        : "border-[#e8e3f5] focus:border-[#9484f5]"
                    }`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#aaa4bd]">
                    {formData.title.length}/{ARTIST_INPUT_LIMITS.albumTitle}
                  </span>
                </div>
                {formErrors.title ? (
                  <p className="mt-2 text-xs text-rose-600">
                    {formErrors.title}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="releaseDate"
                  className="block text-sm font-semibold text-[#40375e]"
                >
                  Ngày phát hành
                </label>
                <div className="relative mt-2">
                  <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9690ac]" />
                  <input
                    type="date"
                    id="releaseDate"
                    name="releaseDate"
                    value={formData.releaseDate}
                    onChange={handleInputChange}
                    className={`h-12 w-full rounded-xl border bg-white pl-11 pr-4 text-sm text-[#514969] outline-none transition focus:ring-4 focus:ring-[#7664ef]/10 ${
                      formErrors.releaseDate
                        ? "border-rose-300 focus:border-rose-400"
                        : "border-[#e8e3f5] focus:border-[#9484f5]"
                    }`}
                  />
                </div>
                {formErrors.releaseDate ? (
                  <p className="mt-2 text-xs text-rose-600">
                    {formErrors.releaseDate}
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <h3 className="text-sm font-bold text-amber-800">
                      Trạng thái phát hành
                    </h3>
                    <p className="mt-1.5 text-sm leading-6 text-amber-800/85">
                      Trạng thái được quản lý riêng. Album cần ít nhất 2 bài hát
                      trước khi có thể phát hành hoặc lên lịch.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-3 rounded-[20px] border border-[#ece8ff] bg-white p-4 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => navigate(routePaths.artistAlbumDetail(albumId))}
            disabled={isSaving}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#e1dced] px-6 text-sm font-semibold text-[#514969] transition hover:bg-[#faf9ff] disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#6f5cf1] px-6 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(99,78,225,0.22)] transition hover:bg-[#5e4bdd] disabled:opacity-50 sm:max-w-sm"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? "Đang lưu thay đổi..." : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </section>
  );
};

export default ArtistEditAlbumPage;
