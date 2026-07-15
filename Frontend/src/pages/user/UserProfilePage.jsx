import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Loader2, Sparkles } from "lucide-react";
import UserProfileAvatar from "../../components/userProfile/UserProfileAvatar";
import UserProfileCard from "../../components/userProfile/UserProfileCard";
import UserProfileInfo from "../../components/userProfile/UserProfileInfo";
import { routePaths } from "../../routes/routePaths";
import { getFollowedArtists } from "../../services/libaryService";
import { getCurrentUserProfile } from "../../services/userProfileService";
import { getMySubscriptionStatus } from "../../services/userSubscriptionService";
import { getUserPlaylists } from "../../services/userPlaylistService";
import { getApiErrorMessage } from "../../utils/apiError";
import { getUserProfileDetail } from "../../utils/userProfileDetail";

const FOLLOWED_ARTISTS_LIMIT = 8;
const DEFAULT_EMPTY_TEXT = "Chưa cập nhật";

const normalizeText = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const normalizePlaylists = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.playlists)) {
    return payload.playlists;
  }

  return [];
};

const getArtistIdValue = (artist) =>
  artist?.artistId || artist?.id || artist?._id || "";

const getArtistName = (artist) =>
  normalizeText(artist?.name) || "Nghệ sĩ chưa cập nhật";

const getArtistAvatar = (artist) => normalizeText(artist?.avatar);

const getItemInitial = (value) => {
  const normalizedValue = normalizeText(value);
  return normalizedValue ? normalizedValue.charAt(0).toUpperCase() : "?";
};

const getPlaylistIdValue = (playlist) =>
  playlist?.playlistId || playlist?.id || playlist?._id || "";

const getPlaylistTitle = (playlist) => {
  const title = normalizeText(playlist?.title);

  if (title) {
    return title;
  }

  const name = normalizeText(playlist?.name);

  return name || "Playlist chưa đặt tên";
};

const getPlaylistCover = (playlist) => normalizeText(playlist?.coverImage);

const getPlaylistOwner = (playlist, fallbackOwner = "") => {
  const ownerName =
    normalizeText(playlist?.userName) ||
    normalizeText(playlist?.owner?.fullName) ||
    normalizeText(playlist?.owner?.name) ||
    normalizeText(playlist?.owner?.email) ||
    normalizeText(fallbackOwner);

  return ownerName || DEFAULT_EMPTY_TEXT;
};

const getPlaylistDescription = (playlist) => normalizeText(playlist?.description);

const normalizeSubscriptionStatus = (subscription) => {
  const planName = normalizeText(subscription?.planName);
  const status = normalizeText(subscription?.status).toLowerCase();
  const endDate = normalizeText(subscription?.endDate);
  const daysRemaining = Number(subscription?.daysRemaining);
  const hasDaysRemaining = Number.isFinite(daysRemaining);

  return {
    planName,
    status,
    endDate,
    daysRemaining: hasDaysRemaining ? daysRemaining : null,
  };
};

const getSubscriptionEndDateTimestamp = (value) => {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
};

const formatSubscriptionDate = (value) => {
  if (!value) {
    return DEFAULT_EMPTY_TEXT;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return DEFAULT_EMPTY_TEXT;
  }

  return new Intl.DateTimeFormat("vi-VN").format(parsedDate);
};

const getSubscriptionStatusMeta = (status) => {
  const statusMap = {
    active: {
      label: "Đang hoạt động",
      className:
        "border-white bg-white text-black shadow-[0_12px_30px_rgba(255,255,255,0.08)]",
    },
  };

  return (
    statusMap[status] || {
      label: status || DEFAULT_EMPTY_TEXT,
      className: "border-white/12 bg-white/[0.05] text-white/80",
    }
  );
};

const pageShellClassName = "bg-black px-4 py-6 text-white sm:px-6 lg:px-8";

const sectionPanelClassName =
  "rounded-[32px] border border-white/10 bg-[#111111] p-6 shadow-[0_20px_48px_rgba(0,0,0,0.24)] sm:p-8";

const LoadingCard = () => {
  return (
    <section className={sectionPanelClassName}>
      <div className="flex min-h-[280px] flex-col items-center justify-center text-center text-white/65">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/12 bg-white/[0.05] text-white/85">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
        <p className="mt-5 text-sm font-medium tracking-[0.18em] text-white/90">
          Đang tải hồ sơ của bạn...
        </p>
      </div>
    </section>
  );
};

