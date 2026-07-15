import { CalendarDays, UserRound } from "lucide-react";
import { useMemo, useState } from "react";

const formatFollowedDate = (value) => {
  if (!value) {
    return "--/--/----";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--/--/----";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const getInitials = (fullName = "") => {
  const parts = String(fullName)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "--";
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
};

const ArtistFollowerItem = ({ follower }) => {
  const [hasAvatarError, setHasAvatarError] = useState(false);
  const fullName = follower?.fullName || "Người dùng chưa cập nhật tên";
  const avatar = follower?.avatar || "";
  const followedDate = useMemo(
    () => formatFollowedDate(follower?.followedAt),
    [follower?.followedAt]
  );
  const initials = useMemo(() => getInitials(fullName), [fullName]);
  const showFallbackAvatar = !avatar || hasAvatarError;

  return (
    <article className="rounded-[20px] border border-[#ece8ff] bg-white p-4 shadow-sm transition hover:border-[#d8d1ff] hover:bg-[#fcfbff] dark:border-white/10 dark:bg-[#181818] dark:hover:border-white/15 dark:hover:bg-white/[0.04] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#ece8ff] bg-[#f6f3ff] text-[#6f5cf1] dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
            {showFallbackAvatar ? (
              <span className="flex h-full w-full items-center justify-center text-sm font-semibold">
                {initials !== "--" ? initials : <UserRound className="h-5 w-5" />}
              </span>
            ) : (
              <img
                src={avatar}
                alt={fullName}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={() => setHasAvatarError(true)}
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-[#2f2747] dark:text-white sm:text-lg">
              {fullName}
            </h3>
            <div className="mt-2 inline-flex items-center gap-2 text-sm text-[#6f6888] dark:text-[#a1a1aa]">
              <CalendarDays className="h-4 w-4 text-[#7c6cf2] dark:text-[#c4bbff]" />
              <span>Đã theo dõi ngày {followedDate}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default ArtistFollowerItem;
