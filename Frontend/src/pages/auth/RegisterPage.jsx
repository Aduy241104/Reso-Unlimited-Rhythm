import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import RegisterDetailsStep from "../../components/auth/RegisterDetailsStep";
import RegisterOtpStep from "../../components/auth/RegisterOtpStep";
import { fetchCountryOptions } from "../../services/countryService";
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
  country: values.country.trim(),
});

const loadCountryOptionsState = async ({
  setCountryOptions,
  setCountriesError,
  setIsCountriesLoading,
}) => {
  setIsCountriesLoading(true);
  setCountriesError("");

  try {
    const nextCountryOptions = await fetchCountryOptions();
    setCountryOptions(nextCountryOptions);
  } catch (error) {
    setCountriesError(
      getApiErrorMessage(
        error,
        "Unable to load the country list right now."
      )
    );
  } finally {
    setIsCountriesLoading(false);
  }
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState("details");
  const [detailsApiError, setDetailsApiError] = useState("");
  const [otpApiError, setOtpApiError] = useState("");
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(null);
  const [pendingRegistration, setPendingRegistration] = useState(null);
  const [countryOptions, setCountryOptions] = useState([]);
  const [isCountriesLoading, setIsCountriesLoading] = useState(true);
  const [countriesError, setCountriesError] = useState("");

  const detailsForm = useForm({
    resolver: zodResolver(registerDetailsSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: {
      fullName: "",
      email: "",
      gender: "prefer_not_to_say",
      dateOfBirth: "",
      country: "",
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

  useEffect(() => {
    loadCountryOptionsState({
      setCountryOptions,
      setCountriesError,
      setIsCountriesLoading,
    });
  }, []);

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
        password: pendingRegistration.password,
        fullName: pendingRegistration.fullName,
        gender: pendingRegistration.gender,
        dateOfBirth: pendingRegistration.dateOfBirth,
        country: pendingRegistration.country,
      });

      navigate("/login", {
        replace: true,
        state: {
          authNotice: `Account ${pendingRegistration.email} was created successfully. You can sign in now.`,
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
          country: "country",
        },
        setError: detailsForm.setError,
        strictFieldMap: true,
      });

      if (hasDetailsFieldErrors) {
        setDetailsApiError(
          getApiErrorMessage(
            error,
            "Registration details are no longer valid. Please review them."
          )
        );
        setStep("details");
        return;
      }

      if (!hasOtpFieldErrors) {
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

  const handleRetryCountries = async () => {
    await loadCountryOptionsState({
      setCountryOptions,
      setCountriesError,
      setIsCountriesLoading,
    });
  };

  return (
    <main className="min-h-screen bg-[#0f0f14] bg-[radial-gradient(circle_at_top_left,_rgba(245,182,111,0.22),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(79,124,255,0.14),_transparent_24%),linear-gradient(135deg,_#0f0f14_0%,_#15131b_45%,_#0d1018_100%)] px-4 py-4 text-white sm:px-6 sm:py-6 lg:px-8 lg:py-8">

      <div
        className={`mx-auto flex w-full items-center justify-center ${
          step === "details"
            ? "min-h-[calc(100vh-2rem)] max-w-5xl"
            : "min-h-[calc(100vh-5rem)] max-w-md"
        }`}
      >

        <div className="w-full">
          { step === "details" ? (
            <RegisterDetailsStep
              apiError={ detailsApiError }
              countriesError={ countriesError }
              countryOptions={ countryOptions }
              form={ detailsForm }
              isCountriesLoading={ isCountriesLoading }
              onRetryCountries={ handleRetryCountries }
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

      </div>
    </main>
  );
};

export default RegisterPage;
