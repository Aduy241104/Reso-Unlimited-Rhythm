import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import UserProfileAvatar from "../../components/userProfile/UserProfileAvatar";
import UserProfileCard from "../../components/userProfile/UserProfileCard";
import UserProfileInfo from "../../components/userProfile/UserProfileInfo";
import { getCurrentUserProfile } from "../../services/userProfileService";
import { getApiErrorMessage } from "../../utils/apiError";
import { getUserProfileDetail } from "../../utils/userProfileDetail";

const LoadingCard = () => {
  return (
    <UserProfileCard>
      <div className="flex min-h-[420px] flex-col items-center justify-center text-center text-gray-400">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#ff9f43]/30 bg-[#ff9f43]/10 shadow-[0_0_40px_rgba(255,159,67,0.22)]">
          <Loader2 className="h-7 w-7 animate-spin text-[#ff9f43]" aria-hidden />
        </div>
        <p className="mt-5 text-sm font-medium tracking-[0.18em] text-white/90">
          Đang tải hồ sơ của bạn...
        </p>
      </div>
    </UserProfileCard>
  );
};

const ErrorCard = ({ message }) => {
  return (
    <section className="rounded-3xl border border-red-400/20 bg-white/5 p-6 text-red-100 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-md sm:p-8">
      <h1 className="text-lg font-semibold text-white">Không thể tải hồ sơ</h1>
      <p className="mt-3 text-sm leading-6 text-red-100/85">{message}</p>
    </section>
  );
};

const pageShellClassName =
  "min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,159,67,0.24),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(255,145,77,0.12),_transparent_22%),linear-gradient(135deg,_#050505_0%,_#0c0c0f_42%,_#111114_100%)] px-4 py-10 text-white sm:px-6 lg:px-8";

const UserProfilePage = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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
          getApiErrorMessage(
            error,
            "Không thể tải hồ sơ của bạn lúc này."
          )
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const profileDetail = useMemo(() => getUserProfileDetail(user), [user]);

  if (isLoading) {
    return (
      <main className={pageShellClassName}>
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-8 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#ff9f43]">
              Tài khoản &gt; Hồ sơ
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Hồ sơ người dùng
            </h1>
          </div>
          <LoadingCard />
        </div>
      </main>
    );
  }

  if (errorMessage || !user) {
    return (
      <main className={pageShellClassName}>
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-8 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#ff9f43]">
              Tài khoản &gt; Hồ sơ
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Hồ sơ người dùng
            </h1>
          </div>
          <ErrorCard message={errorMessage || "Không có dữ liệu hồ sơ."} />
        </div>
      </main>
    );
  }

  return (
    <main className={pageShellClassName}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,_rgba(255,159,67,0.18),_transparent_60%)]" />

      <section className="relative mx-auto w-full max-w-6xl space-y-8">
        <div className="space-y-3 px-1">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#ff9f43]">
            Tài khoản &gt; Hồ sơ
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Hồ sơ người dùng
          </h1>
        </div>

        <UserProfileCard>
          <div className="grid gap-8 xl:grid-cols-[360px_minmax(0,1fr)] xl:gap-10">
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
      </section>
    </main>
  );
};

export default UserProfilePage;
