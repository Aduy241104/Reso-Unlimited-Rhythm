import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import RegisterDetailsStep from "../../components/auth/RegisterDetailsStep";
import RegisterOtpStep from "../../components/auth/RegisterOtpStep";
import {
  registerService,
  requestRegisterOtpService,
} from "../../services/authService";
import {
  applyApiFieldErrors,
  getApiErrorMessage,
  getResendAfterSecondsFromError,
} from "../../utils/apiError";
import { registerDetailsSchema, registerOtpSchema } from "./registerSchema";

const createOtpPayload = (values) => ({
  email: values.email.trim().toLowerCase(),
  password: values.password,
  fullName: values.fullName.trim(),
});

const registerHighlights = [
  {
    title: "Step 1",
    description: "Enter your name, email, and password to request a verification OTP.",
  },
  {
    title: "Step 2",
    description: "Use the 6-digit OTP that the backend sends to your email address.",
  },
  {
    title: "Step 3",
    description: "Finish registration and return to login as soon as verification succeeds.",
  },
];

const RegisterPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState("details");
  const [detailsApiError, setDetailsApiError] = useState("");
  const [otpApiError, setOtpApiError] = useState("");
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(null);
  const [pendingRegistration, setPendingRegistration] = useState(null);

  const detailsForm = useForm({
    resolver: zodResolver(registerDetailsSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const otpForm = useForm({
    resolver: zodResolver(registerOtpSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      otp: "",
    },
  });

  useEffect(() => {
    if (!cooldownUntil) {
      setRemainingSeconds(0);
      return undefined;
    }

    const updateRemainingSeconds = () => {
      const nextRemainingSeconds = Math.max(
        0,
        Math.ceil((cooldownUntil - Date.now()) / 1000)
      );

      setRemainingSeconds(nextRemainingSeconds);

      if (nextRemainingSeconds === 0) {
        setCooldownUntil(null);
      }
    };

    updateRemainingSeconds();

    const intervalId = window.setInterval(updateRemainingSeconds, 1000);

    return () => window.clearInterval(intervalId);
  }, [cooldownUntil]);

  const startOtpCooldown = (seconds) => {
    if (!seconds) {
      setCooldownUntil(null);
      setRemainingSeconds(0);
      return;
    }

    setCooldownUntil(Date.now() + seconds * 1000);
  };

  const handleSendOtp = async (values) => {
    setDetailsApiError("");
    setOtpApiError("");

    try {
      const payload = createOtpPayload(values);
      const result = await requestRegisterOtpService(payload);
      const normalizedEmail = result?.email || payload.email;

      detailsForm.setValue("email", normalizedEmail, {
        shouldDirty: true,
        shouldValidate: true,
      });
      otpForm.reset({ otp: "" });
      setPendingRegistration({
        ...payload,
        email: normalizedEmail,
        expiresInMinutes: result?.expiresInMinutes || 5,
      });
      startOtpCooldown(result?.resendAfterSeconds || 0);
      setStep("otp");
    } catch (error) {
      const hasFieldErrors = applyApiFieldErrors({
        error,
        setError: detailsForm.setError,
      });

      if (!hasFieldErrors) {
        setDetailsApiError(
          getApiErrorMessage(error, "Unable to send OTP. Please try again.")
        );
      }

      const resendAfterSeconds = getResendAfterSecondsFromError(error);
      if (resendAfterSeconds > 0) {
        startOtpCooldown(resendAfterSeconds);
      }
    }
  };

  const handleRegister = async ({ otp }) => {
    if (!pendingRegistration?.email) {
      setStep("details");
      return;
    }

    setOtpApiError("");

    try {
      await registerService({
        email: pendingRegistration.email,
        otp: otp.trim(),
      });

      navigate("/login", {
        replace: true,
        state: {
          authNotice: `Account ${pendingRegistration.email} was created successfully. You can sign in now.`,
        },
      });
    } catch (error) {
      const hasFieldErrors = applyApiFieldErrors({
        error,
        setError: otpForm.setError,
      });

      if (!hasFieldErrors) {
        setOtpApiError(
          getApiErrorMessage(
            error,
            "Unable to complete registration. Please try again."
          )
        );
      }
    }
  };

  const handleResendOtp = async () => {
    if (!pendingRegistration || remainingSeconds > 0) {
      return;
    }

    setOtpApiError("");
    setIsResendingOtp(true);

    try {
      const result = await requestRegisterOtpService({
        email: pendingRegistration.email,
        password: pendingRegistration.password,
        fullName: pendingRegistration.fullName,
      });

      const normalizedEmail = result?.email || pendingRegistration.email;

      setPendingRegistration((current) =>
        current
          ? {
              ...current,
              email: normalizedEmail,
              expiresInMinutes:
                result?.expiresInMinutes || current.expiresInMinutes,
            }
          : current
      );
      detailsForm.setValue("email", normalizedEmail, {
        shouldDirty: true,
        shouldValidate: true,
      });
      startOtpCooldown(result?.resendAfterSeconds || 0);
    } catch (error) {
      const hasFieldErrors = applyApiFieldErrors({
        error,
        setError: detailsForm.setError,
      });

      const resendAfterSeconds = getResendAfterSecondsFromError(error);
      if (resendAfterSeconds > 0) {
        startOtpCooldown(resendAfterSeconds);
      }

      if (hasFieldErrors) {
        setDetailsApiError(
          getApiErrorMessage(
            error,
            "Registration details are no longer valid. Please review them."
          )
        );
        setStep("details");
        return;
      }

      setOtpApiError(
        getApiErrorMessage(error, "Unable to resend OTP. Please try again.")
      );
    } finally {
      setIsResendingOtp(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0f0f14] bg-[radial-gradient(circle_at_top_left,_rgba(245,182,111,0.22),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(79,124,255,0.14),_transparent_24%),linear-gradient(135deg,_#0f0f14_0%,_#15131b_45%,_#0d1018_100%)] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="order-2 lg:order-1">
          <div className="max-w-xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-[#f5b66f]">
              Register Flow
            </p>
            <h2 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Register with the OTP flow that already exists in the backend.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-[#d9d5cf]">
              The frontend keeps the registration flow split into a details step
              and an OTP verification step, while still mapping backend field
              errors directly to the correct form inputs.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {registerHighlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-white/8 bg-white/[0.04] p-4 shadow-[0_18px_45px_rgba(15,23,42,0.24)] backdrop-blur"
                >
                  <p className="text-sm font-semibold text-[#f5b66f]">
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#d9d5cf]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="order-1 lg:order-2">
          {step === "details" ? (
            <RegisterDetailsStep
              apiError={detailsApiError}
              form={detailsForm}
              onSubmit={handleSendOtp}
            />
          ) : (
            <RegisterOtpStep
              apiError={otpApiError}
              email={pendingRegistration?.email || ""}
              expiresInMinutes={pendingRegistration?.expiresInMinutes}
              form={otpForm}
              isResending={isResendingOtp}
              onEditDetails={() => setStep("details")}
              onResendOtp={handleResendOtp}
              onSubmit={handleRegister}
              remainingSeconds={remainingSeconds}
            />
          )}
        </div>
      </div>
    </main>
  );
};

export default RegisterPage;
