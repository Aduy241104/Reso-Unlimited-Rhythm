import { Link } from "react-router-dom";
import AuthCard from "./AuthCard";
import AuthField from "./AuthField";

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
      title="Xác minh OTP"
      subtitle={`Mã OTP đã được gửi đến ${email}. Nhập đúng 6 chữ số để hoàn tất đăng ký.`}
      footer={
        <span>
          Muốn đăng nhập thay vì đăng ký?{" "}
          <Link className="font-semibold text-cyan-700" to="/login">
            Đi tới đăng nhập
          </Link>
        </span>
      }
    >
      <div className="mb-5 rounded-2xl border border-cyan-100 bg-cyan-50/80 px-4 py-3 text-sm text-cyan-900">
        <p className="font-medium">Thông tin OTP</p>
        <p className="mt-1">
          Mã có hiệu lực trong khoảng {expiresInMinutes || 5} phút theo cấu hình
          BE.
        </p>
      </div>

      <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
        {apiError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {apiError}
          </div>
        ) : null}

        <AuthField
          label="Mã OTP"
          type="text"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          placeholder="123456"
          helperText="OTP gồm đúng 6 chữ số."
          error={errors.otp?.message}
          {...register("otp")}
        />

        <button
          className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Đang xác thực..." : "Hoàn tất đăng ký"}
        </button>
      </form>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          onClick={onEditDetails}
          type="button"
        >
          Chỉnh sửa thông tin
        </button>

        <button
          className="inline-flex items-center justify-center rounded-2xl border border-cyan-200 px-4 py-3 text-sm font-medium text-cyan-800 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          disabled={isResending || remainingSeconds > 0}
          onClick={onResendOtp}
          type="button"
        >
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
