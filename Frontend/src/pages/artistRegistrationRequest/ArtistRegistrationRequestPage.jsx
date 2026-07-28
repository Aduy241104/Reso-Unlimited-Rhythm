import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  FileText,
  Loader2,
  Music4,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { routePaths } from "../../routes/routePaths";
import {
  getApiErrorDetailsText,
  getApiErrorFullMessage,
} from "../../utils/apiError";
import { createArtistRegistrationRequestService } from "../../services/artist/artistRegistrationRequestService";
import { getMyArtistRegistrationRequestsService } from "../../services/artist/userArtistRegistrationListService";

const GENRE_OPTIONS = [
  "Pop",
  "Rock",
  "Hip Hop",
  "R&B",
  "Electronic",
  "Jazz",
  "Classical",
  "Country",
  "Latin",
  "K-Pop",
  "Indie",
  "Metal",
  "Folk",
  "Blues",
  "Reggae",
  "Other",
];

const SOCIAL_PLATFORM_FIELDS = [
  {
    key: "spotify",
    label: "Spotify",
    placeholder: "https://open.spotify.com/artist/...",
  },
  {
    key: "youtube",
    label: "YouTube",
    placeholder: "https://youtube.com/@...",
  },
  {
    key: "tiktok",
    label: "TikTok",
    placeholder: "https://tiktok.com/@...",
  },
  {
    key: "facebook",
    label: "Facebook",
    placeholder: "https://facebook.com/...",
  },
  {
    key: "instagram",
    label: "Instagram",
    placeholder: "https://instagram.com/...",
  },
  {
    key: "soundcloud",
    label: "SoundCloud",
    placeholder: "https://soundcloud.com/...",
  },
  { key: "website", label: "Website", placeholder: "https://..." },
];

const sectionCardClassName =
  "rounded-[20px] border border-white/10 bg-white/[0.03] p-5 sm:p-6";

const createInitialFormState = () => ({
  stageName: "",
  bio: "",
  avatar: null,
  genres: [],
  socialLinks: {
    spotify: "",
    youtube: "",
    tiktok: "",
    facebook: "",
    instagram: "",
    soundcloud: "",
    website: "",
    other: "",
  },
  fullName: "",
  idNumber: "",
  dateOfBirth: "",
  frontImage: null,
  backImage: null,
  demoTrackUrls: [],
  musicLinks: [],
  portfolioDescription: "",
  acceptedTerms: false,
  copyrightCommitment: false,
  truthfulInformationCommitment: false,
});

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const FieldLabel = ({ children, required = false }) => (
  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
    {children}
    {required ? <span className="ml-1 text-rose-300">*</span> : null}
  </label>
);

const FieldHint = ({ children }) =>
  children ? (
    <p className="mt-2 text-xs leading-5 text-white/40">{children}</p>
  ) : null;

const FieldError = ({ children }) =>
  children ? (
    <p className="mt-2 text-xs font-medium leading-5 text-rose-300">{children}</p>
  ) : null;

const inputClassName =
  "min-h-[52px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#f5b66f] focus:ring-2 focus:ring-[#f5b66f]/20 shadow-sm";

const TextInput = ({ error, className = "", ...props }) => (
  <input
    {...props}
    className={[
      inputClassName,
      error ? "border-rose-500 ring-1 ring-rose-500/30" : "",
      className,
    ].join(" ")}
  />
);

const TextArea = ({ error, className = "", ...props }) => (
  <textarea
    {...props}
    className={[
      "w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#f5b66f] focus:ring-2 focus:ring-[#f5b66f]/20 shadow-sm",
      error ? "border-rose-500 ring-1 ring-rose-500/30" : "",
      className,
    ].join(" ")}
  />
);

const DateInput = ({ error, className = "", ...props }) => (
  <div className="group relative">
    <input
      {...props}
      className={[
        "min-h-[52px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-14 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#f5b66f] focus:ring-2 focus:ring-[#f5b66f]/20 shadow-sm",
        "[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:h-10 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:rounded-xl [&::-webkit-calendar-picker-indicator]:opacity-0",
        error ? "border-rose-500 ring-1 ring-rose-500/30" : "",
        className,
      ].join(" ")}
    />
    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-700">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 2v4M16 2v4M3.5 9.5h17M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18V7A1.5 1.5 0 0 1 5 5.5Zm2.5 7h3m3 0h3m-9 4h3"
          />
        </svg>
      </div>
    </div>
  </div>
);

