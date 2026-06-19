import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import GoogleLoginButton from "../../components/auth/GoogleLoginButton";
import { useAuth } from "../../hooks/useAuth";
import loginBg from "../../assets/images/ChatGPT Image 10_35_18 29 thg 4, 2026.png";
import { routePaths } from "../../routes/routePaths";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const authNotice = location.state?.authNotice || "";
  const from = location.state?.from?.pathname || "/";
  const waveBars = [
    { height: 8, color: "bg-[#f5b66f]" },
    { height: 12, color: "bg-[#f5b66f]" },
    { height: 18, color: "bg-[#ff9f43]" },
    { height: 28, color: "bg-[#ff9f43]" },
    { height: 40, color: "bg-[#f5b66f]" },
    { height: 28, color: "bg-[#d98235]" },
    { height: 18, color: "bg-[#f5b66f]" },
    { height: 12, color: "bg-[#d98235]" },
    { height: 8, color: "bg-[#f5b66f]" },
    { height: 6, color: "bg-white/35" },
    { height: 8, color: "bg-white/35" },
    { height: 10, color: "bg-white/35" },
    { height: 8, color: "bg-[#9b6cff]" },
    { height: 12, color: "bg-[#9b6cff]" },
    { height: 18, color: "bg-[#9b6cff]" },
    { height: 34, color: "bg-[#4f7cff]" },
    { height: 22, color: "bg-[#4f7cff]" },
    { height: 12, color: "bg-[#4f7cff]" },
    { height: 6, color: "bg-[#4f7cff]" },
  ];

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Đăng nhập thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (token) => {
    setError("");
    setLoading(true);

    try {
      await googleLogin(token);
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Đăng nhập Google thất bại."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0f0f14] text-white">
      <img
        src={ loginBg }
        alt="Hình nền đăng nhập"
        className="pointer-events-none absolute inset-y-0 left-[-12rem] hidden h-full w-[46rem] max-w-none object-cover object-left opacity-30 saturate-[0.85] lg:block xl:left-[-10rem] xl:w-[54rem]"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_left,_rgba(245,182,111,0.32),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(79,124,255,0.08),_transparent_24%),linear-gradient(110deg,_rgba(15,15,20,0.16)_0%,_rgba(15,15,20,0.65)_36%,_rgba(15,15,20,0.92)_64%,_rgba(15,15,20,1)_100%)]" />
      <div className="pointer-events-none absolute inset-y-0 left-[-10%] w-[38rem] rounded-full bg-[#ff9f43]/18 blur-[130px]" />
      <div className="pointer-events-none absolute bottom-[-10rem] right-[-8rem] h-[22rem] w-[22rem] rounded-full bg-[#9b6cff]/8 blur-[140px]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.02)_0%,_rgba(15,15,20,0)_18%,_rgba(15,15,20,0.2)_100%)]" />

      <section className="relative z-10 flex min-h-screen items-center px-4 py-6 sm:px-6 sm:py-8 lg:px-10 xl:px-16">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(380px,430px)] lg:gap-12">
          <div className="hidden min-h-[640px] items-center lg:flex">
            <div className="max-w-[34rem] pl-2 xl:pl-8">
              <div className="inline-flex items-center rounded-full border border-[#f5b66f]/20 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#f5b66f]/90 shadow-[0_10px_35px_rgba(245,182,111,0.12)] backdrop-blur-md">
                Không gian âm nhạc
              </div>

              <div className="mt-8 space-y-3">
                <h1 className="font-title text-6xl font-black uppercase leading-[0.92] text-white xl:text-7xl">
                  <span className="block">Cảm Nhận</span>
                  <span className="block bg-gradient-to-r from-[#ff9f43] via-[#f5b66f] to-[#9b6cff] bg-clip-text text-transparent">
                    Nhịp Điệu
                  </span>
                </h1>

                <div className="h-px w-14 bg-gradient-to-r from-[#f5b66f] to-[#d98235]" />

                <p className="max-w-md text-xl leading-relaxed text-[#ece4da]">
                  Âm nhạc là tiếng nói của tâm hồn.
                </p>
              </div>

              <div className="mt-10">
                <div
                  aria-hidden="true"
                  className="flex h-14 items-center gap-1 rounded-full border border-white/5 bg-white/[0.03] px-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm"
                >
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#f5b66f]/75 to-transparent" />
                  <div className="flex items-end gap-1 px-3">
                    { waveBars.map((bar, index) => (
                      <span
                        key={ `${bar.height}-${index}` }
                        className={ `block w-[3px] rounded-full shadow-[0_0_14px_rgba(245,182,111,0.28)] ${bar.color}` }
                        style={{ height: `${bar.height}px` }}
                      />
                    )) }
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#4f7cff]/40 to-transparent" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="relative w-full max-w-md overflow-hidden rounded-[12px] border border-[#f5b66f]/20 bg-white p-6 shadow-[0_30px_100px_rgba(245,158,66,0.18)] backdrop-blur-xl sm:p-8">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,_rgba(255,255,255,0.06)_0%,_rgba(255,255,255,0.015)_26%,_rgba(255,255,255,0.03)_100%)]" />
              <div className="pointer-events-none absolute left-[-3rem] top-[-3rem] h-28 w-28 rounded-full bg-[#ff9f43]/12 blur-3xl" />
              <div className="pointer-events-none absolute bottom-[-4rem] right-[-3rem] h-24 w-24 rounded-full bg-[#9b6cff]/10 blur-3xl" />

              <div className="relative">
                <div className="mb-8">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.4em] text-[#f5b66f]">
                    Reso Music
                  </p>

                  <h1 className="font-title text-4xl font-black text-black">Đăng nhập</h1>

                  <p className="mt-3 text-sm leading-6 text-black">
                    Đăng nhập để tiếp tục hành trình âm nhạc của bạn.
                  </p>
                </div>

                { authNotice && (
                  <div className="mb-5 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100 shadow-[0_10px_30px_rgba(52,211,153,0.08)]">
                    { authNotice }
                  </div>
                ) }

                { error && (
                  <div className="mb-5 rounded-2xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100 shadow-[0_10px_30px_rgba(251,113,133,0.08)]">
                    { error }
                  </div>
                ) }

                <form onSubmit={ handleSubmit } className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-black">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="Email"
                      value={ email }
                      onChange={ (event) => setEmail(event.target.value) }
                      disabled={ loading }
                      className="w-full rounded-full border border-black bg-[#f5f5f5] px-4 py-3 text-[#1a1820] outline-none transition placeholder:text-[#9a8fa8] focus:border-[#f5b66f] focus:ring-4 focus:ring-[#f5b66f]/20"
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="block text-sm font-semibold text-black">
                        Mật khẩu
                      </label>
                    </div>
                    <input
                      type="password"
                      placeholder="Mật khẩu"
                      value={ password }
                      onChange={ (event) => setPassword(event.target.value) }
                      disabled={ loading }
                      className="w-full rounded-full border border-black bg-[#f5f5f5] px-4 py-3 text-[#1a1820] outline-none transition placeholder:text-[#9a8fa8] focus:border-[#f5b66f] focus:ring-4 focus:ring-[#f5b66f]/20"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={ loading }
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#f5b66f] via-[#d98235] to-[#17131a] px-6 py-3.5 text-base font-semibold text-white shadow-[0_18px_45px_rgba(245,158,66,0.28)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(245,158,66,0.26)] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    { loading ? "Đang đăng nhập..." : "Đăng nhập" }
                  </button>
                </form>

                <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#6b6573]">
                  <div className="h-px flex-1 bg-black/10" />
                  <span>Hoặc tiếp tục với</span>
                  <div className="h-px flex-1 bg-black/10" />
                </div>

                <GoogleLoginButton
                  disabled={ loading }
                  onCredential={ handleGoogleLogin }
                />

                <p className="mt-7 text-center text-sm text-[#d9d5cf]">
                  Chưa có tài khoản?{ " " }
                  <button
                    type="button"
                    onClick={ () => navigate(routePaths.register) }
                    className="font-semibold text-black transition hover:text-[#ffd3a0]"
                  >
                    Tạo tài khoản
                  </button>
                  <br />
                  <button
                    type="button"
                    onClick={ () => navigate(routePaths.forgotPassword) }
                    className="text-xs font-semibold text-black transition hover:text-[#ffd3a0]"
                  >
                    Quên mật khẩu?
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default LoginPage;
