import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileAudio,
  LockKeyhole,
  Mic2,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  Volume2,
} from "lucide-react";
import PodcastArtwork from "../../components/podcast/PodcastArtwork";
import podcastService from "../../services/podcastService";
import { routePaths } from "../../routes/routePaths";
import { Section } from "../albums/components/AlbumManagementPrimitives";

const STATUS_META = {
  draft: { label: "Bản nháp", className: "border-slate-200 bg-slate-100 text-slate-700" },
  pending: { label: "Chờ duyệt", className: "border-amber-200 bg-amber-50 text-amber-800" },
  approved: { label: "Đã duyệt", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  rejected: { label: "Bị từ chối", className: "border-rose-200 bg-rose-50 text-rose-700" },
};

const duration = (seconds = 0) => {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
};

const StatusPill = ({ status, blocked = false }) => {
  const meta = STATUS_META[status] || STATUS_META.draft;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${meta.className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {blocked ? "Đã khóa" : meta.label}
    </span>
  );
};

const InfoTile = ({ label, value, helper, className = "" }) => (
  <div className={`min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 p-4 ${className}`}>
    <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</span>
    <span className="mt-1 block break-words text-sm font-semibold text-slate-900">{value || "—"}</span>
    {helper ? <span className="mt-1 block text-xs leading-5 text-slate-500">{helper}</span> : null}
  </div>
);

const PodcastManagementDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [podcast, setPodcast] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(null);
  const [reviewError, setReviewError] = useState("");
  const [reviewEventLoading, setReviewEventLoading] = useState("");
  const audioRef = useRef(null);
  const lastAudioTimeRef = useRef(0);
  const audioReviewStartedRef = useRef(false);
  const audioProgressInFlightRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const loadPodcast = async () => {
      try {
        const nextPodcast = await podcastService.get(id);

        if (isMounted) {
          setError("");
          setPodcast(nextPodcast);
        }
      } catch (reason) {
        if (isMounted) {
          setError(reason?.message || "Không thể tải chi tiết Podcast.");
        }
      }
    };

    void loadPodcast();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (podcast?.approvalStatus !== "pending") {
      setReview(null);
      setReviewError("");
      return undefined;
    }

    let isMounted = true;
    const loadReview = async () => {
      try {
        const nextReview = await podcastService.startReviewSession(id);
        if (isMounted) {
          setReview(nextReview);
          setReviewError("");
        }
      } catch (reason) {
        if (isMounted) setReviewError(reason?.message || "Không thể khởi tạo phiên kiểm duyệt Podcast.");
      }
    };

    void loadReview();
    return () => { isMounted = false; };
  }, [id, podcast?.approvalStatus]);

  useEffect(() => {
    if (!review?.id || podcast?.approvalStatus !== "pending") return undefined;
    const existingEvents = new Set((review.events || []).map((event) => event.type));
    const eventsToRecord = ["OPEN_METADATA", "OPEN_COPYRIGHT_SECTION"]
      .filter((type) => !existingEvents.has(type));
    if (!eventsToRecord.length) return undefined;

    let isMounted = true;
    const markSectionsReviewed = async () => {
      for (const type of eventsToRecord) {
        try {
          const nextReview = await podcastService.recordReviewEvent(id, { type });
          if (isMounted) setReview(nextReview);
        } catch (reason) {
          if (isMounted) setReviewError(reason?.message || "Không thể ghi nhận checklist Podcast.");
          return;
        }
      }
    };

    void markSectionsReviewed();
    return () => { isMounted = false; };
  }, [id, podcast?.approvalStatus, review?.id, review?.events]);

  const recordReviewEvent = async (payload) => {
    if (!id || podcast?.approvalStatus !== "pending") return null;
    const showLoading = payload.type !== "AUDIO_PLAY_PROGRESS";
    if (showLoading) setReviewEventLoading(payload.type);
    try {
      const nextReview = await podcastService.recordReviewEvent(id, payload);
      setReview(nextReview);
      setReviewError("");
      return nextReview;
    } catch (reason) {
      setReviewError(reason?.message || "Không thể ghi nhận thao tác kiểm duyệt.");
      return null;
    } finally {
      if (showLoading) setReviewEventLoading("");
    }
  };

  const action = async (name) => {
    let reason = "";

    if (["reject", "block"].includes(name)) {
      reason = window.prompt(
        name === "reject" ? "Nhập lý do từ chối" : "Nhập lý do khóa Podcast",
        ""
      )?.trim();

      if (!reason) return;
    }

    setBusy(true);
    setError("");

    try {
      const next = name === "approve"
        ? await podcastService.approve(id, { reviewSessionId: review?.id })
        : name === "reject"
          ? await podcastService.reject(id, reason)
          : name === "block"
            ? await podcastService.block(id, reason)
            : await podcastService.unblock(id);

      setPodcast(next);
    } catch (failure) {
      setError(failure?.message || "Không thể thực hiện moderation.");
    } finally {
      setBusy(false);
    }
  };

  const handleAudioPlay = async () => {
    lastAudioTimeRef.current = audioRef.current?.currentTime || 0;
    if (audioReviewStartedRef.current) return;
    const openedReview = await recordReviewEvent({ type: "OPEN_AUDIO" });
    if (!openedReview) return;
    const startedReview = await recordReviewEvent({ type: "AUDIO_PLAY_STARTED" });
    audioReviewStartedRef.current = Boolean(startedReview);
  };

  const handleAudioTimeUpdate = () => {
    if (!audioReviewStartedRef.current || audioProgressInFlightRef.current) return;
    const currentTime = audioRef.current?.currentTime || 0;
    const deltaSeconds = Math.max(0, Math.min(5, currentTime - lastAudioTimeRef.current));
    if (deltaSeconds < 1) return;

    audioProgressInFlightRef.current = true;
    void recordReviewEvent({ type: "AUDIO_PLAY_PROGRESS", deltaSeconds })
      .finally(() => {
        lastAudioTimeRef.current = currentTime;
        audioProgressInFlightRef.current = false;
      });
  };

  const handleAudioEnded = () => {
    audioReviewStartedRef.current = false;
    void recordReviewEvent({ type: "AUDIO_REVIEWED" });
  };

  if (!podcast) {
    return (
      <div className="mx-auto mt-12 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-700">{error || "Đang tải chi tiết Podcast..."}</p>
        <button type="button" onClick={() => navigate(-1)} className="mt-4 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-700">
          Quay lại
        </button>
      </div>
    );
  }

  const creatorId = podcast.creator?.id;
  const creatorName = podcast.creator?.name || "Artist không xác định";
  const isPending = podcast.approvalStatus === "pending";
  const isBlocked = Boolean(podcast.isBlocked);
  const reviewMissingLabels = {
    podcast_opened: "mở hồ sơ Podcast",
    metadata_checked: "kiểm tra thông tin Podcast",
    copyright_viewed: "kiểm tra thông tin bản quyền",
    audio_reviewed: "nghe đủ thời lượng audio",
    final_confirmation: "xác nhận kiểm duyệt lần cuối",
  };
  const reviewMissing = review?.missing || (isPending ? ["review_session"] : []);
  const canApprove = isPending && Boolean(review?.id) && !reviewError && reviewMissing.length === 0;

  return (
    <section className="-mt-3 space-y-6 pb-8 font-sans text-slate-900 antialiased">
      <Section
        title="Tổng quan Podcast"
        icon={Mic2}
        action={(
          <div className="flex flex-wrap items-center justify-end gap-2">
            {creatorId ? (
              <Link to={routePaths.artistDetail(creatorId)} className="inline-flex h-10 items-center gap-2 border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-100">
                <UserRound className="h-4 w-4" /> Chi tiết nghệ sĩ
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => action(isBlocked ? "unblock" : "block")}
              disabled={busy}
              className={`inline-flex h-10 items-center gap-2 px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${isBlocked ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-rose-600 text-white hover:bg-rose-700"}`}
            >
              <ShieldAlert className="h-4 w-4" />
              {busy ? "Đang xử lý..." : isBlocked ? "Gỡ khóa Podcast" : "Khóa Podcast"}
            </button>
          </div>
        )}
      >
        <button type="button" onClick={() => navigate(routePaths.podcasts)} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950">
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách Podcast
        </button>

        <div className="mt-5 flex flex-col justify-between gap-6 border-y border-slate-200 py-5 md:flex-row md:items-center">
          <div className="flex min-w-0 items-center gap-5">
            <PodcastArtwork podcast={podcast} className="h-20 w-20 shrink-0 rounded-xl border border-slate-200 object-cover shadow-inner" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Quản lý Podcast</p>
              <h1 className="mt-1.5 truncate text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">{podcast.title || "Chưa đặt tiêu đề"}</h1>
              {creatorId ? (
                <Link to={routePaths.artistDetail(creatorId)} className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-900 hover:underline">
                  {creatorName}
                </Link>
              ) : <p className="mt-2 text-sm text-slate-600">{creatorName}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <StatusPill status={podcast.approvalStatus} blocked={isBlocked} />
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${podcast.visibility === "public" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {podcast.visibility === "public" ? "Đang hiển thị" : "Đang ẩn"}
            </span>
          </div>
        </div>
      </Section>

      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</p> : null}

      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Hệ thống tác vụ kiểm duyệt</h2>
            <p className="mt-1 text-sm text-slate-600">Phê duyệt nội dung và quản lý trạng thái khóa của Podcast.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isPending ? (
              <>
                <button type="button" onClick={() => action("approve")} disabled={busy || !canApprove} title={!canApprove ? "Hoàn tất checklist kiểm duyệt và nghe audio trước khi duyệt" : undefined} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Duyệt Podcast</button>
                <button type="button" onClick={() => action("reject")} disabled={busy} className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50">Từ chối</button>
              </>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
          <InfoTile label="Trạng thái phê duyệt" value={<StatusPill status={podcast.approvalStatus} />} />
          <InfoTile label="Trạng thái hiển thị" value={podcast.visibility === "public" ? "Đang hiển thị công khai" : "Đang ẩn khỏi người nghe"} />
          <InfoTile label="Quản trị viên rà soát" value={podcast.reviewedBy?.email || "Chưa rà soát / Hệ thống tự động"} />
          <InfoTile label="Quyết định kiểm duyệt" value={isPending ? "Đang chờ đội ngũ kiểm tra" : STATUS_META[podcast.approvalStatus]?.label || "Chưa đánh giá"} />
        </div>

        {isPending ? (
          <div className="space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-sm font-bold text-indigo-950">Checklist kiểm duyệt Podcast</h3>
                <p className="mt-1 text-xs leading-5 text-indigo-800">Admin phải mở hồ sơ, kiểm tra thông tin, nghe audio và xác nhận lần cuối trước khi duyệt.</p>
              </div>
              {reviewEventLoading ? <span className="text-xs font-semibold text-indigo-700">Đang ghi nhận...</span> : null}
            </div>
            {reviewError ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{reviewError}</p> : null}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["podcastOpened", "Đã mở hồ sơ Podcast"],
                ["metadataChecked", "Đã kiểm tra thông tin"],
                ["copyrightViewed", "Đã kiểm tra bản quyền"],
                ["audioReviewed", `Đã nghe audio (${Math.floor(review?.checklist?.audioListenedSeconds || 0)}/${review?.checklist?.minimumAudioSeconds || 15} giây)`],
                ["finalConfirmed", "Đã xác nhận lần cuối"],
              ].map(([key, label]) => (
                <span key={key} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${review?.checklist?.[key] ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                  {review?.checklist?.[key] ? "✓" : "○"} {label}
                </span>
              ))}
            </div>
            <label className="flex items-start gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-3 text-xs text-indigo-950">
              <input
                type="checkbox"
                checked={Boolean(review?.checklist?.finalConfirmed)}
                disabled={!review || Boolean(review?.checklist?.finalConfirmed) || Boolean(reviewEventLoading)}
                onChange={(event) => { if (event.target.checked) void recordReviewEvent({ type: "FINAL_CONFIRMATION" }); }}
                className="mt-0.5 h-4 w-4 rounded border-indigo-300 text-indigo-600"
              />
              <span>Tôi đã kiểm tra nội dung, âm thanh, thông tin bản quyền và xác nhận Podcast đủ điều kiện để duyệt.</span>
            </label>
            {reviewMissing.length > 0 ? <p className="text-xs font-semibold text-amber-800">Chưa thể duyệt: {reviewMissing.map((item) => reviewMissingLabels[item] || item).join(", ")}.</p> : null}
          </div>
        ) : null}

        {podcast.rejectReason ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800"><strong className="block text-xs uppercase tracking-wide">Lý do từ chối</strong><span className="mt-1 block">{podcast.rejectReason}</span></div> : null}
        {podcast.blockedReason ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"><strong className="block text-xs uppercase tracking-wide">Lý do khóa Podcast</strong><span className="mt-1 block">{podcast.blockedReason}</span></div> : null}
      </section>

      <section className="space-y-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Thông số Podcast</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoTile label="Mã Podcast (ID)" value={podcast.id} />
            <InfoTile label="Thời lượng" value={duration(podcast.duration)} />
            <InfoTile label="Tổng lượt nghe" value={`${Number(podcast.stats?.totalListen || 0).toLocaleString("vi-VN")} lượt`} />
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Nội dung và âm thanh</h2>
          <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><Volume2 className="h-4 w-4 text-sky-700" /> Phiên bản âm thanh gốc</div>
              {podcast.audioUrl ? <audio ref={audioRef} controls preload="metadata" src={podcast.audioUrl} onPlay={handleAudioPlay} onTimeUpdate={handleAudioTimeUpdate} onEnded={handleAudioEnded} className="mt-4 h-10 w-full" /> : <p className="mt-4 text-sm italic text-slate-500">Podcast chưa có tệp âm thanh.</p>}
              {podcast.audioUrl ? <a href={podcast.audioUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-sky-700 hover:underline"><FileAudio className="h-3.5 w-3.5" /> Mở tệp âm thanh</a> : null}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Mô tả Podcast</span>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{podcast.description || "Chưa có mô tả."}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-amber-100 bg-amber-50 text-amber-700"><ShieldCheck className="h-4 w-4" /></div>
          <div><h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Thông tin bản quyền</h2><p className="mt-1 text-sm text-slate-600">Thông tin quyền sử dụng do Artist khai báo khi gửi Podcast.</p></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoTile label="Loại bản quyền" value={podcast.copyrightType === "licensed" ? "Đã được cấp phép" : podcast.copyrightType === "third_party" ? "Nội dung bên thứ ba" : "Nội dung gốc"} />
          <InfoTile label="Xác nhận của Artist" value={podcast.copyrightConfirmed ? "Đã xác nhận chính sách" : "Chưa xác nhận"} />
          <InfoTile label="Nguồn quyền sử dụng" value={podcast.copyrightSource || "Không khai báo thêm"} />
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /><span className="leading-6 text-slate-700">Bằng chứng giấy phép: {podcast.copyrightProofUrl ? "Đã cung cấp đường dẫn" : "Chưa cung cấp"}</span></div>
          {podcast.copyrightProofUrl ? <a href={podcast.copyrightProofUrl} target="_blank" rel="noreferrer" className="shrink-0 font-semibold text-sky-700 hover:underline">Mở bằng chứng</a> : null}
        </div>
      </section>

    </section>
  );
};

export default PodcastManagementDetailPage;
