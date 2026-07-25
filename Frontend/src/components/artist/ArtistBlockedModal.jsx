import { AlertTriangle, ArrowLeft } from "lucide-react";

const ArtistBlockedModal = ({
  isOpen,
  blockedReason = "",
  adminEmail = "admin.seed@reso.local",
  onLeave,
}) => {
  if (!isOpen) {
    return null;
  }

  const resolvedBlockedReason =
    typeof blockedReason === "string" && blockedReason.trim()
      ? blockedReason.trim()
      : "Tài khoản nghệ sĩ của bạn đã bị khóa bởi hệ thống.";

  const supportMailTo = `mailto:${adminEmail}?subject=${encodeURIComponent(
    "Yêu cầu hỗ trợ tài khoản nghệ sĩ bị khóa"
  )}`;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 px-4 py-6">
      <div
        className="absolute inset-0 bg-black/55"
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="artist-blocked-modal-title"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-5 text-neutral-950 shadow-[0_20px_60px_rgba(0,0,0,0.28)] sm:p-6"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600">
              Tài khoản bị khóa
            </p>
            <h2
              id="artist-blocked-modal-title"
              className="mt-3 text-lg font-semibold tracking-tight text-neutral-950"
            >
              Tài khoản nghệ sĩ của bạn đang bị khóa
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Bạn tạm thời không thể truy cập khu vực artist. Vui lòng xem lý do
              bên dưới và liên hệ admin để được hỗ trợ.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
            Lý do bị khóa
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-800">
            {resolvedBlockedReason}
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-sm font-medium text-neutral-900">
            Liên hệ admin qua email:
          </p>
          <a
            href={supportMailTo}
            className="mt-2 inline-flex break-all text-sm font-semibold text-[#5f4fe0] underline decoration-[#c8c1ff] underline-offset-4 transition hover:text-[#493bb7]"
          >
            {adminEmail}
          </a>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Gửi kèm thông tin tài khoản và nội dung cần giải trình để đội ngũ hỗ
            trợ kiểm tra nhanh hơn.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onLeave}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-neutral-950 bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Rời khu vực artist
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArtistBlockedModal;
