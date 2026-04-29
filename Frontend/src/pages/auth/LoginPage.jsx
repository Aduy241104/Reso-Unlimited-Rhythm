import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import loginBg from "../../assets/images/ChatGPT Image 10_35_18 29 thg 4, 2026.png";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const authNotice = location.state?.authNotice || "";
  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f8ff]">
      <img
        src={ loginBg }
        alt="Login background"
        className="absolute inset-0 h-full w-full object-cover"
      />

     
      <section className="relative z-10 flex min-h-screen items-center px-6 py-8 sm:px-12 lg:px-24">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="hidden lg:block" />

          <div className="flex justify-end">
            <div className="w-full max-w-md rounded-2xl border border-[#f6b980]/25 bg-[#11131f]/65 p-8 shadow-[0_28px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <div className="mb-8">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.4em] text-[#f6b980]">
                  Reso Music
                </p>

                <h1 className="text-4xl font-bold text-white">Login</h1>

                <p className="mt-3 text-sm text-[#d9d5cf]">
                  Login to continue your music journey.
                </p>
              </div>

              { authNotice && (
                <div className="mb-5 rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                  { authNotice }
                </div>
              ) }

              { error && (
                <div className="mb-5 rounded-xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  { error }
                </div>
              ) }

              <form onSubmit={ handleSubmit } className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#efe7dc]">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="Email"
                    value={ email }
                    onChange={ (event) => setEmail(event.target.value) }
                    className="w-full rounded-xl border border-white/10 bg-white/95 px-3 py-3 text-[#1e1f2b] outline-none transition placeholder:text-[#aaa1b8] focus:border-[#f6b980] focus:ring-4 focus:ring-[#f6b980]/25"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#efe7dc]">
                    Password
                  </label>
                  <input
                    type="password"
                    placeholder="Password"
                    value={ password }
                    onChange={ (event) => setPassword(event.target.value) }
                    className="w-full rounded-xl border border-white/10 bg-white/95 px-3 py-3 text-[#1e1f2b] outline-none transition placeholder:text-[#aaa1b8] focus:border-[#f6b980] focus:ring-4 focus:ring-[#f6b980]/25"
                  />
                </div>

                <button
                  type="submit"
                  disabled={ loading }
                  className="w-full rounded-xl bg-gradient-to-r from-[#f6b980] px-6 py-3.5 text-base font-semibold text-white shadow-[0_18px_45px_rgba(246,185,128,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(124,108,255,0.35)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  { loading ? "Signing in..." : "Sign In" }
                </button>
              </form>

              <p className="mt-7 text-center text-sm text-[#d9d5cf]">
                Don&apos;t have an account?{ " " }
                <button
                  type="button"
                  onClick={ () => navigate("/register") }
                  className="font-semibold text-[#f6b980] hover:text-white"
                >
                  Create one
                </button>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default LoginPage;