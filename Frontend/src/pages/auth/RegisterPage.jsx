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
      });

      navigate("/login", {
        replace: true,
        state: {
          authNotice: `Tài khoản ${pendingRegistration.email} đã được tạo thành công. Bạn có thể đăng nhập ngay bây giờ.`,
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.28),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.2),_transparent_28%),linear-gradient(135deg,_#f8fafc_0%,_#ecfeff_45%,_#f8fafc_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="order-2 lg:order-1">
          <div className="max-w-xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-cyan-800">
              Register Flow
            </p>
            <h2 className="text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
              Đăng ký tài khoản theo luồng OTP đúng với contract BE.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
              FE tách rõ bước nhập thông tin và bước xác minh OTP, đồng thời
              map lỗi trả về từ server về đúng field để người dùng sửa nhanh
              hơn.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                {
                  title: "Bước 1",
                  description: "Nhập họ tên, email và mật khẩu để nhận OTP.",
                },
                {
                  title: "Bước 2",
                  description: "Nhập mã OTP 6 số hệ thống vừa gửi qua email.",
                },
                {
                  title: "Bước 3",
                  description: "Chuyển về đăng nhập sau khi đăng ký thành công.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-white/60 bg-white/70 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
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