const UploadField = ({
  name,
  title,
  required = false,
  error,
  file,
  onFileSelect,
  accept = "image/*",
  hint,
}) => {
  const inputId = `artist-registration-${name}`;
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    if (typeof file === "string") {
      setPreviewUrl(file);
      return;
    }

    if (file instanceof File || file instanceof Blob) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  return (
    <div className="flex flex-col h-full">
      <FieldLabel required={required}>{title}</FieldLabel>
      <input
        ref={inputRef}
        id={inputId}
        name={name}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const selectedFile = event.target.files?.[0] || null;
          if (selectedFile) {
            onFileSelect?.(name, selectedFile);
          }
        }}
      />
      <button
        type="button"
        onClick={openFilePicker}
        className={[
          "flex min-h-[56px] w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition shadow-sm",
          error
            ? "border-rose-400 bg-rose-50/50"
            : "border-slate-300 bg-white hover:border-[#f5b66f] hover:bg-amber-50/20",
        ].join(" ")}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">
            {file?.name || "Chọn file hình ảnh"}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">PNG, JPG hoặc WEBP</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-800">
          <span className="text-xs font-bold">↑</span>
        </div>
      </button>

      {previewUrl ? (
        <div className="mt-3 relative w-full flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2 shadow-sm flex flex-col justify-between">
          <img
            src={previewUrl}
            alt="Xem trước ảnh đã chọn"
            className="h-44 w-full rounded-lg object-cover sm:h-52"
          />
          <div className="mt-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
              ✓ Ảnh đã chọn
            </span>
            <button
              type="button"
              onClick={openFilePicker}
              className="text-[11px] font-bold text-amber-800 hover:underline"
            >
              Đổi ảnh khác
            </button>
          </div>
        </div>
      ) : null}

      <FieldHint>{hint}</FieldHint>
      <FieldError>{error}</FieldError>
    </div>
  );
};

