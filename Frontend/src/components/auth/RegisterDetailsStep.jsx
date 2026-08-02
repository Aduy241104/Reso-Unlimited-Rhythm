import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Eye,
  EyeOff,
  LockKeyhole,
  Loader2,
  Mail,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import systemLogo from "../../assets/images/ChatGPT Image 13_16_10 4 thg 5, 2026.png";
import { routePaths } from "../../routes/routePaths";
import { USER_INPUT_LIMITS } from "../../constants/userInputLimits";
import AuthCard from "./AuthCard";
import AuthField from "./AuthField";

const RegisterDetailsStep = ({
  form,
  onSubmit,
  onInvalidSubmit,
  apiError,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;
  return (
    <AuthCard
      title="Đăng ký tài khoản"
      className="w-full rounded-[18px] border border-white bg-white px-4 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:px-6 sm:py-5 lg:px-7 lg:py-6"
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
        <div className="space-y-3 text-center">
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <div className="h-px flex-1 bg-slate-200" />
            <span>hoặc</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <p className="text-sm text-slate-500">
            Đã có tài khoản?{" "}
            <Link className="font-semibold text-slate-950" to={routePaths.login}>
              Đăng nhập
            </Link>
          </p>
        </div>
      }
    >
      <form noValidate onSubmit={handleSubmit(onSubmit, onInvalidSubmit)}>
        {apiError ? (
          <div className="mb-3.5 rounded-[14px] border border-rose-200 bg-white px-4 py-3 text-sm text-rose-700">
            {apiError}
          </div>
        ) : null}

        <div className="space-y-3.5">
          <AuthField
            label="Họ và tên"
            maxLength={USER_INPUT_LIMITS.fullName}
            labelClassName="text-sm font-medium normal-case tracking-normal text-slate-700"
            placeholder="Nguyễn Văn A"
            autoComplete="name"
            error={errors.fullName?.message}
            startAdornment={<UserRound className="h-4 w-4" />}
            inputClassName="min-h-[46px] rounded-[14px] border-slate-200 bg-white shadow-none"
            {...register("fullName")}
          />

          <AuthField
            label="Email"
            maxLength={USER_INPUT_LIMITS.email}
            labelClassName="text-sm font-medium normal-case tracking-normal text-slate-700"
            type="email"
            placeholder="tenban@example.com"
            autoComplete="email"
            error={errors.email?.message}
            startAdornment={<Mail className="h-4 w-4" />}
            inputClassName="min-h-[46px] rounded-[14px] border-slate-200 bg-white shadow-none"
            {...register("email")}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <AuthField
              as="select"
              label="Giới tính"
              labelClassName="text-sm font-medium normal-case tracking-normal text-slate-700"
              error={errors.gender?.message}
              startAdornment={<UserRound className="h-4 w-4" />}
              endAdornment={<ChevronDown className="h-4 w-4" />}
              inputClassName="min-h-[46px] appearance-none rounded-[14px] border-slate-200 bg-white shadow-none"
              {...register("gender")}
            >
              <option value="prefer_not_to_say">Không muốn tiết lộ</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
            </AuthField>

            <AuthField
              label="Ngày sinh"
              labelClassName="text-sm font-medium normal-case tracking-normal text-slate-700"
              type="date"
              error={errors.dateOfBirth?.message}
              startAdornment={<CalendarDays className="h-4 w-4" />}
              inputClassName="min-h-[46px] rounded-[14px] border-slate-200 bg-white shadow-none"
              onClick={(event) => event.currentTarget.showPicker?.()}
              onFocus={(event) => event.currentTarget.showPicker?.()}
              {...register("dateOfBirth")}
            />
          </div>

          <AuthField
            label="Mật khẩu"
            maxLength={USER_INPUT_LIMITS.registrationPassword}
            labelClassName="text-sm font-medium normal-case tracking-normal text-slate-700"
            type={showPassword ? "text" : "password"}
            placeholder="Tạo mật khẩu"
            autoComplete="new-password"
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
            maxLength={USER_INPUT_LIMITS.registrationPassword}
            labelClassName="text-sm font-medium normal-case tracking-normal text-slate-700"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Nhập lại mật khẩu"
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
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Đang gửi mã...
              </>
            ) : (
              <>
                Tiếp tục
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </AuthCard>
  );
};

export default RegisterDetailsStep;
