import { useEffect, useEffectEvent, useRef, useState } from "react";

const GOOGLE_IDENTITY_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let googleIdentityScriptPromise;

const loadGoogleIdentityScript = () => {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Đăng nhập Google chỉ khả dụng trên trình duyệt.")
    );
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }

  if (!googleIdentityScriptPromise) {
    googleIdentityScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(
        `script[src="${GOOGLE_IDENTITY_SCRIPT_SRC}"]`
      );

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(window.google), {
          once: true,
        });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Không thể tải Google Identity Services.")),
          { once: true }
        );
        return;
      }

      const script = document.createElement("script");
      script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google);
      script.onerror = () => {
        reject(new Error("Không thể tải Google Identity Services."));
      };
      document.head.appendChild(script);
    });
  }

  return googleIdentityScriptPromise;
};

const GoogleLoginButton = ({ onCredential, disabled = false }) => {
  const buttonRef = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
  const configError = clientId ? "" : "Đăng nhập Google chưa được cấu hình.";
  const [error, setError] = useState("");

  const handleGoogleResponse = useEffectEvent((response) => {
    if (!response?.credential) {
      setError("Đăng nhập Google không trả về thông tin xác thực.");
      return;
    }

    setError("");
    onCredential?.(response.credential);
  });

  useEffect(() => {
    let isMounted = true;

    if (!clientId) {
      return undefined;
    }

    loadGoogleIdentityScript()
      .then((google) => {
        if (!isMounted || !buttonRef.current || !google?.accounts?.id) {
          return;
        }

        setError("");
        google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
        });

        const buttonWidth = Math.min(
          buttonRef.current.clientWidth || 360,
          360
        );

        buttonRef.current.innerHTML = "";
        google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: Math.max(buttonWidth, 240),
          logo_alignment: "left",
        });
      })
      .catch((loadError) => {
        if (!isMounted) {
          return;
        }

        setError(loadError.message || "Không thể tải đăng nhập Google.");
      });

    return () => {
      isMounted = false;
      window.google?.accounts?.id?.cancel?.();
    };
  }, [clientId]);

  return (
    <div>
      <div className={ disabled ? "pointer-events-none opacity-70" : "" }>
        <div ref={ buttonRef } className="min-h-[44px] w-full" />
      </div>

      { configError || error ? (
        <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          { configError || error }
        </p>
      ) : null }
    </div>
  );
};

export default GoogleLoginButton;
