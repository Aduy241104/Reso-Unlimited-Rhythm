import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import AuthCard from "../../components/auth/AuthCard";
import AuthField from "../../components/auth/AuthField";
import { routePaths } from "../../routes/routePaths";
import { forgotPasswordService } from "../../services/authService";
import {
  applyApiFieldErrors,
  getResendAfterSecondsFromError,
} from "../../utils/apiError";
import { forgotPasswordSchema } from "./passwordRecoverySchema";

const getCooldownDeadline = (seconds) => Date.now() + seconds * 1000;

const ForgotPasswordPage = () => {
  const [apiError, setApiError] = useState("");
  const [apiMessage, setApiMessage] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(null);
  const [resultInfo, setResultInfo] = useState(null);

  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
    },
  });

  useEffect(() => {
    if (!cooldownUntil) {
      return undefined;
    }

    const updateRemainingSeconds = () => {
      const nextRemainingSeconds = Math.max(
        0,
        Math.ceil((cooldownUntil - Date.now()) / 1000)
      );

      setRemainingSeconds(nextRemainingSeconds);

      if (nextRemainingSeconds === 0) {
        setCooldownUntil(null);
      }
    };

    const intervalId = window.setInterval(updateRemainingSeconds, 1000);

    return () => window.clearInterval(intervalId);
  }, [cooldownUntil]);

  const startCooldown = (seconds) => {
    if (!seconds) {
      setCooldownUntil(null);
      setRemainingSeconds(0);
      return;
    }

    setRemainingSeconds(seconds);
    setCooldownUntil(getCooldownDeadline(seconds));
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
    <main className="min-h-screen bg-[#0f0f14] bg-[radial-gradient(circle_at_top_left,_rgba(245,182,111,0.24),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(79,124,255,0.14),_transparent_26%),linear-gradient(135deg,_#0f0f14_0%,_#14131b_45%,_#0d1018_100%)] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.02fr_0.98fr]">
        <section>
          <div className="max-w-xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-[#f5b66f]">
              Khôi phục mật khẩu
            </p>
            <h2 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Yêu cầu liên kết đặt lại mật khẩu.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-[#d9d5cf]">
              Biểu mẫu này gửi email của bạn đến API quên mật khẩu và hiển thị phản hồi cùng thời gian chờ trả về từ hệ thống.
            </p>
          </div>
        </section>

        <div>
          <AuthCard
            theme="dark"
            title="Quên mật khẩu"
            subtitle="Nhập email tài khoản để nhận liên kết đặt lại mật khẩu."
            footer={
              <span>
                Quay lại{" "}
                <Link className="font-semibold text-[#f5b66f]" to={routePaths.login}>
                  đăng nhập
                </Link>
              </span>
            }
          >
            {apiMessage ? (
              <div className="mb-5 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                <p className="font-medium">{apiMessage}</p>
                {resultInfo?.email ? (
                  <p className="mt-1">
                    Email: {resultInfo.email}
                    {resultInfo.expiresInMinutes
                      ? ` | Hết hạn sau ${resultInfo.expiresInMinutes} phút`
                      : ""}
                  </p>
                ) : null}
              </div>
            ) : null}

            {apiError ? (
              <div className="mb-5 rounded-2xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {apiError}
              </div>
            ) : null}

            <form
              className="space-y-4"
              noValidate
              onSubmit={handleSubmit(handleForgotPassword)}
            >
              <AuthField
                label="Email"
                theme="dark"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                error={errors.email?.message}
                {...register("email")}
              />

              <button
                className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#f5b66f] via-[#d98235] to-[#17131a] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(245,158,66,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(245,158,66,0.22)] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isSubmitting || remainingSeconds > 0}
                type="submit"
              >
                {isSubmitting
                  ? "Đang gửi liên kết đặt lại..."
                  : remainingSeconds > 0
                    ? `Thử lại sau ${remainingSeconds}s`
                    : "Gửi liên kết đặt lại"}
              </button>
            </form>
          </AuthCard>
        </div>
      </div>
    </main>
  );
};

export default ForgotPasswordPage;
