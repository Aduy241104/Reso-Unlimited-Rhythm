import { createElement, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Eye,
  MousePointerClick,
  Pencil,
  Radio,
  SkipForward,
  Volume2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import advertisementService from "../../services/advertisementService";
import { routePaths } from "../../routes/routePaths";

const statusStyle = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  paused: "bg-amber-50 text-amber-700 ring-amber-200",
  draft: "bg-slate-100 text-slate-600 ring-slate-200",
  expired: "bg-rose-50 text-rose-700 ring-rose-200",
  archived: "bg-slate-200 text-slate-500 ring-slate-300",
};

const getError = (error) => error?.response?.data?.message || error?.message || "Không thể tải dữ liệu chiến dịch.";
const numberFormatter = new Intl.NumberFormat("vi-VN");
const formatNumber = (value) => numberFormatter.format(Number(value) || 0);
const formatPercent = (value) => `${(Number(value) || 0).toFixed(1)}%`;
const formatDate = (value) => value ? new Date(value).toLocaleString("vi-VN") : "—";

const MetricCard = ({ icon, label, value, hint, tone = "blue" }) => {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p><p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{value}</p>{hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}</div><span className={`rounded-xl p-3 ${tones[tone] || tones.blue}`}>{createElement(icon, { className: "h-5 w-5" })}</span></div>
  </article>;
};

const InfoRow = ({ label, value }) => <div className="flex items-start justify-between gap-6 border-b border-slate-100 py-3 last:border-0"><dt className="text-sm text-slate-500">{label}</dt><dd className="max-w-[65%] text-right text-sm font-semibold text-slate-800">{value || "—"}</dd></div>;

const AdvertisementDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [campaignResult, analyticsResult] = await Promise.all([
          advertisementService.get(id),
          advertisementService.analytics(id),
        ]);
        if (mounted) {
          setCampaign(campaignResult);
          setAnalytics(analyticsResult);
        }
      } catch (nextError) {
        if (mounted) setError(getError(nextError));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, [id]);

  const timeline = useMemo(() => Array.isArray(analytics?.timeline) ? analytics.timeline : [], [analytics]);
  const chartMax = useMemo(() => Math.max(1, ...timeline.map((day) => Math.max(day.impressions || 0, day.clicks || 0, day.completes || 0, day.skips || 0))), [timeline]);
  const effectiveStatus = campaign?.effectiveStatus || campaign?.status || "draft";
  const targeting = campaign?.targeting || {};
  const isAudio = campaign?.type === "audio";

  if (loading) return <section className="mx-auto max-w-[1500px] rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Đang tải phân tích chiến dịch...</section>;
  if (error || !campaign) return <section className="mx-auto max-w-[1500px] space-y-5"><button type="button" onClick={() => navigate(routePaths.advertisements)} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"><ArrowLeft className="h-4 w-4" />Quay lại danh sách</button><div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error || "Không tìm thấy chiến dịch."}</div></section>;

  return <section className="mx-auto max-w-[1500px] space-y-7 pb-8">
    <div className="flex flex-wrap items-center justify-between gap-4"><button type="button" onClick={() => navigate(routePaths.advertisements)} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"><ArrowLeft className="h-4 w-4" />Quay lại danh sách quảng cáo</button><button type="button" onClick={() => navigate(routePaths.advertisementEdit(campaign._id))} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"><Pencil className="h-4 w-4" />Chỉnh sửa campaign</button></div>

    <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"><div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-5"><div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">{campaign.type === "banner" && campaign.mediaUrl ? <img src={campaign.mediaUrl} alt="" className="h-full w-full object-cover" /> : <MegaphonePlaceholder />}</div><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">Campaign analytics</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">{campaign.title}</h1><p className="mt-1 text-sm text-slate-500">{campaign.advertiserName} · {campaign.type === "audio" ? "Audio ad" : "Banner ad"}</p></div></div><div className="flex flex-wrap items-center gap-3"><span className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${statusStyle[effectiveStatus] || statusStyle.draft}`}>{effectiveStatus}</span><span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold capitalize text-slate-600">{campaign.type}</span></div></div>{isAudio && campaign.mediaUrl ? <audio className="mt-6 w-full" controls src={campaign.mediaUrl} preload="metadata">Trình duyệt không hỗ trợ audio.</audio> : null}</header>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard icon={Eye} label="Impression" value={formatNumber(analytics?.impressions)} hint="Lượt quảng cáo được hiển thị" /><MetricCard icon={MousePointerClick} label="Click" value={formatNumber(analytics?.clicks)} hint={`CTR ${formatPercent(analytics?.ctr)}`} tone="violet" /><MetricCard icon={Radio} label={isAudio ? "Đã bắt đầu" : "Đã phân phối"} value={formatNumber(analytics?.started)} hint="Lượt bắt đầu phát / hiển thị" tone="emerald" /><MetricCard icon={isAudio ? CheckCircle2 : BarChart3} label={isAudio ? "Hoàn tất" : "Hiệu suất"} value={isAudio ? formatNumber(analytics?.completes) : formatPercent(analytics?.ctr)} hint={isAudio ? `Tỷ lệ hoàn tất ${formatPercent(analytics?.completionRate)}` : "Tỷ lệ click trên impression"} tone="amber" /></div>

    {isAudio ? <div className="grid gap-4 sm:grid-cols-2"><MetricCard icon={SkipForward} label="Bỏ qua" value={formatNumber(analytics?.skips)} hint="Lượt người nghe skip quảng cáo" tone="amber" /><MetricCard icon={Clock3} label="Tỷ lệ hoàn tất" value={formatPercent(analytics?.completionRate)} hint="Hoàn tất / (hoàn tất + bỏ qua)" tone="emerald" /></div> : null}

    <div className="grid gap-7 xl:grid-cols-[minmax(0,1.55fr),minmax(320px,0.85fr)]"><article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Theo dõi hiệu suất</p><h2 className="mt-1 text-xl font-bold text-slate-950">Hoạt động theo ngày</h2></div><div className="flex flex-wrap gap-4 text-xs text-slate-500"><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-blue-500" />Impression</span><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-violet-500" />Click</span>{isAudio ? <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Hoàn tất</span> : null}</div></div>{timeline.length ? <div className="mt-7 space-y-5">{timeline.map((day) => <div key={day.date} className="grid grid-cols-[82px,minmax(0,1fr),auto] items-center gap-3"><span className="text-xs font-medium text-slate-500">{new Date(`${day.date}T00:00:00`).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}</span><div className="space-y-1.5"><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(((day.impressions || 0) / chartMax) * 100, 100)}%` }} /></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(((day.clicks || 0) / chartMax) * 100, 100)}%` }} /></div>{isAudio ? <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(((day.completes || 0) / chartMax) * 100, 100)}%` }} /></div> : null}</div><div className="text-right text-xs font-semibold leading-5 text-slate-500"><div>{formatNumber(day.impressions)}</div><div>{formatNumber(day.clicks)}</div>{isAudio ? <div>{formatNumber(day.completes)}</div> : null}</div></div>)}</div> : <div className="mt-8 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center text-sm text-slate-500"><CircleAlert className="mx-auto mb-2 h-5 w-5 text-slate-400" />Chưa có dữ liệu hoạt động cho khoảng thời gian này.</div>}</article>

      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><span className="rounded-xl bg-blue-50 p-3 text-blue-600"><CalendarDays className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Campaign setup</p><h2 className="mt-1 text-xl font-bold text-slate-950">Thông tin chiến dịch</h2></div></div><dl className="mt-5"><InfoRow label="Thời gian bắt đầu" value={formatDate(campaign.startAt)} /><InfoRow label="Thời gian kết thúc" value={formatDate(campaign.endAt)} /><InfoRow label="Ưu tiên phân phối" value={`P${campaign.priority || 1}`} /><InfoRow label="Vị trí" value={targeting.placements?.join(", ") || "Tất cả vị trí"} /><InfoRow label="Quốc gia" value={targeting.countries?.join(", ") || "Tất cả quốc gia"} /><InfoRow label="Giới hạn mỗi giờ" value={`${campaign.frequencyCap?.maxPerHour || 4} lượt`} /><InfoRow label="Skip sau" value={isAudio && campaign.skipEnabled ? `${campaign.skipAfterSeconds || 0} giây` : "Không áp dụng"} /></dl></article></div>
  </section>;
};

const MegaphonePlaceholder = () => <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Volume2 className="h-6 w-6" /></span>;

export default AdvertisementDetailPage;
