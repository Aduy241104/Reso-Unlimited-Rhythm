import { ExternalLink, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { formatFullNumber } from "../../utils/artistProfile";
import ArtistAvatar from "./ArtistAvatar";

const SOCIAL_PLATFORMS = [
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "youtube", label: "YouTube" },
  { key: "tiktok", label: "TikTok" },
  { key: "spotify", label: "Spotify" },
  { key: "soundcloud", label: "SoundCloud" },
  { key: "website", label: "Trang web" },
  { key: "twitter", label: "X (Twitter)" },
  { key: "other", label: "Liên kết khác" },
];

const StatItem = ({ label, value }) => (
  <div className="rounded-xl bg-[#242424] px-3 py-3 text-center">
    <p className="text-base font-semibold text-white sm:text-lg">
      {formatFullNumber(value)}
    </p>
    <p className="mt-0.5 text-[11px] text-[#969696]">{label}</p>
  </div>
);

const ArtistInformationModal = ({ isOpen, onClose, profile }) => {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !profile || typeof document === "undefined") {
    return null;
  }

  const socialLinks = SOCIAL_PLATFORMS.map((platform) => ({
    ...platform,
    href: profile.socialLinks?.[platform.key],
  })).filter(({ href }) => typeof href === "string" && href.trim());

  const stats = [
    { label: "Người nghe/tháng", value: profile.monthlyListeners },
    { label: "Người theo dõi", value: profile.followers },
    { label: "Lượt nghe", value: profile.totalStreams },
    { label: "Bài hát", value: profile.trackCount },
    { label: "Album", value: profile.albumCount },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-[680px] overflow-y-auto rounded-2xl border border-white/15 bg-[#181818] shadow-[0_24px_80px_rgba(0,0,0,0.55)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-h-[calc(100dvh-2rem)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="artist-information-modal-title"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#181818]/95 px-4 py-3 backdrop-blur sm:px-5">
          <h2
            id="artist-information-modal-title"
            className="text-base font-semibold text-white"
          >
            Thông tin nghệ sĩ
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#a9a9a9] transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-6 p-4 sm:p-6">
          <section className="relative overflow-hidden rounded-xl bg-[#222222]">
            <div className="relative h-32 overflow-hidden sm:h-40">
              {profile.banner ? (
                <img
                  src={profile.banner}
                  alt=""
                  className="h-full w-full object-cover opacity-80"
                />
              ) : (
                <div className="h-full w-full bg-[radial-gradient(circle_at_top,#3a3a3a_0%,#202020_50%,#181818_100%)]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#222222] via-black/15 to-transparent" />
            </div>

            <div className="relative flex items-end gap-4 px-4 pb-5 sm:px-5">
              <ArtistAvatar
                src={profile.avatar}
                alt={profile.name}
                size="lg"
                className="-mt-10 h-24 w-24 shrink-0 border-4 border-[#222222] shadow-xl"
              />
              <div className="min-w-0 flex-1 pb-1">
                <h3 className="truncate text-2xl font-bold text-white">
                  {profile.name}
                </h3>
                <p className="mt-1 text-sm text-[#a9a9a9]">Nghệ sĩ</p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {stats.map((stat) => (
              <StatItem key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </section>

          <section className="border-t border-white/10 pt-5">
            <h4 className="text-sm font-semibold text-white">Giới thiệu</h4>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#c7c7c7]">
              {profile.bio?.trim() || "Nghệ sĩ chưa cập nhật phần giới thiệu."}
            </p>
          </section>

          {socialLinks.length > 0 ? (
            <section className="border-t border-white/10 pt-5">
              <h4 className="text-sm font-semibold text-white">Liên kết nghệ sĩ</h4>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {socialLinks.map(({ key, label, href }) => (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-[#242424] px-3.5 py-3 text-sm text-[#d7d7d7] transition hover:bg-[#2d2d2d] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <span className="truncate">{label}</span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-[#8f8f8f]" aria-hidden />
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ArtistInformationModal;
