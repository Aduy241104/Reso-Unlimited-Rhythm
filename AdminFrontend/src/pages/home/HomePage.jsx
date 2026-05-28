import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";

const HomePage = () => {
  const { user } = useAuth();
  const [profileMessage, setProfileMessage] = useState("");
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);

  const handleCheckProfile = async () => {
    setIsCheckingProfile(true);
    setProfileMessage("");

    try {
      const profile = {};
      setProfileMessage(
        `Token is working. Hello ${profile?.username || profile?.email || "admin"}.`
      );
    } catch (error) {
      setProfileMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Could not load the current user."
      );
    } finally {
      setIsCheckingProfile(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-black bg-white p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-black/50">
          Admin Home
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-black">
          Basic admin content area
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-black/70">
          Khu vuc ben phai nay chi dung mau trang, den va xam nhe. Khi noi dung
          dai hon man hinh, chi cot nay se duoc scroll, con sidebar ben trai
          van co dinh.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[2rem] border border-black bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/45">
                Session
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-black">
                Current account
              </h2>
            </div>

            <button
              type="button"
              onClick={handleCheckProfile}
              disabled={isCheckingProfile}
              className="rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isCheckingProfile ? "Checking..." : "Check access token"}
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-black bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/45">
                Email
              </p>
              <p className="mt-3 break-all text-sm text-black">
                {user?.email || "-"}
              </p>
            </div>

            <div className="rounded-3xl border border-black bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/45">
                Username
              </p>
              <p className="mt-3 text-sm text-black">{user?.username || "-"}</p>
            </div>

            <div className="rounded-3xl border border-black bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/45">
                Role
              </p>
              <p className="mt-3 text-sm text-black">{user?.role || "-"}</p>
            </div>
          </div>

          {profileMessage && (
            <div className="mt-5 rounded-3xl border border-black bg-white px-5 py-4 text-sm text-black">
              {profileMessage}
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-black bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/45">
            Structure
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-black">
            Current layout
          </h2>
          <div className="mt-5 space-y-3 text-sm leading-6 text-black/70">
            <p>Sidebar ben trai la mot cot co dinh voi nen nau sang.</p>
            <p>Phan content ben phai chi dung nen trang, chu den va vien den.</p>
            <p>Wrapper tong dung `h-screen` va `overflow-hidden`.</p>
            <p>Chi `main` co `overflow-y-auto`, nen khi scroll sidebar van dung yen.</p>
          </div>
        </section>
      </div>

      <section className="rounded-[2rem] border border-black bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/45">
          Scroll demo
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-black">
          Content area sample
        </h2>
        <div className="mt-6 space-y-4">
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              className="rounded-3xl border border-black px-5 py-4 text-sm leading-6 text-black/75"
            >
              Sample block {index + 1}. Khu vuc nay duoc them vao de ban co the
              kiem tra nhanh hanh vi scroll trong cot content.
            </div>
          ))}
        </div>
      </section>
    </section>
  );
};

export default HomePage;
