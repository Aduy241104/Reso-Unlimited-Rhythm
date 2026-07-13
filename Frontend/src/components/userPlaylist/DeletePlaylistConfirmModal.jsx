import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const ANIMATION_DURATION = 300;

const DeletePlaylistConfirmModal = ({
  isOpen,
  playlistTitle,
  title = "Xóa khỏi Thư viện?",
  message = "",
  confirmLabel = "Xóa",
  cancelLabel = "Hủy",
  isDeleting = false,
  errorMessage = "",
  variant = "light",
  size = "default",
  confirmTone = "danger",
  extraActionLabel = "",
  onExtraAction,
  extraActionTone = "primary",
  isExtraActionDisabled = false,
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
  const resolvedMessage =
    message || `Thao tác này sẽ xóa ${titleLabel} khỏi Thư viện.`;
  const isDarkVariant = variant === "dark";
  const isCompact = size === "sm";
  const hasExtraAction =
    extraActionLabel && typeof onExtraAction === "function";
  const titleClassName = isCompact
    ? "text-2xl font-bold tracking-tight sm:text-[1.8rem]"
    : "text-3xl font-bold tracking-tight sm:text-[2.1rem]";
  const descriptionClassName = isDarkVariant
    ? "mt-3 max-w-[26rem] text-sm leading-6 text-white/72 sm:mt-4 sm:text-base"
    : "mt-4 max-w-[26rem] text-lg leading-8 text-black/86";
  const panelClassName = [
    "w-full shadow-[0_30px_90px_rgba(0,0,0,0.45)] transition-all duration-300",
    isCompact
      ? "max-w-[420px] rounded-[26px] px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6"
      : "max-w-[560px] rounded-[28px] px-6 pb-7 pt-6 sm:px-10 sm:pb-9 sm:pt-8",
    isDarkVariant
      ? "border border-white/10 bg-[#111111] text-white"
      : "bg-white text-[#111111]",
    isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0",
  ].join(" ");
  const closeButtonClassName = [
    "inline-flex h-11 w-11 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50",
    isDarkVariant
      ? "text-white/55 hover:bg-white/8 hover:text-white"
      : "text-black/55 hover:bg-black/5 hover:text-black",
  ].join(" ");
  const cancelButtonClassName = [
    "inline-flex min-w-0 flex-1 items-center justify-center rounded-full px-4 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
    isCompact ? "text-base" : "text-2xl",
    isDarkVariant
      ? "border border-white/12 bg-transparent text-white hover:bg-white/8"
      : "border border-black/10 bg-white text-black hover:bg-black/5",
  ].join(" ");

  const resolveActionButtonClassName = (tone) =>
    [
      "inline-flex items-center justify-center rounded-full px-5 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
      isCompact ? "text-sm sm:text-base" : "text-xl sm:text-2xl",
      tone === "primary"
        ? "border border-transparent bg-white text-black hover:bg-white/90"
        : tone === "neutral"
          ? isDarkVariant
            ? "border border-white/12 bg-white/10 text-white hover:bg-white/16"
            : "border border-black/10 bg-black/5 text-[#111111] hover:bg-black/10"
          : "border border-transparent bg-[#ef1d28] text-white hover:bg-[#d71923]",
    ].join(" ");

  const confirmButtonClassName = [
    resolveActionButtonClassName(confirmTone),
    "min-w-0 flex-1",
  ].join(" ");

  const extraActionButtonClassName = [
    resolveActionButtonClassName(extraActionTone),
    hasExtraAction && isCompact ? "w-full" : "min-w-[124px]",
  ].join(" ");

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
        className={panelClassName}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-playlist-modal-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="delete-playlist-modal-title" className={titleClassName}>
              {title}
            </h2>
            <p className={descriptionClassName}>{resolvedMessage}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={closeButtonClassName}
            aria-label="Đóng modal"
            disabled={isDeleting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMessage ? (
          <div
            className={[
              "mt-5 rounded-2xl border px-4 py-3 text-sm",
              isDarkVariant
                ? "border-white/12 bg-white/6 text-white/78"
                : "border-[#ef4444]/20 bg-[#ef4444]/8 text-[#b91c1c]",
            ].join(" ")}
          >
            {errorMessage}
          </div>
        ) : null}

        <div className={isCompact ? "mt-7 space-y-3 sm:mt-8" : "mt-8 space-y-4 sm:mt-10"}>
          {hasExtraAction ? (
            <button
              type="button"
              onClick={onExtraAction}
              className={extraActionButtonClassName}
              disabled={isDeleting || isExtraActionDisabled}
            >
              {extraActionLabel}
            </button>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className={cancelButtonClassName}
              disabled={isDeleting}
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              className={confirmButtonClassName}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <span className="inline-flex items-center gap-2 text-inherit">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {confirmLabel}
                </span>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DeletePlaylistConfirmModal;
