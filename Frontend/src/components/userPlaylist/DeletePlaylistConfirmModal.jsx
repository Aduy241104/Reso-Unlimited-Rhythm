import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const ANIMATION_DURATION = 300;

const DeletePlaylistConfirmModal = ({
  isOpen,
  playlistTitle,
  isDeleting = false,
  errorMessage = "",
  onClose,
  onConfirm,
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

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
      if (event.key === "Escape" && !isDeleting) {
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
  }, [isDeleting, onClose, shouldRender]);

  if (!shouldRender || typeof document === "undefined") {
    return null;
  }

  const titleLabel = playlistTitle?.trim() || "playlist này";

  return createPortal(
    <div
      className={[
        "fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm",
        "transition-all duration-300",
        isVisible ? "opacity-100" : "opacity-0",
      ].join(" ")}
      onClick={() => {
        if (!isDeleting) {
          onClose?.();
        }
      }}
      aria-hidden="true"
    >
      <div
        className={[
          "w-full max-w-[560px] rounded-[28px] bg-white px-6 pb-7 pt-6 text-[#111111] shadow-[0_30px_90px_rgba(0,0,0,0.45)]",
          "transition-all duration-300 sm:px-10 sm:pb-9 sm:pt-8",
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0",
        ].join(" ")}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-playlist-modal-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="delete-playlist-modal-title"
              className="text-3xl font-bold tracking-tight sm:text-[2.1rem]"
            >
              Xóa khỏi Thư viện?
            </h2>
            <p className="mt-4 max-w-[26rem] text-lg leading-8 text-black/86">
              Thao tác này sẽ xóa <span className="font-semibold">{titleLabel}</span>{" "}
              khỏi Thư viện.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-black/55 transition hover:bg-black/5 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Đóng modal"
            disabled={isDeleting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMessage ? (
          <div className="mt-5 rounded-2xl border border-[#ef4444]/20 bg-[#ef4444]/8 px-4 py-3 text-sm text-[#b91c1c]">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-end gap-3 sm:mt-10 sm:gap-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-w-[96px] items-center justify-center rounded-full px-4 py-3 text-2xl font-semibold text-black transition hover:text-black/70 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isDeleting}
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex min-w-[124px] items-center justify-center rounded-full border-2 border-[#60a5fa] bg-[#ef1d28] px-7 py-3 text-2xl font-semibold text-white transition hover:bg-[#d71923] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <span className="inline-flex items-center gap-2 text-xl">
                <Loader2 className="h-5 w-5 animate-spin" />
                Xóa
              </span>
            ) : (
              "Xóa"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DeletePlaylistConfirmModal;
