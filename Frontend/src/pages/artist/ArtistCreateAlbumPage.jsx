import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ImageUp,
  Info,
  Loader2,
  Music2,
  Plus,
  X,
} from "lucide-react";
import { ARTIST_INPUT_LIMITS } from "../../constants/artistInputLimits";
import { createAlbumService } from "../../services/artist/artistAlbumService";
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

const ArtistCreateAlbumPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    coverImage: null,
    coverImagePreview: "",
  });
  const [formErrors, setFormErrors] = useState({});

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    if (formErrors[name]) {
      setFormErrors((current) => ({
        ...current,
        [name]: "",
      }));
    }
  };

  const applyCoverFile = (file) => {
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
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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

  const removeCoverImage = () => {
    setFormData((current) => ({
      ...current,
      coverImage: null,
      coverImagePreview: "",
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const payload = new FormData();
      payload.append("title", formData.title.trim());

      if (formData.coverImage) {
        payload.append("coverImage", formData.coverImage);
      }

      const newAlbum = await createAlbumService(payload);

      showArtistSuccess(
        "Đã tạo album nháp thành công. Hãy thêm ít nhất 2 bài hát trước khi phát hành."
      );
      navigate(routePaths.artistAlbumDetail(newAlbum.id));
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Không thể tạo album. Vui lòng thử lại.";

      if (error?.response?.data?.errors?.field === "title") {
        setFormErrors((current) => ({ ...current, title: message }));
      }
      showArtistError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-[1600px] space-y-5">
      <button
        type="button"
        onClick={() => navigate(routePaths.artistAlbums)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#6f5cf1] transition hover:text-[#5946db]"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách album
      </button>

      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6f5cf1]">
          Album mới
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#241b45]">
          Tạo album mới
        </h1>
        <p className="mt-2 text-sm text-[#817a99]">
          Thêm thông tin và ảnh bìa để bắt đầu xây dựng album của bạn.
        </p>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-[24px] border border-[#ece8ff] bg-white p-5 shadow-[0_14px_36px_rgba(32,23,71,0.06)] sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3efff] text-[#6f5cf1]">
                <Music2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#332a52]">
                  Thông tin album
                </h2>
                <p className="mt-1 text-xs text-[#9690ac]">
                  Các thông tin cơ bản của album
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div>
                <label className="text-sm font-semibold text-[#40375e]">
                  Ảnh bìa
                </label>

                {formData.coverImagePreview ? (
                  <div className="relative mt-2 aspect-square overflow-hidden rounded-2xl border border-[#e7e2f5] bg-[#faf9ff]">
                    <img
                      src={formData.coverImagePreview}
                      alt="Ảnh bìa album đang xem trước"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeCoverImage}
                      className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#281f43]/80 text-white backdrop-blur-sm transition hover:bg-rose-600"
                      aria-label="Xóa ảnh bìa"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    className={[
                      "mt-2 flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 text-center transition",
                      isDragging
                        ? "border-[#7867ec] bg-[#f3efff]"
                        : "border-[#dcd5f7] bg-[#fcfbff] hover:border-[#a99cf5] hover:bg-[#f9f7ff]",
                    ].join(" ")}
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        fileInputRef.current?.click();
                      }
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setIsDragging(false);
                      applyCoverFile(event.dataTransfer.files?.[0]);
                    }}
                  >
                    <ImageUp className="h-10 w-10 text-[#7664ef]" />
                    <p className="mt-4 text-sm font-semibold text-[#40375e]">
                      Kéo và thả ảnh vào đây
                    </p>
                    <p className="mt-1 text-xs text-[#9690ac]">hoặc</p>
                    <span className="mt-3 inline-flex h-9 items-center rounded-lg border border-[#dcd5f7] bg-white px-3 text-xs font-semibold text-[#6552df]">
                      Chọn tệp từ máy
                    </span>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={IMAGE_FILE_ACCEPT_WITH_GIF}
                  onChange={(event) =>
                    applyCoverFile(event.target.files?.[0])
                  }
                  className="sr-only"
                />
                {formErrors.coverImage ? (
                  <p className="mt-2 text-xs text-rose-600">
                    {formErrors.coverImage}
                  </p>
                ) : null}
                <div className="mt-3 space-y-1 text-xs leading-5 text-[#9690ac]">
                  <p>Định dạng: JPG, PNG, GIF hoặc WEBP</p>
                  <p>Dung lượng tối đa: 10 MB</p>
                  <p>Khuyến nghị ảnh vuông, tối thiểu 1000 × 1000 px</p>
                </div>
              </div>

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
                    placeholder="Nhập tên album"
                    maxLength={ARTIST_INPUT_LIMITS.albumTitle}
                    className={`h-12 w-full rounded-xl border bg-white px-4 pr-16 text-sm text-[#332a52] outline-none transition placeholder:text-[#aaa4bd] focus:ring-4 focus:ring-[#7664ef]/10 ${
                      formErrors.title
                        ? "border-rose-300 focus:border-rose-400"
                        : "border-[#e8e3f5] focus:border-[#9484f5]"
                    }`}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#aaa4bd]">
                    {formData.title.length}/{ARTIST_INPUT_LIMITS.albumTitle}
                  </span>
                </div>
                {formErrors.title ? (
                  <p className="mt-2 text-xs text-rose-600">
                    {formErrors.title}
                  </p>
                ) : null}

                <div className="mt-6 rounded-2xl border border-[#e8e3f5] bg-[#faf9ff] p-4">
                  <div className="flex items-start gap-3">
                    <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#7664ef]" />
                    <div>
                      <h3 className="text-sm font-bold text-[#40375e]">
                        Sau khi tạo album
                      </h3>
                      <p className="mt-1.5 text-sm leading-6 text-[#817a99]">
                        Album sẽ được lưu ở trạng thái bản nháp. Bạn có thể thêm
                        bài hát, cập nhật ngày phát hành và chỉnh sửa ảnh bìa ở
                        bước tiếp theo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[24px] border border-[#ece8ff] bg-white p-5 shadow-[0_14px_36px_rgba(32,23,71,0.06)]">
              <h2 className="text-lg font-bold text-[#332a52]">
                Danh sách bài hát
              </h2>
              <div className="mt-4 flex min-h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#dcd5f7] bg-[#fcfbff] px-5 text-center">
                <Music2 className="h-10 w-10 text-[#7664ef]" />
                <h3 className="mt-4 text-sm font-bold text-[#40375e]">
                  Chưa thể thêm bài hát
                </h3>
                <p className="mt-2 text-xs leading-5 text-[#9690ac]">
                  Hãy tạo album trước, sau đó bạn có thể chọn bài hát từ thư
                  viện để thêm vào album.
                </p>
                <span className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-[#eeeaff] px-3 text-xs font-semibold text-[#7664ef]">
                  <Plus className="h-3.5 w-3.5" />
                  Thêm ở bước tiếp theo
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <h3 className="text-sm font-bold text-amber-800">Lưu ý</h3>
                  <ul className="mt-2 space-y-2 text-xs leading-5 text-amber-800/85">
                    <li>• Album cần ít nhất 2 bài hát trước khi phát hành.</li>
                    <li>• Bạn có thể sắp xếp và gỡ bài hát sau khi tạo album.</li>
                    <li>• Chỉ sử dụng ảnh bìa mà bạn có quyền sở hữu.</li>
                  </ul>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-3 rounded-[20px] border border-[#ece8ff] bg-white p-4 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => navigate(routePaths.artistAlbums)}
            disabled={isLoading}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#e1dced] px-6 text-sm font-semibold text-[#514969] transition hover:bg-[#faf9ff] disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#6f5cf1] px-6 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(99,78,225,0.22)] transition hover:bg-[#5e4bdd] disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-sm"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isLoading ? "Đang tạo album..." : "Tạo album"}
          </button>
        </div>
      </form>
    </section>
  );
};

export default ArtistCreateAlbumPage;
