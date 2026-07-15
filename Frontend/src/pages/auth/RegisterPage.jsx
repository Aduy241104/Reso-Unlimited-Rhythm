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
  const [pendingRegistration, setPendingRegistration] = useState(null);

  const detailsForm = useForm({
    resolver: zodResolver(registerDetailsSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
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
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: {
      otp: "",
    },
  });

  useEffect(() => {
    if (remainingSeconds <= 0) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((current) => (current > 1 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [remainingSeconds]);

  const startOtpCooldown = (seconds) => {
    setRemainingSeconds(seconds > 0 ? seconds : 0);
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
          getApiErrorMessage(error, "Không thể gửi mã OTP. Vui lòng thử lại.")
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
    setDetailsValidationError(
      "Vui lòng điền đầy đủ các trường bắt buộc trước khi tiếp tục."
    );

    if (firstFieldName) {
      detailsForm.setFocus(firstFieldName);
    }
  };

  const isDetailsStep = step === "details";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0a] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,_rgba(8,8,12,0.2)_0%,_rgba(8,8,12,0.66)_36%,_rgba(8,8,12,0.9)_66%,_rgba(8,8,12,1)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="pointer-events-none absolute left-[-7rem] top-[-8rem] h-[24rem] w-[24rem] rounded-full bg-[#ff9f43]/18 blur-[110px]" />
      <div className="pointer-events-none absolute left-[20%] top-[10%] h-[20rem] w-[20rem] rounded-full bg-[#ffd86b]/12 blur-[120px]" />
      <div className="pointer-events-none absolute right-[14%] top-[-5rem] h-[21rem] w-[21rem] rounded-full bg-[#ff4fb3]/12 blur-[120px]" />
      <div className="pointer-events-none absolute right-[-6rem] top-[28%] h-[24rem] w-[24rem] rounded-full bg-[#6f5bff]/14 blur-[130px]" />
      <div className="pointer-events-none absolute bottom-[-7rem] left-[30%] h-[20rem] w-[20rem] rounded-full bg-[#3f7cff]/10 blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,_rgba(255,188,102,0.16),_transparent_24%),radial-gradient(circle_at_64%_18%,_rgba(255,82,168,0.15),_transparent_22%),radial-gradient(circle_at_78%_40%,_rgba(111,91,255,0.18),_transparent_24%),radial-gradient(circle_at_46%_82%,_rgba(70,140,255,0.12),_transparent_22%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.03)_0%,_rgba(10,10,10,0)_16%,_rgba(10,10,10,0.24)_100%)]" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className={`w-full ${isDetailsStep ? "max-w-[34rem]" : "max-w-[30rem]"}`}>
          {!isDetailsStep ? (
            <div className="mb-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/50">
                Reso Unlimited Rhythm
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Xác nhận email của bạn
              </h1>
              <p className="mt-2 text-sm leading-6 text-white/65">
                Nhập mã xác thực đã gửi để hoàn tất việc tạo tài khoản.
              </p>
            </div>
          ) : null}

          {isDetailsStep ? (
            <RegisterDetailsStep
              apiError={detailsApiError}
              validationError={detailsValidationError}
              form={detailsForm}
              onInvalidSubmit={handleInvalidDetailsSubmit}
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
      </section>
    </main>
  );
};

export default RegisterPage;
