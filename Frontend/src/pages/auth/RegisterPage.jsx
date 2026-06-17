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
  gender: values.gender,
  dateOfBirth: values.dateOfBirth,
});

const RegisterPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState("details");
  const [detailsApiError, setDetailsApiError] = useState("");
  const [detailsValidationError, setDetailsValidationError] = useState("");
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
      gender: "prefer_not_to_say",
      dateOfBirth: "",
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
    setDetailsValidationError("");
    setOtpApiError("");

    try {
      const payload = createOtpPayload(values);
      const result = await requestRegisterOtpService({
        email: payload.email,
      });
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
        fieldMap: {
          email: "email",
        },
        setError: detailsForm.setError,
        strictFieldMap: true,
      });

      if (!hasFieldErrors) {
        setDetailsApiError(
          getApiErrorMessage(error, "Không thể gửi OTP. Vui lòng thử lại.")
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
        password: pendingRegistration.password,
        fullName: pendingRegistration.fullName,
        gender: pendingRegistration.gender,
        dateOfBirth: pendingRegistration.dateOfBirth,
      });

      navigate("/login", {
        replace: true,
        state: {
          authNotice: `Tài khoản ${pendingRegistration.email} đã được tạo thành công. Bạn có thể đăng nhập ngay.`,
        },
      });
    } catch (error) {
      const hasOtpFieldErrors = applyApiFieldErrors({
        error,
        fieldMap: {
          otp: "otp",
        },
        setError: otpForm.setError,
        strictFieldMap: true,
      });

      const hasDetailsFieldErrors = applyApiFieldErrors({
        error,
        fieldMap: {
          email: "email",
          password: "password",
          fullName: "fullName",
          gender: "gender",
          dateOfBirth: "dateOfBirth",
        },
        setError: detailsForm.setError,
        strictFieldMap: true,
      });

      if (hasDetailsFieldErrors) {
        setDetailsApiError(
          getApiErrorMessage(
            error,
            "Thông tin đăng ký không còn hợp lệ. Vui lòng kiểm tra lại."
          )
        );
        setStep("details");
        return;
      }

      if (!hasOtpFieldErrors) {
        setOtpApiError(
          getApiErrorMessage(
            error,
            "Không thể hoàn tất đăng ký. Vui lòng thử lại."
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
        fieldMap: {
          email: "email",
        },
        setError: detailsForm.setError,
        strictFieldMap: true,
      });

      const resendAfterSeconds = getResendAfterSecondsFromError(error);
      if (resendAfterSeconds > 0) {
        startOtpCooldown(resendAfterSeconds);
      }

      if (hasFieldErrors) {
        setDetailsApiError(
          getApiErrorMessage(
            error,
            "Thông tin đăng ký không còn hợp lệ. Vui lòng kiểm tra lại."
          )
        );
        setStep("details");
        return;
      }

      setOtpApiError(
        getApiErrorMessage(error, "Không thể gửi lại OTP. Vui lòng thử lại.")
      );
    } finally {
      setIsResendingOtp(false);
    }
  };

  const handleInvalidDetailsSubmit = (formErrors) => {
    const firstFieldName = Object.keys(formErrors)[0];

    setDetailsApiError("");
    setDetailsValidationError("Vui lòng điền đầy đủ các trường bắt buộc trước khi tiếp tục.");

    if (firstFieldName) {
      detailsForm.setFocus(firstFieldName);
    }
  };

  const isDetailsStep = step === "details";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0c1016] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(245,182,111,0.14),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(79,124,255,0.08),_transparent_26%),linear-gradient(180deg,_rgba(255,255,255,0.02)_0%,_rgba(12,16,22,0)_22%,_rgba(12,16,22,0.2)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="pointer-events-none absolute left-[-8rem] top-[-8rem] h-56 w-56 rounded-full bg-[#f5b66f]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-10rem] right-[-8rem] h-72 w-72 rounded-full bg-[#4f7cff]/8 blur-3xl" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className={`w-full ${isDetailsStep ? "max-w-3xl" : "max-w-lg"}`}>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#f5b66f]">
                Reso Music
              </p>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {isDetailsStep ? "Tạo tài khoản" : "Xác nhận email"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c9c4bd]">
                  {isDetailsStep
                    ? "Quy trình đăng ký gồm 2 bước, chỉ giữ lại các thông tin cần thiết để bạn bắt đầu nhanh chóng."
                    : "Nhập mã xác thực chúng tôi đã gửi để hoàn tất việc tạo tài khoản."}
                </p>
              </div>
            </div>

            <div className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-medium text-[#e7e1d8] backdrop-blur">
              {isDetailsStep ? "Bước 1/2" : "Bước 2/2"}
            </div>
          </div>

          { isDetailsStep ? (
            <RegisterDetailsStep
              apiError={ detailsApiError }
              validationError={ detailsValidationError }
              form={ detailsForm }
              onInvalidSubmit={ handleInvalidDetailsSubmit }
              onSubmit={ handleSendOtp }
            />
          ) : (
            <RegisterOtpStep
              apiError={ otpApiError }
              email={ pendingRegistration?.email || "" }
              expiresInMinutes={ pendingRegistration?.expiresInMinutes }
              form={ otpForm }
              isResending={ isResendingOtp }
              onEditDetails={ () => setStep("details") }
              onResendOtp={ handleResendOtp }
              onSubmit={ handleRegister }
              remainingSeconds={ remainingSeconds }
            />
          ) }
        </div>
      </section>
    </main>
  );
};

export default RegisterPage;