const ErrorCard = ({ message }) => {
  return (
    <section className={sectionPanelClassName}>
      <h1 className="text-lg font-semibold text-white">Không thể tải hồ sơ</h1>
      <p className="mt-3 text-sm leading-6 text-white/70">{message}</p>
    </section>
  );
};

const SectionTitle = ({ eyebrow, title, description }) => {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        {eyebrow ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/68">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {eyebrow}
          </div>
        ) : null}
        <div className="space-y-1.5">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {title}
          </h2>
          {description ? (
            <p className="max-w-3xl text-sm leading-6 text-white/55">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const SectionLoading = ({ message }) => {
  return (
    <div className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/65">
      <Loader2 className="h-4 w-4 animate-spin text-white/80" aria-hidden />
      <span>{message}</span>
    </div>
  );
};

const SectionMessage = ({ message }) => {
  return (
    <p className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-white/65">
      {message}
    </p>
  );
};

const InfoTile = ({ label, value, children }) => {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.05),rgba(10,10,10,0.72))] p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
        {label}
      </p>
      <div className="mt-3 text-base font-medium text-white">
        {children || value || DEFAULT_EMPTY_TEXT}
      </div>
    </div>
  );
};

const ProfilePlaylistCard = ({ playlist, fallbackOwner }) => {
  const playlistId = getPlaylistIdValue(playlist);
  const playlistTitle = getPlaylistTitle(playlist);
  const coverImage = getPlaylistCover(playlist);
  const ownerName = getPlaylistOwner(playlist, fallbackOwner);
  const description = getPlaylistDescription(playlist);
  const playlistPath = playlistId ? routePaths.userPlaylistDetail(playlistId) : "";

  const content = (
    <>
      <div className="relative aspect-square overflow-hidden rounded-[24px] border border-white/10 bg-[#111111]">
        {coverImage ? (
          <img
            src={coverImage}
            alt={playlistTitle}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#2b2b2b_0%,#090909_100%)] text-6xl font-semibold text-white">
            {getItemInitial(playlistTitle)}
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
      </div>

      <div className="space-y-2 pt-4">
        <h3 className="line-clamp-2 text-lg font-semibold tracking-tight text-white">
          {playlistTitle}
        </h3>

        <p className="line-clamp-2 min-h-[2.75rem] text-sm leading-6 text-white/60">
          {description || `Bởi ${ownerName}`}
        </p>

        <p className="line-clamp-1 text-xs font-medium uppercase tracking-[0.2em] text-white/30">
          {ownerName !== DEFAULT_EMPTY_TEXT
            ? `Playlist của ${ownerName}`
            : DEFAULT_EMPTY_TEXT}
        </p>
      </div>
    </>
  );

  const className =
    "group flex h-full flex-col rounded-[28px] border border-white/10 bg-[linear-gradient(150deg,rgba(255,255,255,0.04),rgba(8,8,8,0.9))] p-3 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_26px_50px_rgba(0,0,0,0.28)]";

  if (!playlistPath) {
    return <article className={className}>{content}</article>;
  }

  return (
    <Link to={playlistPath} className={className}>
      {content}
    </Link>
  );
};

const FollowedArtistCard = ({ artist }) => {
  const artistId = getArtistIdValue(artist);
  const artistName = getArtistName(artist);
  const avatar = getArtistAvatar(artist);
  const artistPath = artistId ? routePaths.artistBrowseProfile(artistId) : "";

  const content = (
    <>
      <div className="flex items-center gap-4">
        {avatar ? (
          <img
            src={avatar}
            alt={artistName}
            className="h-16 w-16 shrink-0 rounded-full object-cover ring-1 ring-white/10"
            loading="lazy"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(135deg,#2b2b2b_0%,#090909_100%)] text-lg font-semibold text-white">
            {getItemInitial(artistName)}
          </div>
        )}

        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-white sm:text-lg">
            {artistName}
          </p>
          <p className="mt-1 text-sm text-white/45">Nghệ sĩ đang theo dõi</p>
        </div>
      </div>

      <ChevronRight className="h-5 w-5 shrink-0 text-white/25 transition duration-300 group-hover:translate-x-1 group-hover:text-white/75" />
    </>
  );

  const className =
    "group flex items-center justify-between gap-4 rounded-[24px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.04),rgba(8,8,8,0.84))] px-5 py-4 transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_20px_44px_rgba(0,0,0,0.24)]";

  if (!artistPath) {
    return <article className={className}>{content}</article>;
  }

  return (
    <Link to={artistPath} className={className}>
      {content}
    </Link>
  );
};

const UserProfilePage = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const [subscriptionErrorMessage, setSubscriptionErrorMessage] = useState("");

  const [followedArtists, setFollowedArtists] = useState([]);
  const [isLoadingFollowedArtists, setIsLoadingFollowedArtists] = useState(true);
  const [followedArtistsErrorMessage, setFollowedArtistsErrorMessage] =
    useState("");

  const [playlists, setPlaylists] = useState([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(true);
  const [playlistsErrorMessage, setPlaylistsErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const currentUser = await getCurrentUserProfile();

        if (!isMounted) {
          return;
        }

        setUser(currentUser);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setUser(null);
        setErrorMessage(
          getApiErrorMessage(error, "Không thể tải hồ sơ của bạn lúc này.")
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSubscriptionStatus = async () => {
      setIsLoadingSubscription(true);
      setSubscriptionErrorMessage("");

      try {
        const payload = await getMySubscriptionStatus();

        if (!isMounted) {
          return;
        }

        setSubscriptionStatus(payload);
      } catch {
        if (!isMounted) {
          return;
        }

        setSubscriptionStatus(null);
        setSubscriptionErrorMessage("Không thể tải tình trạng gói");
      } finally {
        if (isMounted) {
          setIsLoadingSubscription(false);
        }
      }
    };

    const loadFollowedArtists = async () => {
      setIsLoadingFollowedArtists(true);
      setFollowedArtistsErrorMessage("");

      try {
        const payload = await getFollowedArtists({
          page: 1,
          limit: FOLLOWED_ARTISTS_LIMIT,
        });

        if (!isMounted) {
          return;
        }

        setFollowedArtists(
          Array.isArray(payload?.artists) ? payload.artists : []
        );
      } catch {
        if (!isMounted) {
          return;
        }

        setFollowedArtists([]);
        setFollowedArtistsErrorMessage(
          "Không thể tải danh sách nghệ sĩ đang theo dõi."
        );
      } finally {
        if (isMounted) {
          setIsLoadingFollowedArtists(false);
        }
      }
    };

    const loadPlaylists = async () => {
      setIsLoadingPlaylists(true);
      setPlaylistsErrorMessage("");

      try {
        const payload = await getUserPlaylists();

        if (!isMounted) {
          return;
        }

        setPlaylists(normalizePlaylists(payload));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPlaylists([]);
        setPlaylistsErrorMessage(
          getApiErrorMessage(error, "Không thể tải playlist công khai.")
        );
      } finally {
        if (isMounted) {
          setIsLoadingPlaylists(false);
        }
      }
    };

    void loadSubscriptionStatus();
    void loadFollowedArtists();
    void loadPlaylists();

    return () => {
      isMounted = false;
    };
  }, []);

  const profileDetail = useMemo(() => getUserProfileDetail(user), [user]);
  const subscriptionDetail = useMemo(
    () => normalizeSubscriptionStatus(subscriptionStatus),
    [subscriptionStatus]
  );
  const hasActiveSubscription = useMemo(() => {
    const endDateTimestamp = getSubscriptionEndDateTimestamp(
      subscriptionDetail.endDate
    );

    return (
      subscriptionDetail.status === "active" &&
      ((subscriptionDetail.daysRemaining ?? 0) > 0 ||
        (endDateTimestamp !== null && endDateTimestamp > Date.now()))
    );
  }, [
    subscriptionDetail.daysRemaining,
    subscriptionDetail.endDate,
    subscriptionDetail.status,
  ]);
  const subscriptionStatusMeta = useMemo(
    () => getSubscriptionStatusMeta(subscriptionDetail.status),
    [subscriptionDetail.status]
  );

  if (isLoading) {
    return (
      <main className={pageShellClassName}>
        <div className="mx-auto w-full max-w-7xl">
          <LoadingCard />
        </div>
      </main>
    );
  }

  if (errorMessage || !user) {
    return (
      <main className={pageShellClassName}>
        <div className="mx-auto w-full max-w-7xl">
          <ErrorCard message={errorMessage || "Không có dữ liệu hồ sơ."} />
        </div>
      </main>
    );
  }

  return (
    <main className={pageShellClassName}>
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className={sectionPanelClassName}>
          <SectionTitle
            eyebrow="Profile"
            title="Thông tin hồ sơ"
            description="Không gian chính để xem nhanh thông tin cá nhân, cập nhật tài khoản và giữ mọi thứ đồng bộ với trải nghiệm nghe nhạc của bạn."
          />
          <UserProfileCard>
            <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)] xl:gap-8">
              <UserProfileAvatar
                avatar={profileDetail.avatar}
                fullName={profileDetail.fullName}
                email={profileDetail.email}
              />

              <UserProfileInfo
                fullName={profileDetail.fullName}
                email={profileDetail.email}
                gender={profileDetail.gender}
                country={profileDetail.country}
              />
            </div>
          </UserProfileCard>
        </div>

        <div className={sectionPanelClassName}>
          <SectionTitle
            eyebrow="Premium"
            title="Tình trạng gói"
            description="Hiển thị gói Premium còn hiệu lực và những thông tin quan trọng nhất để bạn theo dõi nhanh."
          />
          <UserProfileCard>
            {isLoadingSubscription ? (
              <SectionLoading message="Đang tải tình trạng gói..." />
            ) : subscriptionErrorMessage ? (
              <SectionMessage message={subscriptionErrorMessage} />
            ) : hasActiveSubscription ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <InfoTile
                  label="Tên gói"
                  value={subscriptionDetail.planName || "Premium"}
                />
                <InfoTile label="Trạng thái">
                  <span
                    className={[
                      "inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold",
                      subscriptionStatusMeta.className,
                    ].join(" ")}
                  >
                    {subscriptionStatusMeta.label}
                  </span>
                </InfoTile>
                <InfoTile
                  label="Ngày kết thúc"
                  value={formatSubscriptionDate(subscriptionDetail.endDate)}
                />
                <InfoTile
                  label="Số ngày còn lại"
                  value={
                    subscriptionDetail.daysRemaining !== null
                      ? `${subscriptionDetail.daysRemaining} ngày`
                      : DEFAULT_EMPTY_TEXT
                  }
                />
              </div>
            ) : (
              <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(0,0,0,0.3)_35%,rgba(8,8,8,0.9))] p-6 sm:p-7">
                <p className="text-base font-medium text-white sm:text-lg">
                  Bạn chưa đăng kí gói Premium
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                  Mở Premium để nâng cấp trải nghiệm nghe nhạc, tận hưởng nhiều quyền
                  lợi hơn và cá nhân hóa tài khoản của bạn sâu hơn.
                </p>
                <Link
                  to={routePaths.premium}
                  className="mt-5 inline-flex items-center justify-center rounded-2xl border border-white bg-white px-5 py-3 text-sm font-semibold text-black transition duration-300 hover:bg-transparent hover:text-white"
                >
                  Đăng kí Premium
                </Link>
              </div>
            )}
          </UserProfileCard>
        </div>

        <div className={sectionPanelClassName}>
          <SectionTitle
            eyebrow="Playlists"
            title="Playlist công khai"
            description="Những playlist bạn đang chia sẻ được hiển thị theo dạng card cover lớn để duyệt nhanh và nhìn bắt mắt hơn."
          />
          <UserProfileCard>
            {isLoadingPlaylists ? (
              <SectionLoading message="Đang tải playlist công khai..." />
            ) : playlistsErrorMessage ? (
              <SectionMessage message={playlistsErrorMessage} />
            ) : playlists.length === 0 ? (
              <SectionMessage message="Bạn chưa có playlist nào." />
            ) : (
              <section
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
                aria-label="Playlist công khai"
              >
                {playlists.map((playlist, index) => (
                  <ProfilePlaylistCard
                    key={
                      getPlaylistIdValue(playlist) ||
                      `${getPlaylistTitle(playlist)}-${index}`
                    }
                    playlist={playlist}
                    fallbackOwner={profileDetail.fullName || profileDetail.email}
                  />
                ))}
              </section>
            )}
          </UserProfileCard>
        </div>

        <div className={sectionPanelClassName}>
          <SectionTitle
            eyebrow="Following"
            title="Đang theo dõi"
            description="Các nghệ sĩ bạn yêu thích được hiển thị theo card hiện đại để mở nhanh sang trang chi tiết chỉ với một cú click."
          />
          <UserProfileCard>
            {isLoadingFollowedArtists ? (
              <SectionLoading message="Đang tải danh sách đang theo dõi..." />
            ) : followedArtistsErrorMessage ? (
              <SectionMessage message={followedArtistsErrorMessage} />
            ) : followedArtists.length === 0 ? (
              <SectionMessage message="Bạn chưa theo dõi nghệ sĩ nào." />
            ) : (
              <section
                className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
                aria-label="Nghệ sĩ đang theo dõi"
              >
                {followedArtists.map((artist, index) => (
                  <FollowedArtistCard
                    key={getArtistIdValue(artist) || `${getArtistName(artist)}-${index}`}
                    artist={artist}
                  />
                ))}
              </section>
            )}
          </UserProfileCard>
        </div>
      </section>
    </main>
  );
};

export default UserProfilePage;
