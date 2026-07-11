import { ChevronLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { routePaths } from "../../routes/routePaths";
import { getUserPaymentReceiptPdf } from "../../services/userPaymentService";

const FALLBACK_RECEIPT_ERROR = "Không thể tải biên nhận.";

const extractReceiptErrorMessage = async (error) => {
  const responseData = error?.response?.data;

  if (responseData instanceof Blob) {
    try {
      const responseText = await responseData.text();
      const parsedPayload = JSON.parse(responseText);

      if (parsedPayload?.message) {
        return parsedPayload.message;
      }
    } catch {
      return error?.message || FALLBACK_RECEIPT_ERROR;
    }
  }

  if (responseData?.message) {
    return responseData.message;
  }

  return error?.message || FALLBACK_RECEIPT_ERROR;
};

const PaymentReceiptPdfPage = () => {
  const navigate = useNavigate();
  const { paymentId = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const pdfUrlRef = useRef("");

  useEffect(() => {
    let isMounted = true;

    const revokePdfUrl = () => {
      if (!pdfUrlRef.current) {
        return;
      }

      URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = "";
    };

    const loadReceiptPdf = async () => {
      if (!paymentId) {
        setError(FALLBACK_RECEIPT_ERROR);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setPdfUrl("");
      revokePdfUrl();

      try {
        const pdfBlob = await getUserPaymentReceiptPdf(paymentId);

        if (!pdfBlob || pdfBlob.size === 0) {
          throw new Error(FALLBACK_RECEIPT_ERROR);
        }

        if (!isMounted) {
          return;
        }

        const objectUrl = URL.createObjectURL(pdfBlob);
        pdfUrlRef.current = objectUrl;
        setPdfUrl(objectUrl);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        const nextErrorMessage = await extractReceiptErrorMessage(loadError);
        setError(nextErrorMessage);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadReceiptPdf();

    return () => {
      isMounted = false;
      revokePdfUrl();
    };
  }, [paymentId]);

  return (
    <main className="min-h-screen bg-[#2b2b2b] text-white">
      <header className="flex h-14 items-center gap-3 bg-[#3a3a3a] px-4 sm:px-5">
        <button
          type="button"
          onClick={() => navigate(routePaths.userPaymentHistory)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/84 transition hover:bg-white/10 hover:text-white"
          aria-label="Quay lại lịch sử thanh toán"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <span className="text-sm font-semibold tracking-[0.02em] text-white/92">
          Purchase receipt
        </span>
      </header>

      {loading ? (
        <div className="flex h-[calc(100vh-56px)] items-center justify-center px-6 text-sm text-white/78">
          Đang tải biên nhận...
        </div>
      ) : null}

      {!loading && error ? (
        <div className="flex h-[calc(100vh-56px)] items-center justify-center px-6 text-sm text-white/78">
          {error}
        </div>
      ) : null}

      {!loading && !error && pdfUrl ? (
        <iframe
          src={pdfUrl}
          title="Purchase receipt"
          className="h-[calc(100vh-56px)] w-full border-0"
        />
      ) : null}
    </main>
  );
};

export default PaymentReceiptPdfPage;
