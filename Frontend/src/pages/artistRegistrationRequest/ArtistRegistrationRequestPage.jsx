import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  Loader2,
  Music4,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
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

const pageShellClassName =
  "min-h-full overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,159,67,0.22),_transparent_20%),radial-gradient(circle_at_top_right,_rgba(255,255,255,0.06),_transparent_18%),radial-gradient(circle_at_bottom_right,_rgba(155,108,255,0.12),_transparent_24%),linear-gradient(135deg,_#050505_0%,_#0c0c0f_40%,_#111114_100%)] px-4 py-8 text-white sm:px-6 lg:px-8";

const cardClassName =
  "relative overflow-hidden rounded-[30px] border border-white/10 bg-white/5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md";

const sectionCardClassName =
  "rounded-[26px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6";

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
  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.28em] text-[#ffcf97]">
    {children}
    {required ? <span className="ml-1 text-rose-300">*</span> : null}
  </label>
);

const FieldHint = ({ children }) =>
  children ? (
    <p className="mt-2 text-xs leading-5 text-white/45">{children}</p>
  ) : null;

const FieldError = ({ children }) =>
  children ? (
    <p className="mt-2 text-xs leading-5 text-rose-300">{children}</p>
  ) : null;

const TextInput = ({ error, className = "", ...props }) => (
  <input
    {...props}
    className={[
      "min-h-[54px] w-full rounded-2xl border bg-[#f7f4ef] px-4 py-3 text-sm text-[#161616] outline-none transition placeholder:text-[#94897a] focus:border-[#f5b66f] focus:ring-4 focus:ring-[#f5b66f]/20",
      error ? "border-rose-300" : "border-white/10",
      className,
    ].join(" ")}
  />
);

const TextArea = ({ error, className = "", ...props }) => (
  <textarea
    {...props}
    className={[
      "w-full resize-none rounded-2xl border bg-[#f7f4ef] px-4 py-3 text-sm leading-6 text-[#161616] outline-none transition placeholder:text-[#94897a] focus:border-[#f5b66f] focus:ring-4 focus:ring-[#f5b66f]/20",
      error ? "border-rose-300" : "border-white/10",
      className,
    ].join(" ")}
  />
);

const DateInput = ({ error, className = "", ...props }) => (
  <div className="group relative">
    <input
      {...props}
      className={[
        "min-h-[54px] w-full rounded-2xl border bg-[#f7f4ef] px-4 py-3 pr-14 text-sm text-[#161616] outline-none transition placeholder:text-[#94897a] [color-scheme:light] focus:border-[#f5b66f] focus:ring-4 focus:ring-[#f5b66f]/20",
        "[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:h-10 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:rounded-xl [&::-webkit-calendar-picker-indicator]:opacity-0",
        error ? "border-rose-300" : "border-white/10",
        className,
      ].join(" ")}
    />
    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#f5b66f]/20 bg-gradient-to-br from-[#f5b66f]/18 via-[#f5b66f]/10 to-transparent text-[#d97706] shadow-[0_10px_24px_rgba(245,182,111,0.18)] transition group-focus-within:border-[#f5b66f]/40 group-focus-within:bg-[#f5b66f]/16 group-focus-within:text-[#c56b10]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-5 w-5"
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
  title,
  required = false,
  error,
  file,
  onChange,
  accept = "image/*",
  hint,
}) => (
  <div>
    <FieldLabel required={required}>{title}</FieldLabel>
    <label
      className={[
        "flex min-h-[62px] cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition",
        error
          ? "border-rose-300 bg-rose-400/10"
          : "border-white/10 bg-white/[0.04] hover:border-[#f5b66f]/30 hover:bg-white/[0.06]",
      ].join(" ")}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white/90">
          {file?.name || "Chọn file hình ảnh"}
        </p>
        <p className="mt-1 text-xs text-white/45">PNG, JPG hoặc WEBP</p>
      </div>
      <span className="shrink-0 rounded-full border border-[#f5b66f]/25 bg-[#f5b66f]/10 px-3 py-1 text-xs font-semibold text-[#f5b66f]">
        Tải lên
      </span>
      <input type="file" accept={accept} className="sr-only" onChange={onChange} />
    </label>
    <FieldHint>{hint}</FieldHint>
    <FieldError>{error}</FieldError>
  </div>
);

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
        className="inline-flex min-h-[54px] shrink-0 items-center justify-center gap-2 rounded-2xl border border-[#f5b66f]/25 bg-[#f5b66f]/10 px-5 text-sm font-semibold text-[#f5b66f] transition hover:bg-[#f5b66f]/16"
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
            className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
          >
            <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#f5b66f]" />
            <p className="min-w-0 flex-1 break-all text-sm leading-6 text-white/75">
              {item}
            </p>
            <button
              type="button"
              onClick={() => onRemove(item)}
              className="shrink-0 text-white/45 transition hover:text-rose-300"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    ) : null}
  </div>
);

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

