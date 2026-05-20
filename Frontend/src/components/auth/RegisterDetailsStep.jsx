import { Link } from "react-router-dom";
import AuthCard from "./AuthCard";
import AuthField from "./AuthField";

const MAX_BIRTH_DATE = new Date().toISOString().split("T")[0];

const RegisterDetailsStep = ({
  form,
  onSubmit,
  apiError,
  countryOptions,
  isCountriesLoading,
  countriesError,
  onRetryCountries,
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
      title="Create your account"
      subtitle="Pick your profile details and request the verification OTP in one step."
      className="w-full"
      headerClassName="mb-4"
      footerClassName="mt-4"
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
        className="grid gap-4 sm:grid-cols-2"
        noValidate
        onSubmit={handleSubmit(onSubmit)}
      >
        {apiError ? (
          <div className="rounded-xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100 sm:col-span-2">
            {apiError}
          </div>
        ) : null}

        <AuthField
          theme="dark"
          label="Full name"
          placeholder="Nguyen Van A"
          autoComplete="name"
          error={errors.fullName?.message}
          onFocus={() => clearErrors("fullName")}
          inputClassName="shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
          {...register("fullName")}
        />

        <AuthField
          theme="dark"
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          onFocus={() => clearErrors("email")}
          inputClassName="shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
          {...register("email")}
        />

        <AuthField
          as="select"
          theme="dark"
          label="Country"
          disabled={isCountriesLoading || Boolean(countriesError)}
          error={errors.country?.message}
          helperText={
            countriesError
              ? "Country list could not be loaded."
              : isCountriesLoading
                ? "Loading countries..."
                : "Choose the country you currently live in."
          }
          onFocus={() => clearErrors("country")}
          inputClassName="shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
          {...register("country")}
        >
          <option value="">
            {isCountriesLoading
              ? "Loading countries..."
              : countriesError
                ? "Unable to load countries"
                : "Select a country"}
          </option>
          {countryOptions.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </AuthField>

        <AuthField
          as="select"
          theme="dark"
          label="Gender"
          error={errors.gender?.message}
          onFocus={() => clearErrors("gender")}
          inputClassName="shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
          {...register("gender")}
        >
          <option value="prefer_not_to_say">Prefer not to say</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </AuthField>

        <label className="block sm:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#bdb3c3]">
              Date of birth
            </span>
            <span className="rounded-md border border-[#f5b66f]/20 bg-[#f5b66f]/8 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f5b66f]">
              Calendar
            </span>
          </div>
          <div
            className={`group relative overflow-hidden rounded-xl border p-3 transition ${
              errors.dateOfBirth?.message
                ? "border-rose-300/60 bg-rose-400/8"
                : "border-white/10 bg-[linear-gradient(135deg,_rgba(255,255,255,0.05),_rgba(255,255,255,0.02))]"
            }`}
          >
            <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-white/10" />
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#19161f] text-[#f5b66f]">
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M8 3v3M16 3v3M4 9h16M6 5h12a1 1 0 0 1 1 1v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  Choose from the date picker
                </p>
                <p className="text-xs text-[#a8a0aa]">
                  Select a date no later than today.
                </p>
              </div>
            </div>
            <input
              {...register("dateOfBirth")}
              aria-invalid={Boolean(errors.dateOfBirth?.message)}
              className={`w-full rounded-lg border bg-[#f4efe8] px-3.5 py-3 text-sm text-[#17131a] outline-none transition ${
                errors.dateOfBirth?.message
                  ? "border-rose-300/70 ring-4 ring-rose-500/10"
                  : "border-white/10 focus:border-[#f5b66f] focus:bg-[#fcfaf8] focus:ring-4 focus:ring-[#f5b66f]/14"
              }`}
              max={MAX_BIRTH_DATE}
              onClick={(event) => event.currentTarget.showPicker?.()}
              onFocus={(event) => {
                clearErrors("dateOfBirth");
                event.currentTarget.showPicker?.();
              }}
              type="date"
            />
          </div>
          {errors.dateOfBirth?.message ? (
            <span className="mt-2 block text-sm text-rose-300">
              {errors.dateOfBirth.message}
            </span>
          ) : null}
        </label>

        {countriesError ? (
          <div className="sm:col-span-2">
            <button
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-[#efe7dc] transition hover:border-white/20 hover:bg-white/[0.06]"
              onClick={onRetryCountries}
              type="button"
            >
              Retry country list
            </button>
          </div>
        ) : null}

        <AuthField
          theme="dark"
          label="Password"
          type="password"
          placeholder="Enter your password"
          autoComplete="new-password"
          helperText="8-33 chars with uppercase, lowercase, number, and special character."
          error={errors.password?.message}
          onFocus={() => clearErrors("password")}
          inputClassName="shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
          {...register("password")}
        />

        <AuthField
          theme="dark"
          label="Confirm password"
          type="password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          onFocus={() => clearErrors("confirmPassword")}
          inputClassName="shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
          {...register("confirmPassword")}
        />

        <button
          className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#f5b66f] via-[#d98235] to-[#17131a] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(245,158,66,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_46px_rgba(245,158,66,0.18)] disabled:cursor-not-allowed disabled:opacity-70 sm:col-span-2"
          disabled={isSubmitting || isCountriesLoading || Boolean(countriesError)}
          type="submit"
        >
          {isSubmitting ? "Sending OTP..." : "Send OTP"}
        </button>
      </form>
    </AuthCard>
  );
};

export default RegisterDetailsStep;
