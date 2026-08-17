import { useCallback, useEffect, useState } from "react";
import { BarChart3, CirclePause, Megaphone, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import advertisementService from "../../services/advertisementService";
import { routePaths } from "../../routes/routePaths";

const statusStyle = { active: "bg-emerald-50 text-emerald-700", paused: "bg-amber-50 text-amber-700", draft: "bg-slate-100 text-slate-600", expired: "bg-rose-50 text-rose-700", archived: "bg-slate-200 text-slate-500" };
const getError = (error) => error?.response?.data?.message || error?.message || "Không thể xử lý yêu cầu.";

const AdvertisementManagementPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await advertisementService.list({ ...(statusFilter ? { status: statusFilter } : {}), ...(typeFilter ? { type: typeFilter } : {}) });
      setItems(result.advertisements);
    } catch (nextError) { setError(getError(nextError)); }
    finally { setLoading(false); }
  }, [statusFilter, typeFilter]);
  useEffect(() => { void load(); }, [load]);

  const updateStatus = async (item, status) => {
    try { await advertisementService.update(item._id, { status }); await load(); }
    catch (nextError) { setError(getError(nextError)); }
  };
  const archive = async (item) => {
    if (!window.confirm(`Lưu trữ quảng cáo “${item.title}”?`)) return;
    try { await advertisementService.archive(item._id); await load(); }
    catch (nextError) { setError(getError(nextError)); }
  };

  return <section className="mx-auto max-w-[1500px] space-y-7">
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-600">Monetization workspace</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Quản lý quảng cáo</h1><p className="mt-2 text-sm text-slate-500">Banner và audio ad được phân phối theo lịch, tần suất và quyền Premium.</p></div><button type="button" onClick={() => navigate(routePaths.advertisementNew)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800"><Plus className="h-4 w-4" />Tạo quảng cáo</button></header>
    {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
    <div className="flex flex-wrap gap-2">{["", "active", "draft", "paused", "expired", "archived"].map((value) => <button key={value || "all"} type="button" onClick={() => setStatusFilter(value)} className={`rounded-full px-4 py-2 text-sm font-semibold ${statusFilter === value ? "bg-slate-950 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{value || "Tất cả"}</button>)}</div>
    <div className="flex gap-2">{["", "banner", "audio"].map((value) => <button key={value || "all-types"} type="button" onClick={() => setTypeFilter(value)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${typeFilter === value ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700"}`}>{value || "Mọi định dạng"}</button>)}</div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="hidden grid-cols-[80px,1fr,110px,120px,170px,180px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 md:grid"><span>Media</span><span>Chiến dịch / Analytics</span><span>Loại</span><span>Trạng thái</span><span>Thời gian</span><span>Thao tác</span></div>
      {loading ? <p className="p-10 text-center text-sm text-slate-500">Đang tải quảng cáo...</p> : items.length === 0 ? <p className="p-10 text-center text-sm text-slate-500">Chưa có quảng cáo phù hợp.</p> : items.map((item) => <article key={item._id} className="grid gap-4 border-b border-slate-100 px-5 py-4 last:border-0 md:grid-cols-[80px,1fr,110px,120px,170px,180px] md:items-center">
        <div className="flex h-14 w-20 items-center justify-center overflow-hidden rounded-xl bg-slate-100">{item.type === "banner" ? <img src={item.mediaUrl} alt="" className="h-full w-full object-cover" /> : <Megaphone className="h-6 w-6 text-violet-600" />}</div>
        <div className="min-w-0"><h2 className="truncate font-semibold text-slate-950">{item.title}</h2><p className="truncate text-sm text-slate-500">{item.advertiserName}</p><p className="mt-1 text-xs text-slate-400">P{item.priority} · {item.analytics?.impressions || 0} impression · {item.analytics?.clicks || 0} click · {Number(item.analytics?.ctr || 0).toFixed(1)}% CTR{item.type === "audio" ? ` · ${item.analytics?.completes || 0} complete · ${Number(item.analytics?.completionRate || 0).toFixed(1)}%` : ""}</p></div>
        <span className="text-sm font-medium capitalize text-slate-700">{item.type}</span><span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[item.effectiveStatus || item.status] || statusStyle.draft}`}>{item.effectiveStatus || item.status}</span>
        <p className="text-xs leading-5 text-slate-500">{new Date(item.startAt).toLocaleString("vi-VN")}<br />→ {new Date(item.endAt).toLocaleString("vi-VN")}</p>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => navigate(routePaths.advertisementDetail(item._id))} className="rounded-lg border border-blue-200 p-2 text-blue-700 hover:bg-blue-50" title="Xem phân tích"><BarChart3 className="h-4 w-4" /></button><button type="button" onClick={() => navigate(routePaths.advertisementEdit(item._id))} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" title="Sửa"><Pencil className="h-4 w-4" /></button>{item.status === "active" ? <button type="button" onClick={() => void updateStatus(item, "paused")} className="rounded-lg border border-amber-200 p-2 text-amber-700" title="Tạm dừng"><CirclePause className="h-4 w-4" /></button> : item.status !== "archived" ? <button type="button" onClick={() => void updateStatus(item, "active")} className="rounded-lg border border-emerald-200 p-2 text-emerald-700" title="Kích hoạt"><Play className="h-4 w-4" /></button> : null}<button type="button" onClick={() => void archive(item)} className="rounded-lg border border-rose-200 p-2 text-rose-600" title="Lưu trữ"><Trash2 className="h-4 w-4" /></button></div>
      </article>)}
    </div>
  </section>;
};

export default AdvertisementManagementPage;