const ArtistRegistrationStatusView = ({
  status,
  navigate,
  homeRoute,
  listRoute,
}) => {
  const config = STATUS_VIEW_CONFIG[status];
  const Icon = config.icon;

  return (
    <main className={pageShellClassName}>
      <section className="mx-auto max-w-3xl space-y-6">
        <div
          className={`relative overflow-hidden rounded-[28px] border ${config.heroBorder} ${config.heroBackground} p-8 text-center sm:p-10`}
        >
          <div className={`pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full ${config.glowPrimary} blur-3xl`} />
          <div className={`pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full ${config.glowSecondary} blur-3xl`} />
          <div className="relative">
            <div
              className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border ${config.iconWrapper}`}
            >
              <Icon className={`h-8 w-8 ${config.iconClassName}`} />
            </div>
            <div
              className={`mb-3 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold ${config.badge}`}
            >
              <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${config.badgeDot}`} />
              {config.statusLabel}
            </div>
            <h1 className="mt-4 text-xl font-bold leading-relaxed tracking-[0.04em] text-white sm:text-2xl">
              {config.title}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/55">
              {config.description}
            </p>
          </div>
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

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#f5b66f]/20 bg-[#f5b66f]/10 text-[#f5b66f] shadow-[0_12px_30px_rgba(245,182,111,0.12)]">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-white/55">{subtitle}</p>
      </div>
    </div>
    {children}
  </section>
);

const ArtistRegistrationRequestPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(createInitialFormState());
  const [errors, setErrors] = useState({});
  const [isPendingRequestLoading, setIsPendingRequestLoading] = useState(true);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [newDemoUrl, setNewDemoUrl] = useState("");
  const [newMusicLink, setNewMusicLink] = useState("");

  useEffect(() => {
    if (
      !authLoading &&
      (!user || user.role === "artist" || user.role === "admin")
    ) {
      navigate(routePaths.home, { replace: true });
    }
  }, [authLoading, navigate, user]);

  useEffect(() => {
    if (authLoading || !user || user.role !== "user") {
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
  }, [authLoading, user]);

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

    if (!formData.acceptedTerms) {
      nextErrors.acceptedTerms = "Bạn cần đồng ý với điều khoản nghệ sĩ.";
    }

    if (!formData.copyrightCommitment) {
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
      <main className={pageShellClassName}>
        <div className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center text-white/70">
            <Loader2 className="h-8 w-8 animate-spin text-[#f5b66f]" aria-hidden />
            <p className="text-sm">Đang tải trang đăng kí nghệ sĩ...</p>
          </div>
        </div>
      </main>
    );
  }

  if (hasPendingRequest) {
    return (
      <ArtistRegistrationStatusView
        status="pending"
        navigate={navigate}
        homeRoute={routePaths.home}
        listRoute={routePaths.artistRegistrationRequestsList}
      />
    );
  }

  if (isSubmitted) {
    return (
      <ArtistRegistrationStatusView
        status="submitted"
        navigate={navigate}
        homeRoute={routePaths.home}
        listRoute={routePaths.artistRegistrationRequestsList}
      />
    );
  }

  return (
    <main className={pageShellClassName}>
      <section className="mx-auto max-w-6xl space-y-8">
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(18,18,24,0.92),rgba(14,14,18,0.86))] shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(245,182,111,0.16),_transparent_24%),radial-gradient(circle_at_right,_rgba(155,108,255,0.1),_transparent_24%)]" />
          <div className="relative flex flex-col gap-5 px-5 py-6 sm:px-7 sm:py-7 lg:flex-row lg:items-end lg:justify-between lg:px-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f5b66f]/18 bg-[#f5b66f]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f5b66f]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Hồ sơ nghệ sĩ
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/42 sm:text-xs">
                Tài khoản • Đăng kí nghệ sĩ
              </p>
              <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
                Đăng kí nghệ sĩ
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-white/64 sm:text-base">
                Hoàn thiện hồ sơ và giấy tờ xác minh để gửi yêu cầu nâng cấp tài khoản.
              </p>
            </div>

            <div className="inline-flex items-center gap-3 self-start rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/72 lg:self-auto">
              <span className="h-2.5 w-2.5 rounded-full bg-[#f5b66f]" />
              Chưa gửi hồ sơ
            </div>
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_330px] xl:items-start">
          <div className={cardClassName}>
            <div className="pointer-events-none absolute -left-20 top-8 h-40 w-40 rounded-full bg-[#ff9f43]/10 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 rounded-full bg-[#9b6cff]/10 blur-3xl" />
            <div className="relative p-6 sm:p-8 lg:p-10">
              <div className="mb-8 overflow-hidden rounded-[28px] border border-[#f5b66f]/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
                <div className="relative grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_320px]">
                  <div className="pointer-events-none absolute left-[-3rem] top-[-3rem] h-32 w-32 rounded-full bg-[#ff9f43]/18 blur-3xl" />
                  <div className="pointer-events-none absolute bottom-[-4rem] right-[-2rem] h-40 w-40 rounded-full bg-[#9b6cff]/14 blur-3xl" />

                  <div className="relative px-5 py-6 sm:px-6 sm:py-7">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#f5b66f]/20 bg-[#f5b66f]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f5b66f]">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden />
                      Quy trình xét duyệt
                    </div>

                    <h2 className="mt-4 max-w-xl text-[1.55rem] font-semibold leading-tight text-white sm:text-[1.8rem]">
                      Hoàn thiện hồ sơ để gửi yêu cầu nhanh hơn
                    </h2>

                    <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62 sm:text-[15px]">
                      Điền đầy đủ thông tin cá nhân, giấy tờ xác minh và các liên kết âm nhạc công khai để đội ngũ dễ đánh giá hơn.
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/75">
                        <span className="h-2 w-2 rounded-full bg-emerald-300" />
                        Thông tin rõ ràng
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/75">
                        <span className="h-2 w-2 rounded-full bg-[#f5b66f]" />
                        Giấy tờ đầy đủ
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/75">
                        <span className="h-2 w-2 rounded-full bg-[#9b6cff]" />
                        Link âm nhạc công khai
                      </div>
                    </div>
                  </div>

                  <div className="relative border-t border-white/10 bg-black/10 px-5 py-5 sm:px-6 lg:border-l lg:border-t-0">
                    <div className="space-y-3">
                      {[
                        {
                          step: "01",
                          title: "Điền hồ sơ",
                          description: "Tên nghệ sĩ, mô tả và thông tin cơ bản.",
                        },
                        {
                          step: "02",
                          title: "Xác minh",
                          description: "Bổ sung CCCD/CMND và hình ảnh giấy tờ.",
                        },
                        {
                          step: "03",
                          title: "Chờ duyệt",
                          description: "Đội ngũ tiếp nhận và xem xét hồ sơ của bạn.",
                        },
                      ].map((item, index) => (
                        <div
                          key={item.step}
                          className="relative rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3"
                        >
                          {index < 2 ? (
                            <span className="absolute left-[1.35rem] top-full h-3 w-px bg-gradient-to-b from-[#f5b66f]/40 to-transparent" />
                          ) : null}
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f5b66f]/14 text-sm font-semibold text-[#f5b66f] shadow-[0_8px_24px_rgba(245,182,111,0.12)]">
                              {item.step}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {item.title}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-white/52">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {submitError ? (
                <div className="mb-6 rounded-2xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {submitError}
                </div>
              ) : null}

              <form className="space-y-6" noValidate onSubmit={handleSubmit}>
                <SectionCard
                  title="Thông tin nghệ sĩ"
                  subtitle="Giới thiệu thương hiệu cá nhân và định hướng âm nhạc của bạn một cách ngắn gọn, rõ ràng."
                  icon={Sparkles}
                >
                  <div className="grid gap-5 lg:grid-cols-2">
                    <div className="lg:col-span-2">
                      <FieldLabel required>Tên nghệ sĩ</FieldLabel>
                      <TextInput
                        name="stageName"
                        value={formData.stageName}
                        onChange={handleChange}
                        placeholder="Nhập nghệ danh của bạn"
                        error={errors.stageName}
                      />
                      <FieldError>{errors.stageName}</FieldError>
                    </div>

                    <div className="lg:col-span-2">
                      <FieldLabel>Tiểu sử nghệ sĩ</FieldLabel>
                      <TextArea
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        rows={4}
                        placeholder="Giới thiệu về phong cách âm nhạc, hành trình và cá tính nghệ thuật của bạn."
                        error={errors.bio}
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <UploadField
                        title="Ảnh đại diện nghệ sĩ"
                        file={formData.avatar}
                        onChange={(event) =>
                          setFormData((previous) => ({
                            ...previous,
                            avatar: event.target.files?.[0] || null,
                          }))
                        }
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

                    <div>
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

                    <UploadField
                      title="Ảnh mặt trước giấy tờ"
                      required
                      file={formData.frontImage}
                      error={errors.frontImage}
                      onChange={(event) =>
                        setFormData((previous) => ({
                          ...previous,
                          frontImage: event.target.files?.[0] || null,
                        }))
                      }
                    />

                    <UploadField
                      title="Ảnh mặt sau giấy tờ"
                      required
                      file={formData.backImage}
                      error={errors.backImage}
                      onChange={(event) =>
                        setFormData((previous) => ({
                          ...previous,
                          backImage: event.target.files?.[0] || null,
                        }))
                      }
                    />
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
                      <div key={item.name}>
                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 transition hover:border-white/20 hover:bg-white/[0.06]">
                          <input
                            type="checkbox"
                            name={item.name}
                            checked={formData[item.name]}
                            onChange={handleChange}
                            className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-[#f5b66f] focus:ring-[#f5b66f]/40"
                          />
                          <span className="text-sm leading-6 text-white/75">
                            {item.label}
                          </span>
                        </label>
                        <FieldError>{errors[item.name]}</FieldError>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="inline-flex min-h-[54px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-6 text-sm font-medium text-white/85 transition hover:border-white/20 hover:bg-white/[0.06]"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-[#f5b66f] px-6 text-sm font-semibold text-[#15181d] transition hover:bg-[#f7c789] disabled:cursor-not-allowed disabled:opacity-70"
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

          <aside className="space-y-5">
            <div className={cardClassName}>
              <div className="relative p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#f5b66f]">
                  Hồ sơ cần có
                </p>
                <ul className="mt-5 space-y-3">
                  {[
                    "Tên nghệ sĩ và phần giới thiệu ngắn",
                    "Thông tin xác minh danh tính rõ ràng",
                    "Ảnh mặt trước và mặt sau giấy tờ",
                    "Link sản phẩm âm nhạc hoặc portfolio",
                    "Các cam kết bắt buộc trước khi gửi",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm text-white/70"
                    >
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#f5b66f]" />
                      <span className="leading-6">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className={cardClassName}>
              <div className="relative p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#f5b66f]">
                  Gợi ý để hồ sơ đẹp hơn
                </p>
                <div className="mt-4 space-y-3 text-sm leading-6 text-white/65">
                  <p>
                    Dùng nghệ danh rõ ràng, dễ nhận diện và phần mô tả ngắn gọn để tạo ấn tượng tốt hơn.
                  </p>
                  <p>
                    Nên đính kèm link âm nhạc công khai để đội ngũ dễ kiểm tra mức độ hoạt động của bạn.
                  </p>
                  <p>
                    Ảnh giấy tờ nên sáng, rõ nét và đủ 4 góc để quá trình xét duyệt diễn ra nhanh hơn.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
};

export default ArtistRegistrationRequestPage;
