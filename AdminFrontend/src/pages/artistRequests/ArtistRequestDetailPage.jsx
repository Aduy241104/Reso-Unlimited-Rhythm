import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getArtistRequestDetailService,
  reviewArtistRequestService,
} from "../../services/artistRequestService";
import { createEmptyChecklist } from "./constants";
import ArtistRequestInfoSections from "./components/ArtistRequestInfoSections";
import ArtistRequestReviewSidebar from "./components/ArtistRequestReviewSidebar";
import { buildInitialReviewForm } from "./utils";

const ArtistRequestDetailPage = () => {
  const { requestId } = useParams();
  const [artistRequest, setArtistRequest] = useState(null);
  const [reviewForm, setReviewForm] = useState(() => ({
    adminNote: "",
    rejectReason: "",
    checklist: createEmptyChecklist(),
  }));
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("error");

  const loadArtistRequest = async () => {
    if (!requestId) return;

    setIsLoading(true);
    setMessage("");

    try {
      const result = await getArtistRequestDetailService(requestId);
      setArtistRequest(result);
      setReviewForm(buildInitialReviewForm(result));
    } catch (error) {
      setMessageTone("error");
      setMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể tải chi tiết yêu cầu."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadArtistRequest();
  }, [requestId]);

  const socialLinks = Object.entries(artistRequest?.socialLinks ?? {}).filter(
    ([, value]) => Boolean(value)
  );
  const genres = artistRequest?.genres?.filter(Boolean) ?? [];
  const demoTrackUrls =
    artistRequest?.portfolio?.demoTrackUrls?.filter(Boolean) ?? [];
  const musicLinks = artistRequest?.portfolio?.musicLinks?.filter(Boolean) ?? [];

  const hasCompletedChecklist = useMemo(
    () =>
      Object.values(reviewForm.checklist).every(
        (value) => typeof value === "boolean"
      ),
    [reviewForm.checklist]
  );

  const hasAllCriteriaApproved = useMemo(
    () => Object.values(reviewForm.checklist).every((value) => value === true),
    [reviewForm.checklist]
  );

  const isPending = artistRequest?.status === "pending";
  const isApproved = artistRequest?.status === "approved";

  const handleChecklistChange = (key, value) => {
    setReviewForm((prev) => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [key]: value,
      },
    }));
  };

  const handleFieldChange = (field) => (event) => {
    setReviewForm((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const submitDecision = async (status) => {
    if (!artistRequest?._id) return;

    if (isApproved) {
      setMessageTone("error");
      setMessage("Yêu cầu này đã được duyệt và không thể xử lý lại.");
      return;
    }

    if (!hasCompletedChecklist) {
      setMessageTone("error");
      setMessage("Hãy đánh giá đầy đủ tất cả tiêu chí trước khi gửi quyết định.");
      return;
    }

    if (status === "approved" && !hasAllCriteriaApproved) {
      setMessageTone("error");
      setMessage("Chỉ có thể duyệt khi tất cả tiêu chí đều đạt.");
      return;
    }

    if (status === "rejected" && !reviewForm.rejectReason.trim()) {
      setMessageTone("error");
      setMessage("Vui lòng nhập lý do từ chối.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const payload = {
        status,
        adminNote: reviewForm.adminNote.trim(),
        rejectReason:
          status === "rejected" ? reviewForm.rejectReason.trim() : "",
        checklist: Object.entries(reviewForm.checklist).reduce(
          (result, [key, value]) => {
            result[key] = value === true;
            return result;
          },
          {}
        ),
      };

      const result = await reviewArtistRequestService(artistRequest._id, payload);
      setArtistRequest(result.artistRequest);
      setReviewForm(buildInitialReviewForm(result.artistRequest));
      setMessageTone("success");
      setMessage(
        status === "approved"
          ? "Đã duyệt hồ sơ artist thành công."
          : "Đã từ chối hồ sơ artist."
      );
    } catch (error) {
      setMessageTone("error");
      setMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể cập nhật quyết định."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="-mt-4 space-y-1 xl:flex xl:h-full xl:min-h-0 xl:flex-col">
      {message && (
        <div
          className={`rounded-[1.25rem] px-5 py-4 text-sm ${
            messageTone === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-[1.5rem] bg-white px-6 py-20 text-center text-sm text-slate-600">
          Đang tải chi tiết yêu cầu...
        </div>
      ) : artistRequest ? (
        <div className="grid gap-3 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1.25fr)_390px] xl:overflow-hidden">
          <div className="xl:min-h-0 xl:overflow-y-auto xl:pr-2">
            <ArtistRequestInfoSections
              artistRequest={artistRequest}
              genres={genres}
              socialLinks={socialLinks}
              demoTrackUrls={demoTrackUrls}
              musicLinks={musicLinks}
            />
          </div>

          <div className="xl:self-start">
            <ArtistRequestReviewSidebar
              artistRequest={artistRequest}
              reviewForm={reviewForm}
              isSubmitting={isSubmitting}
              isPending={isPending}
              isApproved={isApproved}
              hasCompletedChecklist={hasCompletedChecklist}
              hasAllCriteriaApproved={hasAllCriteriaApproved}
              onChecklistChange={handleChecklistChange}
              onFieldChange={handleFieldChange}
              onApprove={() => void submitDecision("approved")}
              onReject={() => void submitDecision("rejected")}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default ArtistRequestDetailPage;