const UrlListEditor = ({
  label,
  value,
  inputValue,
  onInputChange,
  onAdd,
  onRemove,
  placeholder,
  helper,
}) => (
  <div>
    <FieldLabel>{label}</FieldLabel>
    <div className="flex flex-col gap-3 sm:flex-row">
      <TextInput
        type="url"
        value={inputValue}
        onChange={(event) => onInputChange(event.target.value)}
        placeholder={placeholder}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onAdd();
          }
        }}
      />
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex min-h-[52px] shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 text-sm font-bold text-amber-900 transition hover:bg-amber-100 shadow-sm"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Thêm
      </button>
    </div>
    <FieldHint>{helper}</FieldHint>
    {value.length > 0 ? (
      <div className="mt-3 space-y-2">
        {value.map((item) => (
          <div
            key={item}
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#f5b66f]" />
            <p className="min-w-0 flex-1 break-all text-sm font-medium leading-6 text-slate-800">
              {item}
            </p>
            <button
              type="button"
              onClick={() => onRemove(item)}
              className="shrink-0 text-slate-400 transition hover:text-rose-600"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    ) : null}
  </div>
);

const TERMS_CONTENT = {
  acceptedTerms: {
    title: "Điều khoản & Quy định dành cho Nghệ sĩ",
    intro:
      "Bằng việc gửi hồ sơ và đăng ký trở thành Nghệ sĩ trên nền tảng, bạn xác nhận đã đọc, hiểu rõ và cam kết tuân thủ toàn bộ các quy định, điều khoản sử dụng và chính sách dịch vụ dưới đây.",
    sections: [
      {
        heading: "1. Nguyên tắc phát hành & Tải lên nội dung",
        body: "Nghệ sĩ chỉ được phép tải lên các tác phẩm âm nhạc, hình ảnh đại diện, bìa album và các tài liệu liên quan mà mình sở hữu hợp pháp hoặc được ủy quyền hợp pháp. Tất cả thông tin về tên tác phẩm, tác giả, nghệ sĩ biểu diễn và thể loại phải đảm bảo tính trung thực và chính xác.",
      },
      {
        heading: "2. Quyền hạn và Trách nhiệm của Nghệ sĩ",
        body: "Nghệ sĩ chịu hoàn toàn trách nhiệm trước pháp luật đối với mọi nội dung tải lên hệ thống. Nghệ sĩ cam kết không đăng tải các nội dung vi phạm thuần phong mỹ tục, tuyên truyền văn hóa phẩm độc hại, kích động bạo lực, thù ghét, hoặc vi phạm các quy định pháp luật hiện hành.",
      },
      {
        heading: "3. Quyền quản lý và Kiểm duyệt của Nền tảng",
        body: "Nền tảng có toàn quyền tạm khóa, ẩn hoặc xóa vĩnh viễn bất kỳ nội dung hoặc tài khoản nghệ sĩ nào nếu phát hiện dấu hiệu vi phạm điều khoản dịch vụ, bản quyền hoặc nhận được khiếu nại hợp lệ từ bên thứ ba mà không cần thông báo trước.",
      },
      {
        heading: "4. Tỷ lệ phân chia Doanh thu & Bản quyền âm nhạc",
        body: "Mọi hoạt động phát sinh doanh thu từ lượt nghe, tải nhạc hoặc đăng ký gói dịch vụ liên quan đến tác phẩm của nghệ sĩ sẽ được ghi nhận và thống kê theo chính sách minh bạch của nền tảng. Chi tiết về hợp đồng phân phối sẽ được ký kết độc lập sau khi hồ sơ nghệ sĩ được phê duyệt thành công.",
      },
      {
        heading: "5. Thay đổi Điều khoản & Điều kiện dịch vụ",
        body: "Nền tảng có quyền sửa đổi, bổ sung các điều khoản này vào bất kỳ lúc nào để phù hợp với quy định pháp luật và định hướng phát triển. Thông báo thay đổi sẽ được gửi qua email hoặc cập nhật trực tiếp trên hệ thống.",
      },
    ],
  },
  copyrightCommitment: {
    title: "Cam kết Quyền sở hữu Trí tuệ & Bản quyền Âm nhạc",
    intro:
      "Vấn đề bản quyền là ưu tiên hàng đầu tại nền tảng. Bạn cần cam kết và bảo đảm quyền sở hữu đối với toàn bộ tài sản âm nhạc được đăng tải.",
    sections: [
      {
        heading: "1. Xác nhận Quyền Tác giả & Quyền Liên quan",
        body: "Bạn cam kết là chủ sở hữu duy nhất hoặc là đại diện hợp pháp có đầy đủ quyền tác giả, quyền bản âm, bản ghi và quyền phân phối đối với tất cả các bài hát, demo, nhạc cụ và lời bài hát gửi lên hệ thống.",
      },
      {
        heading: "2. Bảo đảm không Vi phạm Bản quyền Bên thứ Ba",
        body: "Bạn đảm bảo âm nhạc của mình không sử dụng trái phép sample, beat, giai điệu, lời ca hoặc bất kỳ phần tác phẩm nào của cá nhân/tổ chức khác mà chưa có sự đồng ý bằng văn bản hoặc giấy phép sử dụng (license) hợp pháp.",
      },
      {
        heading: "3. Bồi thường và Giải quyết Tranh chấp",
        body: "Trong trường hợp xảy ra tranh chấp, khiếu nại hoặc kiện tụng từ bên thứ ba liên quan đến bản quyền các tác phẩm do bạn cung cấp, bạn chịu toàn bộ chi phí bồi thường thiệt hại và trách nhiệm pháp lý phát sinh, đồng thời miễn trừ hoàn toàn trách nhiệm cho nền tảng.",
      },
      {
        heading: "4. Xử lý vi phạm Bản quyền",
        body: "Hệ thống áp dụng chính sách xử lý nghiêm khắc đối me các hành vi vi phạm bản quyền: Gỡ bỏ ngay lập tức tác phẩm vi phạm, thu hồi toàn bộ doanh thu phát sinh từ tác phẩm đó và có thể chấm dứt vĩnh viễn quyền truy cập tài khoản nghệ sĩ.",
      },
    ],
  },
};

const SCROLL_THRESHOLD = 8;

const TermsModal = ({ isOpen, termKey, onClose, onAccept }) => {
  const content = TERMS_CONTENT[termKey];
  const scrollRef = useRef(null);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [progress, setProgress] = useState(0);


  useEffect(() => {
    setHasScrolledToEnd(false);
    setProgress(0);
  }, [termKey, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const frame = requestAnimationFrame(() => {
      const node = scrollRef.current;
      if (!node) {
        return;
      }
      if (node.scrollHeight <= node.clientHeight + SCROLL_THRESHOLD) {
        setHasScrolledToEnd(true);
        setProgress(100);
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [isOpen, termKey]);

  const handleScroll = (event) => {
    const node = event.currentTarget;
    const maxScroll = node.scrollHeight - node.clientHeight;
    if (maxScroll <= SCROLL_THRESHOLD) {
      setHasScrolledToEnd(true);
      setProgress(100);
      return;
    }
    const currentProgress = Math.min(
      100,
      Math.max(0, (node.scrollTop / maxScroll) * 100)
    );
    setProgress(currentProgress);
    if (node.scrollTop + node.clientHeight >= node.scrollHeight - SCROLL_THRESHOLD) {
      setHasScrolledToEnd(true);
    }
  };





  if (!isOpen || !content) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`terms-title-${termKey}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#16161d] shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between gap-3 border-b border-white/8 px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#f5b66f]/20 bg-[#f5b66f]/10 text-[#f5b66f]">
              <FileText className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2
                id={`terms-title-${termKey}`}
                className="text-base font-bold text-white sm:text-lg"
              >
                {content.title}
              </h2>
              <p className="mt-1 text-xs text-white/45">
                {hasScrolledToEnd
                  ? "Bạn đã đọc đến cuối nội dung."
                  : "Vui lòng cuộn xuống cuối để tiếp tục."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-white/40 transition hover:bg-white/[0.06] hover:text-white/80"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="h-0.5 w-full bg-white/[0.04]">
          <div
            className="h-full bg-[#f5b66f] transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-5"
        >
          <p className="mb-5 rounded-xl border border-[#f5b66f]/15 bg-[#f5b66f]/5 px-4 py-3 text-sm leading-relaxed text-white/70">
            {content.intro}
          </p>
          <div className="space-y-5">
            {content.sections.map((section) => (
              <section key={section.heading}>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#f5b66f]/80">
                  {section.heading}
                </h3>
                <p className="text-sm leading-relaxed text-white/55">{section.body}</p>
              </section>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-4 py-3 text-xs font-bold text-emerald-400">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Bạn đã đọc đến cuối điều khoản.
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-white/8 bg-white/[0.02] px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-white/75 transition hover:bg-white/[0.07]"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={!hasScrolledToEnd}
            onClick={() => {
              onAccept(termKey);
              onClose();
            }}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#f5b66f] px-5 text-sm font-semibold text-[#15181d] transition hover:bg-[#f7c789] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Đã đọc và đồng ý
          </button>
        </div>
      </div>
    </div>
  );
};

const TermsCheckboxItem = ({
  name,
  label,
  checked,
  hasRead,
  onChange,
  onOpenTerms,
  error,
  requiresTerms = true,
}) => {
  const isDisabled = requiresTerms && !hasRead;
  return (
    <div className="space-y-2">
      <label
        className={[
          "flex items-start gap-3 rounded-xl border p-4 transition shadow-sm",
          isDisabled
            ? "cursor-not-allowed border-slate-200 bg-slate-100 opacity-60 text-slate-500"
            : checked
            ? "cursor-pointer border-[#f5b66f] bg-white text-slate-900 ring-2 ring-[#f5b66f]/40"
            : "cursor-pointer border-slate-200 bg-white text-slate-900 hover:border-slate-300",
          error && !isDisabled ? "border-rose-400 bg-rose-50/40" : "",
        ].join(" ")}
      >
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={onChange}
          disabled={isDisabled}
          className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 bg-white accent-[#f5b66f] disabled:cursor-not-allowed"
        />
        <span className="flex-1 text-sm font-semibold leading-relaxed text-slate-900">{label}</span>
      </label>
      {requiresTerms ? (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <button
            type="button"
            onClick={() => onOpenTerms(name)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 transition hover:bg-amber-100 shadow-sm"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden />
            {hasRead ? "Xem lại điều khoản" : "Đọc điều khoản"}
          </button>
        </div>
      ) : null}
      <FieldError>{error}</FieldError>
    </div>
  );
};

const STATUS_VIEW_CONFIG = {
  pending: {
    heroBorder: "border-[#f5b66f]/20",
    heroBackground: "bg-gradient-to-br from-[#f5b66f]/12 via-[#f5b66f]/6 to-transparent",
    glowPrimary: "bg-[#f5b66f]/20",
    glowSecondary: "bg-[#f5b66f]/10",
    iconWrapper: "border-[#f5b66f]/30 bg-[#f5b66f]/15 shadow-[0_8px_32px_rgba(245,182,111,0.2)]",
    badge: "border-amber-400/25 bg-amber-400/10 text-amber-300",
    badgeDot: "bg-amber-300",
    title: "Bạn đã có một yêu cầu đăng kí nghệ sĩ đang chờ duyệt",
    description:
      "Yêu cầu của bạn đang được đội ngũ xem xét. Bạn không thể gửi thêm yêu cầu mới cho đến khi yêu cầu hiện tại được xử lý xong.",
    icon: FileCheck2,
    iconClassName: "text-[#f5b66f]",
    statusLabel: "Đang chờ duyệt",
    timeline: [
      {
        key: "submitted",
        label: "Đã gửi yêu cầu",
        description: "Hồ sơ đăng kí nghệ sĩ của bạn đã được gửi thành công.",
        state: "done",
      },
      {
        key: "reviewing",
        label: "Đang xem xét",
        description: "Đội ngũ đang xem xét và đánh giá hồ sơ của bạn.",
        state: "active",
      },
      {
        key: "completed",
        label: "Hoàn tất",
        description: "Bạn sẽ nhận được thông báo khi có kết quả.",
        state: "upcoming",
      },
    ],
  },
  submitted: {
    heroBorder: "border-emerald-400/20",
    heroBackground: "bg-gradient-to-br from-emerald-400/10 via-[#f5b66f]/8 to-transparent",
    glowPrimary: "bg-emerald-400/15",
    glowSecondary: "bg-emerald-400/10",
    iconWrapper: "border-emerald-400/30 bg-emerald-400/15 shadow-[0_8px_32px_rgba(52,211,153,0.2)]",
    badge: "border-emerald-400/25 bg-emerald-400/10 text-emerald-400",
    badgeDot: "bg-emerald-400",
    title: "Yêu cầu đăng kí nghệ sĩ của bạn đã được gửi",
    description:
      "Cảm ơn bạn đã gửi hồ sơ. Đội ngũ sẽ xem xét thông tin và phản hồi trong thời gian sớm nhất.",
    icon: CheckCircle2,
    iconClassName: "text-emerald-400",
    statusLabel: "Gửi thành công",
    timeline: [
      {
        key: "submitted",
        label: "Đã gửi hồ sơ",
        description: "Hồ sơ của bạn đã được gửi thành công đến đội ngũ xét duyệt.",
        state: "done",
      },
      {
        key: "reviewing",
        label: "Đang xem xét",
        description: "Đội ngũ đang xem xét hồ sơ của bạn.",
        state: "active",
      },
      {
        key: "completed",
        label: "Hoàn tất",
        description: "Bạn sẽ nhận thông báo khi có kết quả.",
        state: "upcoming",
      },
    ],
  },
};

const STATUS_TIMELINE_STEP_STYLES = {
  done: {
    wrapper: "border-emerald-400/60 bg-emerald-400/15",
    line: "bg-emerald-400/40",
    title: "text-emerald-400",
    description: "text-white/40",
  },
  active: {
    wrapper: "border-[#f5b66f] bg-[#f5b66f]/15 shadow-[0_0_12px_rgba(245,182,111,0.3)]",
    line: "bg-white/15",
    title: "text-[#f5b66f]",
    description: "text-white/40",
  },
  upcoming: {
    wrapper: "border-white/20 bg-white/5",
    line: "bg-transparent",
    title: "text-white/30",
    description: "text-white/25",
  },
};

const StatusTimelineStep = ({ step, isLast = false }) => {
  const styles = STATUS_TIMELINE_STEP_STYLES[step.state];

  return (
    <div className="flex items-start gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${styles.wrapper}`}
        >
          {step.state === "done" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : step.state === "active" ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#f5b66f]" />
          ) : (
            <span className="text-xs font-bold text-white/30">3</span>
          )}
        </div>
        {!isLast ? <div className={`h-8 w-px ${styles.line}`} /> : null}
      </div>
      <div className={isLast ? "" : "pb-8"}>
        <p className={`text-sm font-semibold ${styles.title}`}>{step.label}</p>
        <p className={`mt-0.5 text-xs ${styles.description}`}>{step.description}</p>
      </div>
    </div>
  );
};

const StatusView = ({ status, navigate, homeRoute, listRoute }) => {
  const config = STATUS_VIEW_CONFIG[status] ?? STATUS_VIEW_CONFIG.pending;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0d0f14] px-4 py-16">
      <section className="relative w-full max-w-xl overflow-hidden rounded-[32px] border bg-[linear-gradient(160deg,rgba(20,20,26,0.98),rgba(10,10,14,0.98))] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-10">
        {/* Glows */}
        <div className={`pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full opacity-30 blur-3xl ${config.glowPrimary}`} />
        <div className={`pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full opacity-20 blur-3xl ${config.glowSecondary}`} />

        {/* Header */}
        <div className={`relative mb-8 rounded-2xl border p-8 text-center ${config.heroBorder} ${config.heroBackground}`}>
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 ${config.iconWrapper}`}>
            <config.icon className={`h-7 w-7 ${config.iconClassName}`} />
          </div>
          <div className={`mx-auto mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${config.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${config.badgeDot}`} />
            {config.statusLabel}
          </div>
          <h1 className="text-xl font-bold leading-snug text-white sm:text-2xl">
            {config.title}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/55">
            {config.description}
          </p>
        </div>


        <div className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.03] backdrop-blur-sm">
          <div className="border-b border-white/8 px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Tiến trình</p>
          </div>
          <div className="p-6">
            <div className="space-y-0">
              {config.timeline.map((step, index) => (
                <StatusTimelineStep
                  key={step.key}
                  step={step}
                  isLast={index === config.timeline.length - 1}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/45">
            Theo dõi trạng thái yêu cầu trong mục{" "}
            <span className="font-medium text-white/70">Yêu cầu của tôi</span>.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate(homeRoute, { replace: true })}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-white/75 transition hover:border-white/20 hover:bg-white/[0.07]"
            >
              Trang chủ
            </button>
            <button
              type="button"
              onClick={() => navigate(listRoute, { replace: true })}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#f5b66f] px-5 text-sm font-semibold text-[#15181d] transition hover:bg-[#f7c789]"
            >
              <FileCheck2 className="h-4 w-4" />
              Xem yêu cầu
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};


const SectionCard = ({ title, subtitle, icon: Icon, children }) => (
  <section className={sectionCardClassName}>
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#f5b66f]/20 bg-[#f5b66f]/10 text-[#f5b66f]">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="mt-0.5 text-sm leading-relaxed text-white/45">{subtitle}</p>
      </div>
    </div>
    {children}
  </section>
);


const ArtistRegistrationRequestPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const userId = user?._id || user?.id || "";
  const userRole = user?.role || "";

  const [formData, setFormData] = useState(createInitialFormState());
  const [errors, setErrors] = useState({});
  const [isPendingRequestLoading, setIsPendingRequestLoading] = useState(true);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [newDemoUrl, setNewDemoUrl] = useState("");
  const [newMusicLink, setNewMusicLink] = useState("");
  const [activeTerms, setActiveTerms] = useState(null);
  const [readTerms, setReadTerms] = useState({
    acceptedTerms: false,
    copyrightCommitment: false,
    truthfulInformationCommitment: false,
  });

  useEffect(() => {
    if (
      !authLoading &&
      (!userId || userRole === "artist" || userRole === "admin")
    ) {
      navigate(routePaths.home, { replace: true });
    }
  }, [authLoading, navigate, userId, userRole]);

  useEffect(() => {
    if (authLoading || !userId || userRole !== "user") {
      setIsPendingRequestLoading(false);
      return;
    }

    const controller = new AbortController();

    const checkPendingRequest = async () => {
      setIsPendingRequestLoading(true);

      try {
        const result = await getMyArtistRegistrationRequestsService(
          { page: 1, limit: 1, status: "pending" },
          { signal: controller.signal }
        );

        const pendingRequests = result?.data?.requests || [];
        setHasPendingRequest(pendingRequests.length > 0);
      } catch (error) {
        if (error.name !== "CanceledError") {
          setSubmitError(
            getApiErrorFullMessage(
              error,
              "Không thể kiểm tra trạng thái yêu cầu đăng kí nghệ sĩ."
            )
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsPendingRequestLoading(false);
        }
      }
    };

    checkPendingRequest();

    return () => controller.abort();
  }, [authLoading, userId, userRole]);

  const selectedGenreText = useMemo(() => {
    if (formData.genres.length === 0) {
      return "Chưa chọn thể loại nào";
    }

    return `Đã chọn ${formData.genres.length} thể loại`;
  }, [formData.genres]);

  const handleChange = (event) => {
    const { name, value, type, checked, files } = event.target;

    setErrors((previous) => ({ ...previous, [name]: undefined }));

    if (type === "checkbox") {
      setFormData((previous) => ({ ...previous, [name]: checked }));
      return;
    }

    if (type === "file") {
      setFormData((previous) => ({ ...previous, [name]: files?.[0] || null }));
      return;
    }

    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleFileSelect = (name, file) => {
    setErrors((previous) => ({ ...previous, [name]: undefined }));
    setFormData((previous) => ({ ...previous, [name]: file }));
  };

  const handleSocialLinkChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      socialLinks: {
        ...previous.socialLinks,
        [name]: value,
      },
    }));
  };

  const toggleGenre = (genre) => {
    setFormData((previous) => ({
      ...previous,
      genres: previous.genres.includes(genre)
        ? previous.genres.filter((item) => item !== genre)
        : [...previous.genres, genre],
    }));
  };

  const addDemoUrl = () => {
    const normalized = normalizeText(newDemoUrl);

    if (!normalized || formData.demoTrackUrls.includes(normalized)) {
      return;
    }

    setFormData((previous) => ({
      ...previous,
      demoTrackUrls: [...previous.demoTrackUrls, normalized],
    }));
    setNewDemoUrl("");
  };

  const addMusicLink = () => {
    const normalized = normalizeText(newMusicLink);

    if (!normalized || formData.musicLinks.includes(normalized)) {
      return;
    }

    setFormData((previous) => ({
      ...previous,
      musicLinks: [...previous.musicLinks, normalized],
    }));
    setNewMusicLink("");
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!normalizeText(formData.stageName)) {
      nextErrors.stageName = "Tên nghệ sĩ là bắt buộc.";
    }

    if (!normalizeText(formData.fullName)) {
      nextErrors.fullName = "Họ và tên thật là bắt buộc.";
    }

    if (!normalizeText(formData.idNumber)) {
      nextErrors.idNumber = "Số CCCD/CMND là bắt buộc.";
    }

    if (!normalizeText(formData.dateOfBirth)) {
      nextErrors.dateOfBirth = "Ngày sinh là bắt buộc.";
    }

    if (!formData.frontImage) {
      nextErrors.frontImage = "Vui lòng tải ảnh mặt trước giấy tờ.";
    }

    if (!formData.backImage) {
      nextErrors.backImage = "Vui lòng tải ảnh mặt sau giấy tờ.";
    }

    if (!readTerms.acceptedTerms) {
      nextErrors.acceptedTerms = "Bạn cần đọc hết điều khoản trước khi đồng ý.";
    } else if (!formData.acceptedTerms) {
      nextErrors.acceptedTerms = "Bạn cần đồng ý với điều khoản nghệ sĩ.";
    }

    if (!readTerms.copyrightCommitment) {
      nextErrors.copyrightCommitment =
        "Bạn cần đọc hết cam kết bản quyền trước khi xác nhận.";
    } else if (!formData.copyrightCommitment) {
      nextErrors.copyrightCommitment =
        "Bạn cần xác nhận trách nhiệm bản quyền.";
    }

    if (!formData.truthfulInformationCommitment) {
      nextErrors.truthfulInformationCommitment =
        "Bạn cần xác nhận thông tin là chính xác.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (hasPendingRequest) {
      setSubmitError(
        "Bạn đang có một yêu cầu đăng kí nghệ sĩ ở trạng thái chờ duyệt nên không thể gửi thêm yêu cầu mới."
      );
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await createArtistRegistrationRequestService(formData);
      setHasPendingRequest(true);
      setIsSubmitted(true);
    } catch (error) {
      setSubmitError(
        getApiErrorFullMessage(error, "Không thể gửi yêu cầu đăng kí nghệ sĩ.")
      );

      const detailsText = getApiErrorDetailsText(error);
      if (detailsText) {
        const mappedErrors = {};
        const knownFields = [
          "stageName",
          "fullName",
          "idNumber",
          "frontImage",
          "backImage",
          "acceptedTerms",
          "copyrightCommitment",
          "truthfulInformationCommitment",
        ];

        detailsText
          .split("\n")
          .filter(Boolean)
          .forEach((line) => {
            const matchedField = knownFields.find((fieldName) =>
              line.toLowerCase().includes(fieldName.toLowerCase())
            );

            if (matchedField) {
              mappedErrors[matchedField] = line;
            }
          });

        if (Object.keys(mappedErrors).length > 0) {
          setErrors((previous) => ({ ...previous, ...mappedErrors }));
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isPendingRequestLoading) {
    return (
      <main className="min-h-full bg-[#000000] px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center text-white/60">
            <Loader2 className="h-8 w-8 animate-spin text-[#f5b66f]" aria-hidden />
            <p className="text-sm font-medium">Đang tải trang đăng kí nghệ sĩ...</p>
          </div>
        </div>
      </main>
    );
  }

  if (hasPendingRequest) {
    return (
      <StatusView
        status="pending"
        navigate={navigate}
        homeRoute={routePaths.home}
        listRoute={routePaths.artistRegistrationRequestsList}
      />
    );
  }

  if (isSubmitted) {
    return (
      <StatusView
        status="submitted"
        navigate={navigate}
        homeRoute={routePaths.home}
        listRoute={routePaths.artistRegistrationRequestsList}
      />
    );
  }

  return (
    <main className="min-h-full bg-[#000000] px-4 py-10 text-white sm:px-6 lg:px-8">
    <section className="mx-auto max-w-4xl space-y-6">
        <div>
          <button
            type="button"
            onClick={() => navigate(routePaths.home)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-semibold text-white/70 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            <span>Trang chủ</span>
          </button>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.36)]">
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f5b66f]">
                Hồ sơ nghệ sĩ
              </p>
              <h1 className="text-2xl font-semibold text-white sm:text-3xl">
                Đăng kí nghệ sĩ
              </h1>
              <p className="text-sm leading-relaxed text-white/55">
                Hoàn thiện hồ sơ và giấy tờ xác minh để gửi yêu cầu nâng cấp tài khoản.
              </p>
            </div>

            <div className="inline-flex items-center gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/8 px-3.5 py-2 text-xs font-semibold text-amber-300 shrink-0">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Chưa gửi hồ sơ
            </div>
          </div>

          <div className="relative mt-8">
            {submitError ? (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                {submitError}
              </div>
            ) : null}

            <form className="space-y-6" noValidate onSubmit={handleSubmit}>
                <SectionCard
                  title="Thông tin nghệ sĩ"
                  subtitle="Thông tin cơ bản để tạo hồ sơ nghệ sĩ của bạn trên nền tảng."
                  icon={Sparkles}
                >
                  <div className="grid gap-5 lg:grid-cols-2">
                    <div>
                      <FieldLabel required>Tên nghệ sĩ (Stage name)</FieldLabel>
                      <TextInput
                        name="stageName"
                        value={formData.stageName}
                        onChange={handleChange}
                        placeholder="Tên bạn muốn hiển thị trên nền tảng"
                        error={errors.stageName}
                      />
                      <FieldError>{errors.stageName}</FieldError>
                    </div>

                    <div className="lg:col-span-2">
                      <FieldLabel>Tiểu sử</FieldLabel>
                      <TextArea
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Mô tả ngắn về bạn với tư cách là nghệ sĩ."
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <UploadField
                        name="avatar"
                        title="Ảnh đại diện nghệ sĩ"
                        file={formData.avatar}
                        onFileSelect={handleFileSelect}
                        hint="Không bắt buộc, nhưng nên có để hồ sơ nhìn chuyên nghiệp và đầy đủ hơn."
                      />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Xác minh danh tính"
                  subtitle="Cung cấp đúng thông tin giấy tờ để đội ngũ xác minh chủ sở hữu tài khoản."
                  icon={ShieldCheck}
                >
                  <div className="grid gap-5 lg:grid-cols-2">
                    <div>
                      <FieldLabel required>Họ và tên thật</FieldLabel>
                      <TextInput
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="Theo giấy tờ tùy thân"
                        error={errors.fullName}
                      />
                      <FieldError>{errors.fullName}</FieldError>
                    </div>

                    <div>
                      <FieldLabel required>Số CCCD/CMND</FieldLabel>
                      <TextInput
                        name="idNumber"
                        value={formData.idNumber}
                        onChange={handleChange}
                        placeholder="Nhập số giấy tờ tùy thân"
                        error={errors.idNumber}
                      />
                      <FieldError>{errors.idNumber}</FieldError>
                    </div>

                    <div className="lg:col-span-2">
                      <FieldLabel required>Ngày sinh</FieldLabel>
                      <DateInput
                        name="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        error={errors.dateOfBirth}
                      />
                      <FieldError>{errors.dateOfBirth}</FieldError>
                    </div>

                    <div className="lg:col-span-2 grid gap-5 sm:grid-cols-2 items-start">
                      <UploadField
                        name="frontImage"
                        title="Ảnh mặt trước giấy tờ"
                        required
                        file={formData.frontImage}
                        error={errors.frontImage}
                        onFileSelect={handleFileSelect}
                      />

                      <UploadField
                        name="backImage"
                        title="Ảnh mặt sau giấy tờ"
                        required
                        file={formData.backImage}
                        error={errors.backImage}
                        onFileSelect={handleFileSelect}
                      />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Thể loại và kênh hoạt động"
                  subtitle="Chọn thể loại âm nhạc chính và thêm các kênh mạng xã hội để hồ sơ rõ ràng hơn."
                  icon={Music4}
                >
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <FieldLabel>Thể loại âm nhạc</FieldLabel>
                      <span className="text-xs text-white/45">
                        {selectedGenreText}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {GENRE_OPTIONS.map((genre) => {
                        const isActive = formData.genres.includes(genre);

                        return (
                          <button
                            key={genre}
                            type="button"
                            onClick={() => toggleGenre(genre)}
                            className={[
                              "rounded-full border px-4 py-2 text-sm font-medium transition",
                              isActive
                                ? "border-[#f5b66f] bg-[#f5b66f]/15 text-[#f5b66f] shadow-[0_10px_25px_rgba(245,182,111,0.12)]"
                                : "border-white/10 bg-white/[0.03] text-white/65 hover:border-white/20 hover:text-white",
                            ].join(" ")}
                          >
                            {genre}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {SOCIAL_PLATFORM_FIELDS.map((field) => (
                      <div key={field.key}>
                        <FieldLabel>{field.label}</FieldLabel>
                        <TextInput
                          name={field.key}
                          type="url"
                          value={formData.socialLinks[field.key]}
                          onChange={handleSocialLinkChange}
                          placeholder={field.placeholder}
                        />
                      </div>
                    ))}
                    <div className="sm:col-span-2">
                      <FieldLabel>Liên kết khác</FieldLabel>
                      <TextInput
                        name="other"
                        type="url"
                        value={formData.socialLinks.other}
                        onChange={handleSocialLinkChange}
                        placeholder="Liên kết nghệ sĩ hoặc portfolio khác"
                      />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Portfolio và bằng chứng hoạt động"
                  subtitle="Chia sẻ demo, sản phẩm đã phát hành hoặc mô tả kinh nghiệm để đội ngũ đánh giá tốt hơn."
                  icon={FileCheck2}
                >
                  <div className="space-y-6">
                    <UrlListEditor
                      label="Link demo bài hát"
                      value={formData.demoTrackUrls}
                      inputValue={newDemoUrl}
                      onInputChange={setNewDemoUrl}
                      onAdd={addDemoUrl}
                      onRemove={(item) =>
                        setFormData((previous) => ({
                          ...previous,
                          demoTrackUrls: previous.demoTrackUrls.filter(
                            (url) => url !== item
                          ),
                        }))
                      }
                      placeholder="https://..."
                      helper="Có thể thêm link demo riêng tư hoặc bản nháp để đội ngũ tham khảo."
                    />

                    <UrlListEditor
                      label="Link sản phẩm âm nhạc đã phát hành"
                      value={formData.musicLinks}
                      inputValue={newMusicLink}
                      onInputChange={setNewMusicLink}
                      onAdd={addMusicLink}
                      onRemove={(item) =>
                        setFormData((previous) => ({
                          ...previous,
                          musicLinks: previous.musicLinks.filter(
                            (url) => url !== item
                          ),
                        }))
                      }
                      placeholder="https://..."
                      helper="Thêm link bài hát, MV, album hoặc trang nghệ sĩ đang hoạt động công khai."
                    />

                    <div>
                      <FieldLabel>Mô tả thêm về hoạt động âm nhạc</FieldLabel>
                      <TextArea
                        name="portfolioDescription"
                        value={formData.portfolioDescription}
                        onChange={handleChange}
                        rows={4}
                        placeholder="Chia sẻ thêm về dự án, thành tích, cộng tác hoặc kinh nghiệm biểu diễn của bạn."
                      />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Cam kết nghệ sĩ"
                  subtitle="Bạn cần xác nhận các điều khoản dưới đây trước khi gửi hồ sơ xét duyệt."
                  icon={CheckCircle2}
                >
                  <div className="space-y-4">
                    {[
                      {
                        name: "acceptedTerms",
                        label:
                          "Tôi đã đọc và đồng ý với điều khoản dành cho nghệ sĩ trên nền tảng.",
                      },
                      {
                        name: "copyrightCommitment",
                        label:
                          "Tôi chịu hoàn toàn trách nhiệm về quyền sở hữu và bản quyền đối với nội dung âm nhạc mà tôi cung cấp.",
                      },
                      {
                        name: "truthfulInformationCommitment",
                        label:
                          "Tôi xác nhận toàn bộ thông tin gửi lên là trung thực, chính xác và thuộc về tôi hoặc đơn vị đại diện hợp pháp.",
                      },
                    ].map((item) => (
                      <TermsCheckboxItem
                        key={item.name}
                        name={item.name}
                        label={item.label}
                        checked={formData[item.name]}
                        hasRead={readTerms[item.name]}
                        requiresTerms={item.name !== "truthfulInformationCommitment"}
                        onChange={handleChange}
                        onOpenTerms={(termKey) => setActiveTerms(termKey)}
                        error={errors[item.name]}
                      />
                    ))}
                  </div>
                </SectionCard>

                <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-6 text-sm font-medium text-white/80 transition hover:bg-white/[0.07]"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#f5b66f] px-6 text-sm font-semibold text-[#15181d] transition hover:bg-[#f7c789] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : null}
                    {isSubmitting
                      ? "Đang gửi yêu cầu..."
                      : "Gửi yêu cầu đăng kí nghệ sĩ"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <TermsModal
            isOpen={Boolean(activeTerms)}
            termKey={activeTerms}
            onClose={() => setActiveTerms(null)}
            onAccept={(termKey) => {
              setReadTerms((previous) => ({ ...previous, [termKey]: true }));
              setFormData((previous) => ({ ...previous, [termKey]: true }));
              setErrors((previous) => ({ ...previous, [termKey]: undefined }));
            }}
          />
        </section>
      </main>
    );
  };


export default ArtistRegistrationRequestPage;
