import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Headphones,
  Calendar,
  Clock,
  Mail,
  User,
  Pencil,
  ExternalLink,
  Loader2,
  Globe,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { getMyArtistProfileService } from "../../services/artistService";
import { routePaths } from "../../routes/routePaths";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  formatCount,
  formatDate,
  getAvatarSrc,
  getCoverSrc,
} from "./artistProfileUtils";

export default function ArtistProfilePage() {
  const [artist, setArtist] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const isBlocked = artist?.activeStatus === "blocked";
  const isVerified = artist?.verificationStatus === "verified";

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const data = await getMyArtistProfileService();
        if (!isMounted) return;
        setArtist(data);
      } catch (error) {
        if (!isMounted) return;
        setArtist(null);
        setErrorMessage(
          getApiErrorMessage(error, "Không thể tải hồ sơ nghệ sĩ từ máy chủ.")
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const coverSrc = useMemo(() => getCoverSrc(artist), [artist]);
  const avatarSrc = useMemo(() => getAvatarSrc(artist), [artist]);

  const socialEntries = useMemo(() => {
    const links = artist?.socialLinks ?? {};
    const ALL_PLATFORMS = [
      { key: "facebook", label: "Facebook", href: links.facebook },
      { key: "instagram", label: "Instagram", href: links.instagram },
      { key: "youtube", label: "YouTube", href: links.youtube },
      { key: "tiktok", label: "TikTok", href: links.tiktok },
      { key: "spotify", label: "Spotify", href: links.spotify },
      { key: "soundcloud", label: "SoundCloud", href: links.soundcloud },
      { key: "website", label: "Trang web chính thức", href: links.website },
      { key: "twitter", label: "X (Twitter)", href: links.twitter },
      { key: "other", label: "Liên kết khác", href: links.other },
    ];
    return ALL_PLATFORMS.filter((item) => item.href && String(item.href).trim());
  }, [artist]);

  if (isLoading) {
    return (
      <section className="flex min-h-[360px] flex-col items-center justify-center rounded-[24px] border border-[#ebe6ff] bg-white p-10 text-[#6b6682] shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-[#7c6cf2]" aria-hidden />
        <p className="mt-3 text-sm font-medium">Đang tải hồ sơ nghệ sĩ của bạn...</p>
      </section>
    );
  }

  if (errorMessage || !artist) {
    return (
      <section className="rounded-[24px] border border-rose-200 bg-rose-50 p-6 text-rose-900 shadow-sm">
        <h2 className="text-base font-bold">Không thể tải thông tin hồ sơ</h2>
        <p className="mt-2 text-xs leading-relaxed text-rose-800">{errorMessage}</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">

      {/* Hero Header Card */}
      <section className="overflow-hidden rounded-[24px] border border-[#e7e1ff] bg-white shadow-sm transition hover:shadow-md">
        
        {/* Cover Photo */}
        <div className="relative h-44 w-full bg-[#1e1b2e] sm:h-56">
          <img
            src={coverSrc}
            alt={artist.name}
            className="h-full w-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
        </div>

        {/* Profile Info & Actions Bar */}
        <div className="relative px-6 pb-6 pt-2 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            
            {/* Avatar & Title */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="-mt-14 sm:-mt-16 h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-white bg-white shadow-lg sm:h-32 sm:w-32">
                <img
                  src={avatarSrc}
                  alt={artist.name}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="pt-3 sm:pt-4">
                <p className="text-xs uppercase tracking-[0.28em] font-bold text-[#7c6cf2]">
                  Hồ sơ nghệ sĩ chính thức
                </p>
                <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight text-[#2f2747] sm:text-3xl">
                  <span>{artist.name}</span>

                  {/* Verified Badge */}
                  {isVerified && (
                    <span
                      title="Nghệ sĩ đã xác minh"
                      className="relative inline-flex items-center justify-center"
                    >
                      <span className="h-5 w-5 rounded-full bg-[#3d91f4] flex items-center justify-center shadow-sm">
                        <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="currentColor">
                          <path fillRule="evenodd" d="M9.92 2.83a.6.6 0 0 1 .08.8L5.28 8.35a.6.6 0 0 1-.87 0l-2-2.3a.6.6 0 1 1 .83-.87l1.5 1.73 4.35-5.02a.6.6 0 0 1 .83-.06Z" clipRule="evenodd" />
                        </svg>
                      </span>
                    </span>
                  )}
                </h1>

                {/* Status Pills */}
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-xs font-semibold ${
                      isBlocked
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {isBlocked ? (
                      <>
                        <AlertTriangle size={12} />
                        <span>Tài khoản đã bị khóa</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={12} />
                        <span>Đang hoạt động</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Edit Profile Action Button */}
            <div className="shrink-0 sm:pb-1">
              {isBlocked ? (
                <span
                  className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-400"
                  title="Hồ sơ đang bị tạm khóa nên không thể chỉnh sửa."
                >
                  <Pencil size={14} />
                  <span>Chỉnh sửa hồ sơ</span>
                </span>
              ) : (
                <Link
                  to={routePaths.artistProfileEdit}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#e7e1ff] bg-[#faf9ff] px-4 py-2.5 text-xs font-semibold text-[#2f2747] transition hover:border-[#6f5cf1] hover:bg-[#6f5cf1] hover:text-white shadow-sm"
                >
                  <Pencil size={14} />
                  <span>Chỉnh sửa hồ sơ</span>
                </Link>
              )}
            </div>
          </div>

          {/* Blocked Alert Banner */}
          {isBlocked && (
            <div className="mt-5 rounded-[16px] border border-rose-200 bg-rose-50/90 p-4 text-xs text-rose-900 shadow-sm space-y-1">
              <p className="font-bold text-sm flex items-center gap-1.5 text-rose-700">
                <AlertTriangle size={16} />
                <span>Tài khoản bị giới hạn quyền</span>
              </p>
              <p className="text-rose-800">
                Bạn vẫn có thể xem lại thông tin hồ sơ của mình, tuy nhiên tính năng chỉnh sửa và cập nhật bài hát đã bị khóa.
              </p>
              {artist.blockedReason ? (
                <p className="pt-2 text-rose-900 font-semibold border-t border-rose-200/80 mt-2">
                  Lý do từ Ban quản trị: "{artist.blockedReason}"
                </p>
              ) : null}
            </div>
          )}

          {/* Artist Biography */}
          <div className="mt-5 border-t border-[#efeaff] pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7c7891]">
              Tiểu sử nghệ sĩ
            </h3>
            {artist.bio ? (
              <p className="mt-2 text-sm leading-relaxed text-[#2f2747] max-w-4xl">
                {artist.bio}
              </p>
            ) : (
              <p className="mt-2 text-xs italic text-[#8c86ab]">
                Chưa cập nhật tiểu sử. Bạn có thể bấm "Chỉnh sửa hồ sơ" để giới thiệu câu chuyện nghệ thuật của bạn với người hâm mộ.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 4 Summary Stat Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        
        {/* Card 1: Followers */}
        <div className="rounded-[18px] border border-[#e7e1ff] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#7c7891]">Người theo dõi</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#faf9ff] text-[#7c6cf2] border border-[#efeaff]">
              <Users size={18} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#2f2747]">
            {formatCount(artist.stats?.followers)} <span className="text-xs font-normal text-[#7c7891]">người</span>
          </p>
          <p className="mt-1 text-[11px] text-[#8c86ab]">
            Số fan hâm mộ đang theo dõi bạn trên hệ thống
          </p>
        </div>

        {/* Card 2: Total Streams */}
        <div className="rounded-[18px] border border-[#e7e1ff] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#7c7891]">Tổng lượt nghe</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#faf9ff] text-[#7c6cf2] border border-[#efeaff]">
              <Headphones size={18} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#2f2747]">
            {formatCount(artist.stats?.totalStreams)} <span className="text-xs font-normal text-[#7c7891]">lượt</span>
          </p>
          <p className="mt-1 text-[11px] text-[#8c86ab]">
            Tổng lượt stream tích lũy toàn thời gian
          </p>
        </div>

        {/* Card 3: Profile Created */}
        <div className="rounded-[18px] border border-[#e7e1ff] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#7c7891]">Ngày tạo hồ sơ</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#faf9ff] text-[#7c6cf2] border border-[#efeaff]">
              <Calendar size={18} />
            </div>
          </div>
          <p className="mt-2 text-base font-bold text-[#2f2747]">
            {formatDate(artist.createdAt)}
          </p>
          <p className="mt-1 text-[11px] text-[#8c86ab]">
            Thời điểm tài khoản nghệ sĩ được phê duyệt
          </p>
        </div>

        {/* Card 4: Last Updated */}
        <div className="rounded-[18px] border border-[#e7e1ff] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#7c7891]">Cập nhật gần nhất</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#faf9ff] text-[#7c6cf2] border border-[#efeaff]">
              <Clock size={18} />
            </div>
          </div>
          <p className="mt-2 text-base font-bold text-[#2f2747]">
            {formatDate(artist.updatedAt)}
          </p>
          <p className="mt-1 text-[11px] text-[#8c86ab]">
            Lần cập nhật thông tin gần đây nhất
          </p>
        </div>

      </div>

      {/* Account Info Section */}
      <section className="rounded-[20px] border border-[#e7e1ff] bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-[#2f2747]">
            Thông tin tài khoản hệ thống
          </h2>
          <p className="mt-0.5 text-xs text-[#7c7891]">
            Các thông tin cá nhân liên kết từ tài khoản đăng nhập Reso Music của bạn.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Email Item */}
          <div className="rounded-[14px] border border-[#efeaff] bg-[#faf9ff] p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#7c6cf2] border border-[#e7e1ff] shadow-sm">
              <Mail size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#7c7891]">Email tài khoản</p>
              <p className="text-sm font-bold text-[#2f2747] mt-0.5">
                {artist.account?.email || "—"}
              </p>
            </div>
          </div>

          {/* Full Name Item */}
          <div className="rounded-[14px] border border-[#efeaff] bg-[#faf9ff] p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#7c6cf2] border border-[#e7e1ff] shadow-sm">
              <User size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#7c7891]">Họ và tên (Tài khoản)</p>
              <p className="text-sm font-bold text-[#2f2747] mt-0.5">
                {artist.account?.fullName || "—"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Links Section */}
      <section className="rounded-[20px] border border-[#e7e1ff] bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-[#2f2747]">
            Liên kết mạng xã hội
          </h2>
          <p className="mt-0.5 text-xs text-[#7c7891]">
            Các đường dẫn kênh truyền thông chính thức bạn đã kết nối trên hồ sơ.
          </p>
        </div>

        {socialEntries.length === 0 ? (
          <div className="rounded-[14px] border border-[#efeaff] bg-[#faf9ff] p-5 text-center text-xs text-[#7c7891]">
            <Globe size={24} className="mx-auto mb-2 text-[#9992bf]" />
            Chưa thêm liên kết mạng xã hội nào. Bạn có thể cập nhật trong trang "Chỉnh sửa hồ sơ".
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {socialEntries.map((item) => (
              <a
                key={item.key}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-[#e7e1ff] bg-[#faf9ff] px-4 py-2.5 text-xs font-semibold text-[#2f2747] transition hover:border-[#6f5cf1] hover:bg-[#6f5cf1] hover:text-white shadow-sm"
              >
                <span>{item.label}</span>
                <ExternalLink size={13} />
              </a>
            ))}
          </div>
        )}
      </section>

    </section>
  );
}
