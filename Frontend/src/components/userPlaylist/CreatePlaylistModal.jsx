import {
  Globe,
  ImagePlus,
  Loader2,
  Lock,
  MoreHorizontal,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createUserPlaylist } from "../../services/userPlaylistService";
import { getApiErrorMessage } from "../../utils/apiError";

const ANIMATION_DURATION = 300;

const INITIAL_FORM_STATE = {
  title: "Danh sách phát của tôi",
  description: "",
  isPublic: false,
  coverImage: null,
};

const normalizePlaylistTitle = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
};

const getPlaylistTitleValue = (playlist) => {
  if (typeof playlist?.title === "string" && playlist.title.trim()) {
    return playlist.title;
  }

  if (typeof playlist?.name === "string" && playlist.name.trim()) {
    return playlist.name;
  }

  return "";
};

const CreatePlaylistModal = ({
  isOpen,
  onClose,
  onCreated,
  children,
  existingPlaylists = [],
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [coverPreview, setCoverPreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [titleError, setTitleError] = useState("");
  const fileInputRef = useRef(null);
  const descriptionId = useId();
  const titleId = useId();

  useEffect(() => {
    if (!formData.coverImage) {
      setCoverPreview("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(formData.coverImage);
    setCoverPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [formData.coverImage]);

  useEffect(() => {
    if (isOpen) {
      if (!shouldRender) {
        const mountFrameId = window.requestAnimationFrame(() => {
          setShouldRender(true);
        });

        return () => {
          window.cancelAnimationFrame(mountFrameId);
        };
      }

      const enterFrameId = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });

      return () => {
        window.cancelAnimationFrame(enterFrameId);
      };
    }

    if (!shouldRender) {
      return undefined;
    }

    const exitFrameId = window.requestAnimationFrame(() => {
      setIsVisible(false);
    });

    const timeoutId = window.setTimeout(() => {
      setShouldRender(false);
    }, ANIMATION_DURATION);

    return () => {
      window.cancelAnimationFrame(exitFrameId);
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, shouldRender]);

  useEffect(() => {
    if (!shouldRender) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose?.();
      }
    };

    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSubmitting, onClose, shouldRender]);

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    onClose?.();
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_STATE);
    setErrorMessage("");
    setTitleError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleTitleChange = (event) => {
    const value = event.target.value;

    setFormData((current) => ({
      ...current,
      title: value,
    }));

    if (titleError) {
      setTitleError("");
    }

    if (errorMessage) {
      setErrorMessage("");
    }
  };

  const handleDescriptionChange = (event) => {
    const value = event.target.value;

    setFormData((current) => ({
      ...current,
      description: value,
    }));

    if (errorMessage) {
      setErrorMessage("");
    }
  };

  const handleToggleVisibility = () => {
    setFormData((current) => ({
      ...current,
      isPublic: !current.isPublic,
    }));
  };

  const handleSelectCover = () => {
    fileInputRef.current?.click();
  };

  const handleCoverChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Vui lòng chọn tệp hình hợp lệ.");
      event.target.value = "";
      return;
    }

    setFormData((current) => ({
      ...current,
      coverImage: file,
    }));
    setErrorMessage("");
  };

  const handleRemoveCover = () => {
    setFormData((current) => ({
      ...current,
      coverImage: null,
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateForm = () => {
    const normalizedTitle = normalizePlaylistTitle(formData.title);

    if (!normalizedTitle) {
      setTitleError("Tên playlist không được để trống.");
      return false;
    }

    const hasDuplicateTitle = existingPlaylists.some(
      (playlist) =>
        normalizePlaylistTitle(getPlaylistTitleValue(playlist)) === normalizedTitle
    );

    if (hasDuplicateTitle) {
      setTitleError("Tên playlist đã tồn tại.");
      return false;
    }

    setTitleError("");
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const createdPlaylist = await createUserPlaylist({
        title: formData.title,
        description: formData.description,
        isPublic: formData.isPublic,
        coverImage: formData.coverImage,
      });

      resetForm();
      onCreated?.(createdPlaylist);
      onClose?.();
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Không thể tạo playlist lúc này.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!shouldRender || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className={[
        "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
        "flex items-center justify-center p-4",
        "transition-all duration-300",
        isVisible ? "opacity-100" : "opacity-0",
      ].join(" ")}
      onClick={handleClose}
      aria-hidden="true"
    >
      <div
        className={[
          "w-full max-w-[720px] rounded-3xl border border-white/10 bg-[#1e1e1e] shadow-2xl",
          "transition-all duration-300",
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0",
        ].join(" ")}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-playlist-modal-title"
      >
        <div className="flex items-center justify-between px-6 pb-2 pt-6 sm:px-8">
          <h2
            id="create-playlist-modal-title"
            className="text-3xl font-bold tracking-tight text-white"
          >
            Tạo playlist mới
          </h2>

          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/70 transition-all duration-300 hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Dong modal"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 sm:px-8">
          <div className="grid gap-5 md:grid-cols-[224px_minmax(0,1fr)]">
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="hidden"
              />

              <div className="relative">
                <button
                  type="button"
                  onClick={handleSelectCover}
                  className="group flex aspect-square w-full flex-col items-center justify-center rounded-2xl bg-[#262626] p-6 text-white transition hover:bg-[#303030]"
                >
                  {coverPreview ? (
                    <img
                      src={coverPreview}
                      alt="Playlist cover preview"
                      className="h-full w-full rounded-xl object-cover"
                    />
                  ) : (
                    <>
                      <div className="mb-5 rounded-full border border-white/14 p-4 text-white/90">
                        <ImagePlus className="h-10 w-10" />
                      </div>
                      <span className="text-3xl leading-none text-white/90">/</span>
                      <span className="mt-4 text-2xl font-semibold text-white">
                        Chọn ảnh
                      </span>
                    </>
                  )}
                </button>

                {coverPreview ? (
                  <button
                    type="button"
                    onClick={handleRemoveCover}
                    className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/65"
                    aria-label="Xoa anh da chon"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                ) : null}
              </div>

              
            </div>

            <div className="flex min-w-0 flex-col">
              <div className="space-y-5">
                <div>
                  <label htmlFor={titleId} className="sr-only">
                    Tên playlist
                  </label>
                  <input
                    id={titleId}
                    type="text"
                    value={formData.title}
                    onChange={handleTitleChange}
                    placeholder="Nhap ten playlist"
                    className="w-full rounded-xl border border-white/8 bg-[#464646] px-5 py-4 text-2xl font-semibold text-white placeholder:text-white/45 focus:border-white/20 focus:outline-none"
                    maxLength={120}
                    disabled={isSubmitting}
                  />
                  {titleError ? (
                    <p className="mt-2 text-sm text-[#ff8b8b]">{titleError}</p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor={descriptionId} className="sr-only">
                    Mô tả playlist
                  </label>
                  <textarea
                    id={descriptionId}
                    value={formData.description}
                    onChange={handleDescriptionChange}
                    placeholder="Thêm phần mô tả không bắt buộc"
                    className="min-h-[154px] w-full resize-none rounded-xl border border-white/8 bg-[#464646] px-5 py-4 text-base text-white placeholder:text-white/35 focus:border-white/20 focus:outline-none"
                    maxLength={500}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-3">
                  {errorMessage ? (
                    <div className="rounded-2xl border border-[#ff8b8b]/30 bg-[#ff8b8b]/10 px-4 py-3 text-sm text-[#ffd2d2]">
                      {errorMessage}
                    </div>
                  ) : null}


                  {children}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-w-[132px] items-center justify-center rounded-full bg-white px-8 py-4 text-xl font-semibold text-[#111111] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Đang lưu
                    </span>
                  ) : (
                    "Lưu"
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default CreatePlaylistModal;
