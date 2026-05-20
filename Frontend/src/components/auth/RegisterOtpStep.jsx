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
    clearErrors,
    formState: { errors, isSubmitting },
  } = form;

  return (
    <AuthCard
      theme="dark"
      title="Verify OTP"
      subtitle={`We sent an OTP to ${email}. Enter the 6-digit code to complete your registration.`}
      footer={
        <span>
          Prefer to sign in instead?{" "}
          <Link className="font-semibold text-[#f5b66f]" to="/login">
            Go to login
          </Link>
        </span>
      }
    >
      <div className="mb-5 rounded-xl border border-sky-300/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
        <p className="font-medium">OTP information</p>
        <p className="mt-1">
          The code remains valid for about {expiresInMinutes || 5} minutes based
          on the backend configuration.
        </p>
      </div>

      <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
        {apiError ? (
          <div className="rounded-xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {apiError}
          </div>
        ) : null}

        <AuthField
          theme="dark"
          label="OTP code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          placeholder="123456"
          helperText="OTP must contain exactly 6 digits."
          error={errors.otp?.message}
          onFocus={() => clearErrors("otp")}
          {...register("otp")}
        />

        <button
          className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#f5b66f] via-[#d98235] to-[#17131a] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(245,158,66,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_46px_rgba(245,158,66,0.18)] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Verifying..." : "Complete registration"}
        </button>
      </form>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-[#efe7dc] transition hover:border-white/20 hover:bg-white/[0.06]"
          onClick={onEditDetails}
          type="button"
        >
          Edit details
        </button>

        <button
          className="inline-flex items-center justify-center rounded-xl border border-[#f5b66f]/25 bg-[#f5b66f]/8 px-4 py-3 text-sm font-medium text-[#f5b66f] transition hover:bg-[#f5b66f]/14 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-[#7c7680]"
          disabled={isResending || remainingSeconds > 0}
          onClick={onResendOtp}
          type="button"
        >
          {isResending
            ? "Resending OTP..."
            : remainingSeconds > 0
              ? `Retry in ${remainingSeconds}s`
              : "Resend OTP"}
        </button>
      </div>
    </AuthCard>
  );
};

export default RegisterOtpStep;
