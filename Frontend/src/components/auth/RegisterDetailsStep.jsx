import { Link } from "react-router-dom";
import AuthCard from "./AuthCard";
import AuthField from "./AuthField";

const RegisterDetailsStep = ({ form, onSubmit, apiError }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  return (
    <AuthCard
      theme="dark"
      title="Create your account"
      subtitle="Enter your basic information to request a verification OTP. Your password stays in the backend registration flow until email verification is completed."
      footer={
        <span>
          Already have an account?{" "}
          <Link className="font-semibold text-[#f5b66f]" to="/login">
            Sign in
          </Link>
        </span>
      }
    >
      <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
        {apiError ? (
          <div className="rounded-2xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {apiError}
          </div>
        ) : null}

        <AuthField
          theme="dark"
          label="Full name"
          placeholder="Nguyen Van A"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register("fullName")}
        />

        <AuthField
          theme="dark"
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />

        <AuthField
          theme="dark"
          label="Password"
          type="password"
          placeholder="Enter your password"
          autoComplete="new-password"
          helperText="Backend currently requires at least 6 characters."
          error={errors.password?.message}
          {...register("password")}
        />

        <AuthField
          theme="dark"
          label="Confirm password"
          type="password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <button
          className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#f5b66f] via-[#d98235] to-[#17131a] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(245,158,66,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(245,158,66,0.22)] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Sending OTP..." : "Send OTP"}
        </button>
      </form>
    </AuthCard>
  );
};

export default RegisterDetailsStep;
