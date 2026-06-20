import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import systemLogo from "../../assets/images/ChatGPT Image 13_16_10 4 thg 5, 2026.png";
import AuthCard from "../../components/auth/AuthCard";
import AuthField from "../../components/auth/AuthField";
import { routePaths } from "../../routes/routePaths";
import { forgotPasswordService } from "../../services/authService";
import {
  applyApiFieldErrors,
  getResendAfterSecondsFromError,
} from "../../utils/apiError";
import { forgotPasswordSchema } from "./passwordRecoverySchema";

const ForgotPasswordPage = () => {
  const [apiError, setApiError] = useState("");
  const [apiMessage, setApiMessage] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [resultInfo, setResultInfo] = useState(null);

  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: {
      email: "",
    },
  });

  useEffect(() => {
    if (remainingSeconds <= 0) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((current) => (current > 1 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [remainingSeconds]);

  const startCooldown = (seconds) => {
    setRemainingSeconds(seconds > 0 ? seconds : 0);
  };

  const handleForgotPassword = async ({ email }) => {
    setApiError("");
    setApiMessage("");

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await forgotPasswordService({ email: normalizedEmail });
      const responseData = response?.data ?? null;

      setApiMessage(response?.message || "");
      setResultInfo({
        email: normalizedEmail,
        expiresInMinutes: responseData?.expiresInMinutes ?? null,
      });
      startCooldown(responseData?.resendAfterSeconds ?? 0);
    } catch (error) {
      const hasFieldErrors = applyApiFieldErrors({
        error,
        setError: form.setError,
      });

      if (!hasFieldErrors) {
        setApiError(error?.response?.data?.message || error?.message || "");
      }

      const resendAfterSeconds = getResendAfterSecondsFromError(error);
      if (resendAfterSeconds > 0) {
        startCooldown(resendAfterSeconds);
      }
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0a] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,_rgba(8,8,12,0.2)_0%,_rgba(8,8,12,0.66)_36%,_rgba(8,8,12,0.9)_66%,_rgba(8,8,12,1)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="pointer-events-none absolute left-[-7rem] top-[-8rem] h-[24rem] w-[24rem] rounded-full bg-[#ff9f43]/18 blur-[110px]" />
      <div className="pointer-events-none absolute left-[20%] top-[10%] h-[20rem] w-[20rem] rounded-full bg-[#ffd86b]/12 blur-[120px]" />
      <div className="pointer-events-none absolute right-[14%] top-[-5rem] h-[21rem] w-[21rem] rounded-full bg-[#ff4fb3]/12 blur-[120px]" />
      <div className="pointer-events-none absolute right-[-6rem] top-[28%] h-[24rem] w-[24rem] rounded-full bg-[#6f5bff]/14 blur-[130px]" />
      <div className="pointer-events-none absolute bottom-[-7rem] left-[30%] h-[20rem] w-[20rem] rounded-full bg-[#3f7cff]/10 blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,_rgba(255,188,102,0.16),_transparent_24%),radial-gradient(circle_at_64%_18%,_rgba(255,82,168,0.15),_transparent_22%),radial-gradient(circle_at_78%_40%,_rgba(111,91,255,0.18),_transparent_24%),radial-gradient(circle_at_46%_82%,_rgba(70,140,255,0.12),_transparent_22%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.03)_0%,_rgba(10,10,10,0)_16%,_rgba(10,10,10,0.24)_100%)]" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="w-full max-w-[30rem]">
          <AuthCard
            title="Quên mật khẩu"
            subtitle="Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu."
            className="rounded-[18px] border border-white bg-white px-4 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:px-6 sm:py-5"
            headerClassName="mb-5 text-center [&_.auth-card-divider]:mx-auto [&_.auth-card-subtitle]:mx-auto"
            headerContent={
              <div className="flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[14px] border border-slate-200 bg-[#f8f8fb] shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
                  <img
                    src={systemLogo}
                    alt="Reso Unlimited Rhythm logo"
                    className="h-9 w-9 object-contain"
                  />
                </div>
              </div>
            }
            footerClassName="mt-4"
            footer={
              <p className="text-center text-sm text-slate-500">
                Quay lại{" "}
                <Link className="font-semibold text-slate-950" to={routePaths.login}>
                  đăng nhập
                </Link>
              </p>
            }
          >
            {apiMessage ? (
              <div className="mb-3.5 rounded-[14px] border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-700">
                <p className="font-medium">{apiMessage}</p>
                {resultInfo?.email ? (
                  <p className="mt-1">
                    Email: {resultInfo.email}
                    {resultInfo.expiresInMinutes
                      ? ` | Hiệu lực trong ${resultInfo.expiresInMinutes} phút`
                      : ""}
                  </p>
                ) : null}
              </div>
            ) : null}

            {apiError ? (
              <div className="mb-3.5 rounded-[14px] border border-rose-200 bg-white px-4 py-3 text-sm text-rose-700">
                {apiError}
              </div>
            ) : null}

            <form noValidate onSubmit={handleSubmit(handleForgotPassword)}>
              <div className="space-y-3.5">
                <AuthField
                  label="Email"
                  labelClassName="text-sm font-medium normal-case tracking-normal text-slate-700"
                  type="email"
                  placeholder="tenban@example.com"
                  autoComplete="email"
                  error={errors.email?.message}
                  startAdornment={<Mail className="h-4 w-4" />}
                  inputClassName="min-h-[46px] rounded-[14px] border-slate-200 bg-white shadow-none"
                  {...register("email")}
                />

                <button
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(180deg,_#111827_0%,_#0f172a_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(15,23,42,0.2)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isSubmitting || remainingSeconds > 0}
                  type="submit"
                >
                  {isSubmitting
                    ? "Đang gửi liên kết..."
                    : remainingSeconds > 0
                      ? `Thử lại sau ${remainingSeconds}s`
                      : "Gửi liên kết đặt lại mật khẩu"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          </AuthCard>
        </div>
      </section>
    </main>
  );
};

export default ForgotPasswordPage;
