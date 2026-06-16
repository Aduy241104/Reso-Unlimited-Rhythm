import { ArrowRight, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import systemLogo from "../../assets/images/ChatGPT Image 13_16_10 4 thg 5, 2026.png";
import AuthCard from "./AuthCard";
import AuthField from "./AuthField";
import { routePaths } from "../../routes/routePaths";

const RegisterOtpStep = ({
  form,
  onSubmit,
  onEditDetails,
  onResendOtp,
  apiError,
  email,
  expiresInMinutes,
  remainingSeconds,
  isResending,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  return (
    <AuthCard
      title="Xác thực email"
      subtitle={`Chúng tôi đã gửi mã xác thực đến ${email}. Nhập mã bên dưới để hoàn tất đăng ký.`}
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
          Đã có tài khoản?{" "}
          <Link className="font-semibold text-slate-950" to={routePaths.login}>
            Đăng nhập
          </Link>
        </p>
      }
    >
      <div className="mb-4 rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <p className="font-medium text-slate-950">Mã đã được gửi tới</p>
        <p className="mt-1 break-all font-medium text-slate-950">{email}</p>
        <p className="mt-3 text-slate-500">
          Mã có hiệu lực trong khoảng {expiresInMinutes || 5} phút.
        </p>
      </div>

      <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
        {apiError ? (
          <div className="rounded-[14px] border border-rose-200 bg-white px-4 py-3 text-sm text-rose-700">
            {apiError}
          </div>
        ) : null}

        <AuthField
          label="Mã OTP"
          labelClassName="text-sm font-medium normal-case tracking-normal text-slate-700"
          type="text"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          placeholder="123456"
          error={errors.otp?.message}
          inputClassName="min-h-[46px] rounded-[14px] border-slate-200 bg-white text-center text-base font-semibold tracking-[0.3em] shadow-none"
          {...register("otp")}
        />

        <button
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(180deg,_#111827_0%,_#0f172a_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(15,23,42,0.2)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Đang xác thực..." : "Tạo tài khoản"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <button
          className="inline-flex min-h-[42px] items-center justify-center rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
          onClick={onEditDetails}
          type="button"
        >
          Sửa thông tin
        </button>

        <button
          className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
          disabled={isResending || remainingSeconds > 0}
          onClick={onResendOtp}
          type="button"
        >
          <RotateCcw className="h-4 w-4" />
          {isResending
            ? "Đang gửi lại OTP..."
            : remainingSeconds > 0
              ? `Gửi lại sau ${remainingSeconds}s`
              : "Gửi lại OTP"}
        </button>
      </div>
    </AuthCard>
  );
};

export default RegisterOtpStep;
