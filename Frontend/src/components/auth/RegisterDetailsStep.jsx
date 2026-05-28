import { Link } from "react-router-dom";
import AuthCard from "./AuthCard";
import AuthField from "./AuthField";

const MAX_BIRTH_DATE = new Date().toISOString().split("T")[0];

const RegisterDetailsStep = ({
  form,
  onSubmit,
  onInvalidSubmit,
  apiError,
  validationError,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;
  const validationMessages = Object.values(errors)
    .map((error) => error?.message)
    .filter(Boolean);

  return (
    <AuthCard
      theme="dark"
      title="Account details"
      subtitle="Enter your core information and we will send a verification code to your email."
      className="w-full rounded-[28px] border-white/8 bg-[#11161d]/90"
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
      <form
        className="grid gap-5 sm:grid-cols-2"
        noValidate
        onSubmit={handleSubmit(onSubmit, onInvalidSubmit)}
      >
        {apiError ? (
          <div className="rounded-2xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100 sm:col-span-2">
            {apiError}
          </div>
        ) : null}

        {!apiError && validationError ? (
          <div className="rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100 sm:col-span-2">
            <p className="font-medium">{validationError}</p>
            {validationMessages.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {validationMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <AuthField
          theme="dark"
          label="Full name"
          placeholder="Nguyen Van A"
          autoComplete="name"
          error={errors.fullName?.message}
          inputClassName="min-h-[50px] rounded-2xl border-white/10 bg-[#f7f4ef] shadow-none"
          {...register("fullName")}
        />

        <AuthField
          theme="dark"
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          inputClassName="min-h-[50px] rounded-2xl border-white/10 bg-[#f7f4ef] shadow-none"
          {...register("email")}
        />

        <AuthField
          as="select"
          theme="dark"
          label="Gender"
          error={errors.gender?.message}
          inputClassName="min-h-[50px] rounded-2xl border-white/10 bg-[#f7f4ef] shadow-none"
          {...register("gender")}
        >
          <option value="prefer_not_to_say">Prefer not to say</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </AuthField>

        <AuthField
          theme="dark"
          className="sm:col-span-2"
          label="Date of birth"
          type="date"
          error={errors.dateOfBirth?.message}
          inputClassName="min-h-[50px] rounded-2xl border-white/10 bg-[#f7f4ef] shadow-none"
          max={MAX_BIRTH_DATE}
          onClick={(event) => event.currentTarget.showPicker?.()}
          onFocus={(event) => event.currentTarget.showPicker?.()}
          {...register("dateOfBirth")}
        />

        <AuthField
          theme="dark"
          label="Password"
          type="password"
          placeholder="Create a password"
          autoComplete="new-password"
          error={errors.password?.message}
          inputClassName="min-h-[50px] rounded-2xl border-white/10 bg-[#f7f4ef] shadow-none"
          {...register("password")}
        />

        <AuthField
          theme="dark"
          label="Confirm password"
          type="password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          inputClassName="min-h-[50px] rounded-2xl border-white/10 bg-[#f7f4ef] shadow-none"
          {...register("confirmPassword")}
        />

        <button
          className="inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-[#f5b66f] px-4 py-3 text-sm font-semibold text-[#15181d] transition hover:bg-[#f7c789] disabled:cursor-not-allowed disabled:opacity-70 sm:col-span-2"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Sending code..." : "Continue"}
        </button>
      </form>
    </AuthCard>
  );
};

export default RegisterDetailsStep;
