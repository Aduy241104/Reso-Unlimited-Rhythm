import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
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

const TERMS_CONTENT = {
  acceptedTerms: {
    title: "Điều khoản dành cho nghệ sĩ",
    intro:
      "Vui lòng đọc kỹ toàn bộ điều khoản dưới đây trước khi đồng ý. Bạn cần cuộn xuống cuối và nhấn nút \"Đã đọc và đồng ý\" để có thể tích chọn cam kết này.",
    sections: [
      {
        heading: "1. Quyền và nghĩa vụ của nghệ sĩ",
        body: "Khi được phê duyệt trở thành nghệ sĩ trên nền tảng, bạn được phép đăng tải, phân phối và quảng bá các sản phẩm âm nhạc của mình thông qua hệ thống. Bạn có quyền quản lý hồ sơ, cập nhật thông tin cá nhân, cấu hình trang nghệ sĩ và theo dõi số liệu thống kê nghe/xem. Đồng thời, bạn có nghĩa vụ tuân thủ các quy tắc cộng đồng, không đăng tải nội dung vi phạm pháp luật, không spam hoặc lợi dụng nền tảng để thực hiện các hành vi gian lận.",
      },
      {
        heading: "2. Quy định về nội dung",
        body: "Mọi sản phẩm âm nhạc bạn cung cấp phải tuân thủ quy định pháp luật về bản quyền, quyền liên quan và quyền của người biểu diễn. Nội dung không được chứa ngôn từ kích động, bạo lực, phân biệt đối xử, khiêu dâm hoặc xâm phạm thuần phong mỹ tục. Nền tảng có quyền gỡ bỏ nội dung vi phạm mà không cần báo trước và có thể tạm khóa tài khoản nếu vi phạm nghiêm trọng.",
      },
      {
        heading: "3. Chính sách thanh toán và doanh thu",
        body: "Doanh thu từ việc phát nhạc, nghe nhạc và các hoạt động thương mại khác sẽ được phân chia theo tỷ lệ thỏa thuận trong hợp đồng riêng giữa nghệ sĩ và nền tảng. Việc thanh toán sẽ được thực hiện theo chu kỳ và phương thức đã đăng ký. Nền tảng có quyền khấu trừ các khoản thuế, phí theo quy định pháp luật hiện hành trước khi chi trả cho nghệ sĩ.",
      },
      {
        heading: "4. Quyền riêng tư và bảo mật thông tin",
        body: "Nền tảng cam kết bảo mật thông tin cá nhân của nghệ sĩ theo chính sách quyền riêng tư. Thông tin giấy tờ tùy thân chỉ được sử dụng cho mục đích xác minh danh tính và lưu trữ nội bộ, không chia sẻ cho bên thứ ba khi chưa có sự đồng ý bằng văn bản của nghệ sĩ, trừ trường hợp pháp luật yêu cầu.",
      },
      {
        heading: "5. Điều khoản chấm dứt",
        body: "Nghệ sĩ có quyền yêu cầu chấm dứt tài khoản nghệ sĩ bất kỳ lúc nào bằng cách gửi yêu cầu hỗ trợ. Nền tảng có quyền đình chỉ hoặc chấm dứt quyền nghệ sĩ nếu phát hiện vi phạm điều khoản, gian lận hoặc có hành vi gây tổn hại đến uy tín nền tảng và cộng đồng. Khi chấm dứt, các sản phẩm âm nhạc có thể được gỡ bỏ hoặc giữ lại tùy theo thỏa thuận.",
      },
      {
        heading: "6. Thay đổi điều khoản",
        body: "Nền tảng có quyền cập nhật và điều chỉnh các điều khoản này theo từng thời điểm. Mọi thay đổi sẽ được thông báo trước ít nhất 7 ngày qua email hoặc thông báo trong hệ thống. Việc bạn tiếp tục sử dụng dịch vụ sau khi điều khoản có hiệu lực đồng nghĩa với việc bạn chấp nhận các điều chỉnh đó.",
      },
      {
        heading: "7. Điều khoản chung",
        body: "Các điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Mọi tranh chấp phát sinh sẽ được ưu tiên giải quyết bằng thương lượng; nếu không đạt được thỏa thuận, tranh chấp sẽ được đưa ra giải quyết tại tòa án có thẩm quyền. Nếu có bất kỳ câu hỏi nào, vui lòng liên hệ bộ phận hỗ trợ nghệ sĩ qua email hoặc trung tâm hỗ trợ trực tuyến.",
      },
    ],
  },
  copyrightCommitment: {
    title: "Cam kết trách nhiệm bản quyền",
    intro:
      "Điều khoản này giải thích trách nhiệm của bạn đối với quyền sở hữu trí tuệ của các sản phẩm âm nhạc. Vui lòng đọc đến cuối trước khi xác nhận.",
    sections: [
      {
        heading: "1. Xác nhận quyền sở hữu",
        body: "Bạn cam kết rằng tất cả các sản phẩm âm nhạc (bài hát, beat, lời, hình ảnh, MV) mà bạn tải lên nền tảng hoặc cung cấp qua đường link đều thuộc quyền sở hữu hợp pháp của bạn, hoặc bạn đã được cấp phép đầy đủ bằng văn bản từ chủ sở hữu bản quyền để sử dụng, phân phối và đại diện cho các sản phẩm đó trên nền tảng.",
      },
      {
        heading: "2. Không sử dụng trái phép",
        body: "Bạn không được phép sử dụng beat, sample, melody, lời bài hát hoặc bất kỳ tác phẩm nào của người khác khi chưa có sự đồng ý bằng văn bản hoặc giấy phép hợp lệ. Bạn hiểu rằng việc sử dụng tác phẩm không được phép có thể cấu thành hành vi xâm phạm bản quyền theo Luật Sở hữu trí tuệ Việt Nam và các điều ước quốc tế mà Việt Nam tham gia.",
      },
      {
        heading: "3. Trách nhiệm khi phát sinh khiếu nại",
        body: "Bạn chịu hoàn toàn trách nhiệm pháp lý và tài chính nếu có khiếu nại về bản quyền từ bên thứ ba đối với các sản phẩm bạn cung cấp. Trong trường hợp này, bạn đồng ý bồi thường cho nền tảng mọi chi phí phát sinh bao gồm nhưng không giới hạn: phí tư vấn pháp lý, thiệt hại doanh thu, chi phí giải quyết tranh chấp và các khoản phạt theo quy định.",
      },
      {
        heading: "4. Quy trình xử lý vi phạm bản quyền",
        body: "Khi nhận được khiếu nại bản quyền hợp lệ, nền tảng có quyền tạm ẩn nội dung bị khiếu nại trong vòng 24 giờ để xác minh. Nếu xác nhận vi phạm, nội dung sẽ bị gỡ bỏ vĩnh viễn và tài khoản nghệ sĩ có thể bị đình chỉ vĩnh viễn. Trường hợp nghi ngờ gian lận hoặc tái phạm nhiều lần, nền tảng có quyền chuyển thông tin cho cơ quan chức năng có thẩm quyền.",
      },
      {
        heading: "5. Quyền cấp phép cho nền tảng",
        body: "Bằng việc tải nội dung lên, bạn cấp cho nền tảng một giấy phép không độc quyền, có thể chuyển nhượng, miễn phí bản quyền để sử dụng, tái sản xuất, phân phối, trình diễn công khai và chỉnh sửa nội dung cho mục đích vận hành, quảng bá và cung cấp dịch vụ của nền tảng. Giấy phép này tự động chấm dứt khi bạn gỡ nội dung, trừ khi nội dung đã được lưu trữ bởi người dùng khác theo quy định.",
      },
      {
        heading: "6. Cam kết khi hợp tác với bên thứ ba",
        body: "Nếu bạn hợp tác với nhà sản xuất, beatmaker, nghệ sĩ khác hoặc bất kỳ bên thứ ba nào trong quá trình tạo sản phẩm, bạn cam kết đã có thỏa thuận rõ ràng về quyền sở hữu và quyền sử dụng, đồng thời bạn có quyền đại diện cho toàn bộ sản phẩm trên nền tảng. Mọi tranh chấp nội bộ về quyền sở hữu giữa các bên là ngoài phạm vi trách nhiệm của nền tảng.",
      },
    ],
  },
  truthfulInformationCommitment: {
    title: "Cam kết thông tin trung thực",
    intro:
      "Bạn cần đọc đến cuối điều khoản này để xác nhận rằng toàn bộ thông tin cung cấp là trung thực và chính xác.",
    sections: [
      {
        heading: "1. Tính chính xác của thông tin cá nhân",
        body: "Bạn cam kết rằng tất cả thông tin cá nhân cung cấp trong hồ sơ đăng ký nghệ sĩ bao gồm: họ và tên thật, số CCCD/CMND, ngày sinh, ảnh giấy tờ tùy thân, số điện thoại, email và các thông tin liên hệ khác đều là chính xác, trung thực và thuộc về bạn hoặc đơn vị bạn được ủy quyền hợp pháp.",
      },
      {
        heading: "2. Ảnh giấy tờ tùy thân",
        body: "Ảnh chụp mặt trước và mặt sau giấy tờ tùy thân phải là ảnh gốc, rõ nét, không bị chỉnh sửa, cắt ghép hoặc làm mờ. Bạn không được sử dụng giấy tờ của người khác, giấy tờ hết hạn, giấy tờ giả mạo hoặc bất kỳ tài liệu nào không phải do cơ quan có thẩm quyền cấp. Mọi hành vi gian lận về giấy tờ sẽ bị xử lý theo quy định pháp luật.",
      },
      {
        heading: "3. Nghệ danh và đại diện",
        body: "Nghệ danh bạn đăng ký phải là tên mà bạn thực sự sử dụng trong hoạt động âm nhạc. Nếu bạn đăng ký thay mặt cho ban nhóm, công ty giải trí hoặc tổ chức, bạn cần có giấy ủy quyền hợp lệ và nền tảng có quyền yêu cầu cung cấp bằng chứng xác minh.",
      },
      {
        heading: "4. Trách nhiệm khi thông tin thay đổi",
        body: "Bạn có nghĩa vụ cập nhật kịp thời bất kỳ thay đổi nào về thông tin cá nhân, giấy tờ tùy thân hoặc tình trạng pháp lý trong vòng 30 ngày kể từ ngày phát sinh thay đổi. Việc cố tình giấu thông tin hoặc cung cấp thông tin sai lệch sau khi đã trở thành nghệ sĩ có thể dẫn đến đình chỉ tài khoản.",
      },
      {
        heading: "5. Xử lý vi phạm và gian lận",
        body: "Nếu phát hiện bất kỳ thông tin nào bạn cung cấp là sai sự thật, không chính xác hoặc có dấu hiệu gian lận, nền tảng có quyền từ chối phê duyệt hồ sơ, thu hồi quyền nghệ sĩ đã cấp, gỡ bỏ toàn bộ nội dung đã đăng tải và khóa tài khoản vĩnh viễn mà không hoàn lại bất kỳ khoản phí nào (nếu có). Ngoài ra, bạn có thể phải chịu trách nhiệm trước pháp luật.",
      },
      {
        heading: "6. Cam kết không mạo danh",
        body: "Bạn cam kết không mạo danh bất kỳ nghệ sĩ, cá nhân, tổ chức hay thương hiệu nào khác. Nếu hồ sơ của bạn có dấu hiệu mạo danh nghệ sĩ đã có trên nền tảng hoặc ngoài thực tế, hồ sơ sẽ bị từ chối ngay lập tức và tài khoản có thể bị khóa để điều tra thêm.",
      },
    ],
  },
};

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
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(160deg,rgba(20,20,24,0.98),rgba(10,10,14,0.98))] shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#f5b66f]/25 bg-[#f5b66f]/10 text-[#f5b66f]">
              <FileText className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2
                id={`terms-title-${termKey}`}
                className="text-base font-semibold text-white sm:text-lg"
              >
                {content.title}
              </h2>
              <p className="mt-1 text-xs text-white/55">
                {hasScrolledToEnd
                  ? "Bạn đã đọc đến cuối nội dung."
                  : "Vui lòng cuộn xuống cuối để tiếp tục."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-white/55 transition hover:bg-white/5 hover:text-white"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="h-1 w-full bg-white/5">
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
          <p className="mb-5 rounded-2xl border border-[#f5b66f]/15 bg-[#f5b66f]/5 px-4 py-3 text-sm leading-6 text-white/70">
            {content.intro}
          </p>
          <div className="space-y-5">
            {content.sections.map((section) => (
              <section key={section.heading}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#f5b66f]">
                  {section.heading}
                </h3>
                <p className="text-sm leading-7 text-white/75">{section.body}</p>
              </section>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-xs font-medium text-emerald-300">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Bạn đã đọc đến cuối điều khoản.
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-white/10 bg-black/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-white/75 transition hover:border-white/20 hover:bg-white/[0.07]"
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
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#f5b66f] px-5 text-sm font-semibold text-[#15181d] transition hover:bg-[#f7c789] disabled:cursor-not-allowed disabled:opacity-60"
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
    <div>
      <label
        className={[
          "flex items-start gap-3 rounded-2xl border px-4 py-4 transition",
          isDisabled
            ? "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-60"
            : "cursor-pointer border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]",
          error && !isDisabled ? "border-rose-300/40" : "",
        ].join(" ")}
      >
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={onChange}
          disabled={isDisabled}
          className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-[#f5b66f] focus:ring-[#f5b66f]/40 disabled:cursor-not-allowed"
        />
        <span className="flex-1 text-sm leading-6 text-white/75">{label}</span>
      </label>
      {requiresTerms ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 px-1">
          <button
            type="button"
            onClick={() => onOpenTerms(name)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#f5b66f]/20 bg-[#f5b66f]/8 px-3 py-1.5 text-xs font-semibold text-[#f5b66f] transition hover:border-[#f5b66f]/40 hover:bg-[#f5b66f]/14"
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
  const [activeTerms, setActiveTerms] = useState(null);
  const [readTerms, setReadTerms] = useState({
    acceptedTerms: false,
    copyrightCommitment: false,
    truthfulInformationCommitment: false,
  });

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
      <section className="mx-auto max-w-4xl space-y-8">
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

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)] xl:items-start">
          <div className={cardClassName}>
            <div className="pointer-events-none absolute -left-20 top-8 h-40 w-40 rounded-full bg-[#ff9f43]/10 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 rounded-full bg-[#9b6cff]/10 blur-3xl" />
            <div className="relative p-6 sm:p-8 lg:p-10">
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

          <TermsModal
            isOpen={Boolean(activeTerms)}
            termKey={activeTerms}
            onClose={() => setActiveTerms(null)}
            onAccept={(termKey) =>
              setReadTerms((previous) => ({ ...previous, [termKey]: true }))
            }
          />
        </div>
      </section>
    </main>
  );
};

export default ArtistRegistrationRequestPage;
