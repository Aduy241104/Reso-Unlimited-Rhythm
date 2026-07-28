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
import { updateUserPlaylist } from "../../services/userPlaylistService";
import { getApiErrorMessage } from "../../utils/apiError";

const ANIMATION_DURATION = 300;

const normalizePlaylistTitle = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
};

const getPlaylistIdValue = (playlist) =>
  playlist?.playlistId || playlist?.id || "";

const getPlaylistTitleValue = (playlist) => {
  if (typeof playlist?.title === "string" && playlist.title.trim()) {
    return playlist.title;
  }

  if (typeof playlist?.name === "string" && playlist.name.trim()) {
    return playlist.name;
  }

  return "";
};

const getPlaylistDescriptionValue = (playlist) => {
  if (
    typeof playlist?.description === "string" &&
    playlist.description.trim()
  ) {
    return playlist.description.trim();
  }

  return "";
};

const getPlaylistVisibilityValue = (playlist) => {
  if (typeof playlist?.isPublic === "boolean") {
    return playlist.isPublic;
  }

  if (typeof playlist?.public === "boolean") {
    return playlist.public;
  }

  return false;
};

const getPlaylistCoverImageValue = (playlist) => {
  if (
    typeof playlist?.coverImage === "string" &&
    playlist.coverImage.trim()
  ) {
    return playlist.coverImage.trim();
  }

  return "";
};

const EditPlaylistModal = ({
  isOpen,
  onClose,
  onUpdated,
  playlist,
  existingPlaylists = [],
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [titleError, setTitleError] = useState("");
  const fileInputRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (isOpen) {
      setTitle(getPlaylistTitleValue(playlist));
      setDescription(getPlaylistDescriptionValue(playlist));
      setIsPublic(getPlaylistVisibilityValue(playlist));
      setCoverImage(null);
      setCoverPreview(getPlaylistCoverImageValue(playlist));
      setErrorMessage("");
      setTitleError("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isOpen, playlist]);

  useEffect(() => {
    if (!coverImage) {
      return undefined;
    }

    const objectUrl = URL.createObjectURL(coverImage);
    setCoverPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [coverImage]);

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

    setCoverImage(file);
    setErrorMessage("");
  };

  const validateForm = () => {
    const normalizedTitle = normalizePlaylistTitle(title);
    const currentPlaylistId = getPlaylistIdValue(playlist);

    if (!normalizedTitle) {
      setTitleError("Tên playlist không được để trống.");
      return false;
    }

    const hasDuplicateTitle = existingPlaylists.some((item) => {
      const comparedId = getPlaylistIdValue(item);

      if (comparedId === currentPlaylistId) {
        return false;
      }

      return (
        normalizePlaylistTitle(getPlaylistTitleValue(item)) === normalizedTitle
      );
    });

    if (hasDuplicateTitle) {
      setTitleError("Tên playlist đã tồn tại trong tài khoản này.");
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

    const playlistId = getPlaylistIdValue(playlist);

    if (!playlistId) {
      setErrorMessage("Không tìm thấy playlist để cập nhật.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const updatedPlaylist = await updateUserPlaylist(playlistId, {
        title,
        description,
        isPublic,
        coverImage,
      });

      onUpdated?.(updatedPlaylist);
      onClose?.();
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Không thể cập nhật playlist lúc này.")
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
        "flex items-center justify-center overflow-y-auto overscroll-contain p-3 sm:p-4",
        "transition-all duration-300",
        isVisible ? "opacity-100" : "opacity-0",
      ].join(" ")}
      onClick={handleClose}
      aria-hidden="true"
    >
      <div
        className={[
          "max-h-[calc(100dvh-1.5rem)] w-full max-w-[720px] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#1e1e1e] shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl",
          "transition-all duration-300",
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0",
        ].join(" ")}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-playlist-modal-title"
      >
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-8 sm:pt-6">
          <h2
            id="edit-playlist-modal-title"
            className="text-xl font-bold tracking-tight text-white sm:text-3xl"
          >
            Sửa thông tin Playlist
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

        <form onSubmit={handleSubmit} className="px-4 pb-4 pt-3 sm:px-8 sm:pb-6 sm:pt-4">
          <div className="grid gap-5 md:grid-cols-[224px_minmax(0,1fr)]">
            <div className="mx-auto w-full max-w-[180px] space-y-3 md:max-w-none">
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
                      <span className="text-3xl leading-none text-white/90">
                        /
                      </span>
                      <span className="mt-4 text-2xl font-semibold text-white">
                       Chọn ảnh
                      </span>
                    </>
                  )}
                </button>

                
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
                    value={title}
                    onChange={(event) => {
                      setTitle(event.target.value);

                      if (titleError) {
                        setTitleError("");
                      }

                      if (errorMessage) {
                        setErrorMessage("");
                      }
                    }}
                    placeholder="Nhâp tên playlist"
                    className="w-full rounded-xl border border-white/8 bg-[#464646] px-4 py-3 text-lg font-semibold text-white placeholder:text-white/45 focus:border-white/20 focus:outline-none sm:px-5 sm:py-4 sm:text-2xl"
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
                    value={description}
                    onChange={(event) => {
                      setDescription(event.target.value);

                      if (errorMessage) {
                        setErrorMessage("");
                      }
                    }}
                    placeholder="Thêm phần mô tả không bắt buộc"
                    className="min-h-[120px] w-full resize-none rounded-xl border border-white/8 bg-[#464646] px-4 py-3 text-base text-white placeholder:text-white/35 focus:border-white/20 focus:outline-none sm:min-h-[154px] sm:px-5 sm:py-4"
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

                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-w-[132px] items-center justify-center rounded-full bg-white px-7 py-3 text-base font-semibold text-[#111111] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60 sm:px-8 sm:py-4 sm:text-xl"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Đang lưu
                    </span>
                  ) : (
                    "Luu"
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

export default EditPlaylistModal;
