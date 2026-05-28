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
      theme="dark"
      title="Verify your email"
      subtitle={`We sent a one-time code to ${email}. Enter it below to complete your registration.`}
      className="rounded-[28px] border-white/8 bg-[#11161d]/90"
      headerClassName="mb-6"
      footerClassName="mt-6"
      footer={
        <span>
          Already have an account?{" "}
          <Link className="font-semibold text-[#f5b66f]" to="/login">
            Sign in
          </Link>
        </span>
      }
    >
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-[#ddd7cf]">
        <p className="font-medium text-white">Code sent to</p>
        <p className="mt-1 break-all text-[#f5b66f]">{email}</p>
        <p className="mt-3 text-[#bdb6ad]">
          The code stays valid for about {expiresInMinutes || 5} minutes.
        </p>
      </div>

      <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
        {apiError ? (
          <div className="rounded-2xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
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
          error={errors.otp?.message}
          inputClassName="min-h-[56px] rounded-2xl border-white/10 bg-[#f7f4ef] text-center text-lg font-semibold tracking-[0.35em] shadow-none"
          {...register("otp")}
        />

        <button
          className="inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-[#f5b66f] px-4 py-3 text-sm font-semibold text-[#15181d] transition hover:bg-[#f7c789] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Verifying..." : "Create account"}
        </button>
      </form>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-[#efe7dc] transition hover:border-white/20 hover:bg-white/[0.06]"
          onClick={onEditDetails}
          type="button"
        >
          Edit details
        </button>

        <button
          className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-[#f5b66f]/25 bg-[#f5b66f]/8 px-4 py-3 text-sm font-medium text-[#f5b66f] transition hover:bg-[#f5b66f]/14 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-[#7c7680]"
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
