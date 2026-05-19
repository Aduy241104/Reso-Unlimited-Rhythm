import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  const [apiError, setApiError] = useState(
    token ? "" : "Reset password link is invalid."
  );

  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const handleResetPassword = async ({ password, confirmPassword }) => {
    if (!token) {
      setApiError("Reset password link is invalid.");
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
          message: detail.message || "Invalid value.",
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
    <main className="min-h-screen bg-[#0f0f14] bg-[radial-gradient(circle_at_top_left,_rgba(245,182,111,0.24),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(79,124,255,0.14),_transparent_26%),linear-gradient(135deg,_#0f0f14_0%,_#14131b_45%,_#0d1018_100%)] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.02fr_0.98fr]">
        <section>
          <div className="max-w-xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-[#f5b66f]">
              Reset Password
            </p>
            <h2 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Set a new password from the reset link in your email.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-[#d9d5cf]">
              This page reads the token from the reset URL and submits it to the
              backend reset-password endpoint without adding extra client-side
              fallback flow.
            </p>
          </div>
        </section>

        <div>
          <AuthCard
            theme="dark"
            title="Create new password"
            subtitle="Choose a new password that matches the backend password rules."
            footer={
              <span>
                Back to{" "}
                <Link className="font-semibold text-[#f5b66f]" to={routePaths.login}>
                  login
                </Link>
              </span>
            }
          >
            {apiError ? (
              <div className="mb-5 rounded-2xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {apiError}
              </div>
            ) : null}

            <form
              className="space-y-4"
              noValidate
              onSubmit={handleSubmit(handleResetPassword)}
            >
              <AuthField
                label="New password"
                theme="dark"
                type="password"
                placeholder="Enter new password"
                autoComplete="new-password"
                helperText="Backend requires 6 to 128 characters."
                error={errors.password?.message}
                {...register("password")}
              />

              <AuthField
                label="Confirm password"
                theme="dark"
                type="password"
                placeholder="Re-enter new password"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                {...register("confirmPassword")}
              />

              <button
                className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#f5b66f] via-[#d98235] to-[#17131a] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(245,158,66,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(245,158,66,0.22)] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isSubmitting || !token}
                type="submit"
              >
                {isSubmitting ? "Updating password..." : "Update password"}
              </button>
            </form>
          </AuthCard>
        </div>
      </div>
    </main>
  );
};

export default ResetPasswordPage;
