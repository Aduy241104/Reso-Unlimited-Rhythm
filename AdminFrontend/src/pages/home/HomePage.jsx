import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { getCurrentUserService } from "../../services/authService";

const HomePage = () => {
  const { logout, user } = useAuth();
  const [profileMessage, setProfileMessage] = useState("");
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);

  const handleCheckProfile = async () => {
    setIsCheckingProfile(true);
    setProfileMessage("");

    try {
      const profile = await getCurrentUserService();
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
    <main className="min-h-screen bg-slate-100 px-6 py-10">
      <section className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-[0_24px_80px_rgba(15,23,42,0.2)]">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-300">
            Admin Home
          </p>
          <h1 className="mt-3 text-4xl font-bold">Admin dashboard home</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            Auth context, route guards, and refresh-token handling now run in
            AdminFrontend. This is a minimal protected page to verify the login
            flow.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">
              Current session
            </h2>
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <p>
                <span className="font-semibold text-slate-900">Email:</span>{" "}
                {user?.email || "-"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Username:</span>{" "}
                {user?.username || "-"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Role:</span>{" "}
                {user?.role || "-"}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCheckProfile}
                disabled={isCheckingProfile}
                className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isCheckingProfile ? "Calling /me..." : "Check access token"}
              </button>

              <button
                type="button"
                onClick={() => logout()}
                className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Sign out
              </button>
            </div>

            {profileMessage && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {profileMessage}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">
              Current structure
            </h2>
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <p>`/login` uses `PublicRoute`.</p>
              <p>`/` uses `ProtectedRoute` + `RoleRoute` for `admin`.</p>
              <p>
                Axios interceptors attach the access token and refresh on `401`.
              </p>
              <p>
                Session state is synchronized with `localStorage` like the main
                Frontend app.
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
};

export default HomePage;
