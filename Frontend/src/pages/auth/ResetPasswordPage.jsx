import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import systemLogo from "../../assets/images/ChatGPT Image 13_16_10 4 thg 5, 2026.png";
import AuthCard from "../../components/auth/AuthCard";
import AuthField from "../../components/auth/AuthField";
import { routePaths } from "../../routes/routePaths";
import { resetPasswordService } from "../../services/authService";
import { resetPasswordSchema } from "./passwordRecoverySchema";

const getNormalizedErrorDetails = (error) => {
  const details = error?.response?.data?.errors;

  if (Array.isArray(details)) {
    return details;
  }

  if (details?.field && details?.message) {
    return [details];
  }

  return [];
};

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [apiError, setApiError] = useState(
    token ? "" : "Liên kết đặt lại mật khẩu không hợp lệ."
  );

  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const handleResetPassword = async ({ password, confirmPassword }) => {
    if (!token) {
      setApiError("Liên kết đặt lại mật khẩu không hợp lệ.");
      return;
    }

    setApiError("");

    try {
      const response = await resetPasswordService({
        token,
        password,
        confirmPassword,
      });

      navigate(routePaths.login, {
        replace: true,
        state: {
          authNotice: response?.message || "",
        },
      });
    } catch (error) {
      const details = getNormalizedErrorDetails(error);
      let hasRenderableFieldError = false;

      details.forEach((detail) => {
        if (detail.field !== "password" && detail.field !== "confirmPassword") {
          return;
        }

        form.setError(detail.field, {
          type: "server",
          message: detail.message || "Giá trị không hợp lệ.",
        });
        hasRenderableFieldError = true;
      });

      if (!hasRenderableFieldError) {
        setApiError(error?.response?.data?.message || error?.message || "");
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
            title="Đặt lại mật khẩu"
            subtitle="Tạo mật khẩu mới để tiếp tục đăng nhập vào hệ thống."
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
            {apiError ? (
              <div className="mb-3.5 rounded-[14px] border border-rose-200 bg-white px-4 py-3 text-sm text-rose-700">
                {apiError}
              </div>
            ) : null}

            <form noValidate onSubmit={handleSubmit(handleResetPassword)}>
              <div className="space-y-3.5">
                <AuthField
                  label="Mật khẩu mới"
                  labelClassName="text-sm font-medium normal-case tracking-normal text-slate-700"
                  type={showPassword ? "text" : "password"}
                  placeholder="Nhập mật khẩu mới"
                  autoComplete="new-password"
                  helperText="Mật khẩu cần có từ 6 đến 128 ký tự."
                  error={errors.password?.message}
                  startAdornment={<LockKeyhole className="h-4 w-4" />}
                  endAdornment={
                    <button
                      className="rounded-full p-1 text-slate-400 transition hover:text-slate-700"
                      onClick={() => setShowPassword((current) => !current)}
                      type="button"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                  inputClassName="min-h-[46px] rounded-[14px] border-slate-200 bg-white shadow-none"
                  {...register("password")}
                />

                <AuthField
                  label="Xác nhận mật khẩu"
                  labelClassName="text-sm font-medium normal-case tracking-normal text-slate-700"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Nhập lại mật khẩu mới"
                  autoComplete="new-password"
                  error={errors.confirmPassword?.message}
                  startAdornment={<LockKeyhole className="h-4 w-4" />}
                  endAdornment={
                    <button
                      className="rounded-full p-1 text-slate-400 transition hover:text-slate-700"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      type="button"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                  inputClassName="min-h-[46px] rounded-[14px] border-slate-200 bg-white shadow-none"
                  {...register("confirmPassword")}
                />

                <button
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(180deg,_#111827_0%,_#0f172a_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(15,23,42,0.2)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isSubmitting || !token}
                  type="submit"
                >
                  {isSubmitting ? "Đang cập nhật mật khẩu..." : "Cập nhật mật khẩu"}
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

export default ResetPasswordPage;
