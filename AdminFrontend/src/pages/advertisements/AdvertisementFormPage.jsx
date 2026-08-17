import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, FileAudio, ImageIcon, LoaderCircle, Upload } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import advertisementService from "../../services/advertisementService";
import { routePaths } from "../../routes/routePaths";

const asLocal = (value = new Date()) => new Date(new Date(value).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const INITIAL = { title: "", advertiserName: "", type: "banner", status: "draft", mediaUrl: "", thumbnailUrl: "", clickUrl: "", startAt: asLocal(), endAt: asLocal(Date.now() + 86400000), priority: 1, maxPerHour: 4, minTracksBetweenAds: 3, minMinutesBetweenAds: 8, skipEnabled: true, skipAfterSeconds: 5, duration: 0, countries: "", placements: "home", genres: "" };
const message = (error) => error?.response?.data?.message || error?.message || "Không thể lưu quảng cáo.";

const AdvertisementFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [loading, setLoading] = useState(Boolean(id));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [error, setError] = useState("");
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!id) return undefined;
    let active = true;
    advertisementService.get(id).then((item) => active && setForm({ ...INITIAL, ...item, startAt: asLocal(item.startAt), endAt: asLocal(item.endAt), maxPerHour: item.frequencyCap?.maxPerHour ?? 4, minTracksBetweenAds: item.frequencyCap?.minTracksBetweenAds ?? 3, minMinutesBetweenAds: item.frequencyCap?.minMinutesBetweenAds ?? 8, countries: (item.targeting?.countries || []).join(", "), placements: (item.targeting?.placements || []).join(", "), genres: (item.targeting?.genres || []).map((value) => value?._id || value).join(", ") })).catch((nextError) => active && setError(message(nextError))).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.mediaUrl) {
      setError(`Vui lòng chọn và tải lên ${form.type === "audio" ? "file âm thanh" : "ảnh banner"}.`);
      return;
    }
    setBusy(true);
    const split = (value) => value.split(",").map((part) => part.trim()).filter(Boolean);
    const payload = { title: form.title, advertiserName: form.advertiserName, type: form.type, status: form.status, mediaUrl: form.mediaUrl, thumbnailUrl: form.thumbnailUrl, clickUrl: form.clickUrl, startAt: new Date(form.startAt).toISOString(), endAt: new Date(form.endAt).toISOString(), priority: Number(form.priority), duration: Number(form.duration), skipEnabled: form.type === "audio" && form.skipEnabled, skipAfterSeconds: Number(form.skipAfterSeconds), frequencyCap: { maxPerHour: Number(form.maxPerHour), minTracksBetweenAds: Number(form.minTracksBetweenAds), minMinutesBetweenAds: Number(form.minMinutesBetweenAds) }, targeting: { countries: split(form.countries), placements: split(form.placements), genres: split(form.genres) } };
    try { if (id) await advertisementService.update(id, payload); else await advertisementService.create(payload); navigate(routePaths.advertisements, { replace: true }); }
    catch (nextError) { setError(message(nextError)); }
    finally { setBusy(false); }
  };

  const upload = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    setUploading(true);
    setError("");
    try {
      const media = await advertisementService.upload(file, form.type);
      setForm((current) => ({ ...current, mediaUrl: media.url, duration: media.duration || current.duration }));
      setSelectedFileName(file.name);
    }
    catch (nextError) { setError(message(nextError)); }
    finally { setUploading(false); event.target.value = ""; }
  };

  if (loading) return <p className="py-20 text-center text-sm text-slate-500">Đang tải quảng cáo...</p>;
  const textFields = [["Tiêu đề", "title", true], ["Nhà quảng cáo", "advertiserName", true], ["Thumbnail URL", "thumbnailUrl"], ["Click URL", "clickUrl"], ["Quốc gia (VN, US)", "countries"], ["Genre IDs", "genres"]];
  const numberFields = [["Ưu tiên", "priority"], ["Tối đa / giờ", "maxPerHour"], ["Track tối thiểu", "minTracksBetweenAds"], ["Phút tối thiểu", "minMinutesBetweenAds"]];
  return <section className="mx-auto max-w-5xl space-y-6">
    <button type="button" onClick={() => navigate(routePaths.advertisements)} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-950"><ArrowLeft className="h-4 w-4" />Quay lại</button>
    <header><p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-600">Advertisement management</p><h1 className="mt-2 text-3xl font-bold text-slate-950">{id ? "Cập nhật quảng cáo" : "Tạo quảng cáo mới"}</h1></header>
    {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
    <form onSubmit={submit} className="space-y-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="grid gap-5 md:grid-cols-2">
        <fieldset className="md:col-span-2">
          <legend className="mb-2 text-sm font-semibold text-slate-700">Loại quảng cáo</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {[{ value: "banner", label: "Banner hình ảnh", description: "Hiển thị tại trang chủ hoặc trang tìm kiếm" }, { value: "audio", label: "Quảng cáo âm thanh", description: "Phát audio giữa các bài hát" }].map(({ value, label, description }) => {
              const selected = form.type === value;
              return <button key={value} type="button" aria-pressed={selected} onClick={() => { if (selected) return; setSelectedFileName(""); setForm((current) => ({ ...current, type: value, mediaUrl: "", duration: 0, placements: value === "audio" ? "between_tracks" : "home" })); }} className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${selected ? "border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-100" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-slate-50"}`}>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>{value === "audio" ? <FileAudio className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}</span>
                <span><span className="block text-sm font-bold">{label}</span><span className="mt-1 block text-xs font-normal text-slate-500">{description}</span></span>
              </button>;
            })}
          </div>
        </fieldset>
        {textFields.map(([label, key, required]) => <label key={key} className={key === "genres" ? "md:col-span-2" : ""}><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span><input required={required} value={form[key]} onChange={(event) => set(key, event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-blue-500" /></label>)}
        <fieldset className="md:col-span-2">
          <legend className="mb-2 text-sm font-semibold text-slate-700">Vị trí hiển thị</legend>
          {form.type === "audio" ? (
            <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800"><span className="font-bold">Giữa các bài hát</span><span className="ml-2 text-violet-600">Audio sẽ được xét phát khi một bài kết thúc tự nhiên.</span></div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {[{ value: "home", label: "Trang chủ" }, { value: "search", label: "Trang tìm kiếm" }].map((placement) => {
                const selectedPlacements = form.placements.split(",").map((item) => item.trim()).filter(Boolean);
                const checked = selectedPlacements.includes(placement.value);
                return <label key={placement.value} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${checked ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-600"}`}><input type="checkbox" checked={checked} onChange={() => { const next = checked ? selectedPlacements.filter((item) => item !== placement.value) : [...selectedPlacements, placement.value]; set("placements", next.join(",")); }} />{placement.label}</label>;
              })}
            </div>
          )}
        </fieldset>
        <label><span className="mb-2 block text-sm font-semibold text-slate-700">Trạng thái</span><select value={form.status} onChange={(event) => set("status", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3"><option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option></select></label>
        {[['Bắt đầu', 'startAt'], ['Kết thúc', 'endAt']].map(([label, key]) => <label key={key}><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span><input required type="datetime-local" value={form[key]} onChange={(event) => set(key, event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3" /></label>)}
        {numberFields.map(([label, key]) => <label key={key}><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span><input type="number" min="0" value={form[key]} onChange={(event) => set(key, event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3" /></label>)}
        {form.type === "audio" ? <><label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox" checked={form.skipEnabled} onChange={(event) => set("skipEnabled", event.target.checked)} /><span className="text-sm font-semibold">Cho phép bỏ qua</span></label><label><span className="mb-2 block text-sm font-semibold text-slate-700">Bỏ qua sau (giây)</span><input type="number" min="0" value={form.skipAfterSeconds} onChange={(event) => set("skipAfterSeconds", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3" /></label></> : null}
      </div>
      <div className="space-y-3">
        <div><p className="text-sm font-semibold text-slate-700">{form.type === "audio" ? "File âm thanh quảng cáo" : "Ảnh banner quảng cáo"} <span className="text-rose-500">*</span></p><p className="mt-1 text-xs text-slate-500">{form.type === "audio" ? "Chọn MP3, WAV, M4A, AAC hoặc FLAC; tối đa 50 MB." : "Chọn file ảnh; tối đa 10 MB."}</p></div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-5 text-center transition ${uploading ? "cursor-wait border-slate-300 bg-slate-50 text-slate-400" : "border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-500 hover:bg-blue-100"}`}>
            {uploading ? <LoaderCircle className="h-6 w-6 animate-spin" /> : form.type === "audio" ? <FileAudio className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
            <span className="text-sm font-semibold">{uploading ? "Đang tải file lên..." : form.mediaUrl ? `Chọn ${form.type === "audio" ? "file audio" : "ảnh"} khác` : `Chọn ${form.type === "audio" ? "file audio" : "ảnh banner"}`}</span>
            {selectedFileName ? <span className="max-w-full truncate text-xs text-slate-500">{selectedFileName}</span> : form.mediaUrl ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />Media đã được tải lên</span> : <span className="text-xs font-normal text-slate-500">Bấm để chọn file từ máy</span>}
            <input type="file" disabled={uploading} accept={form.type === "audio" ? "audio/*,.mp3,.wav,.m4a,.aac,.flac" : "image/*"} onChange={upload} className="hidden" />
          </label>
          <div className="flex min-h-32 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">{form.mediaUrl ? form.type === "banner" ? <img src={form.mediaUrl} alt="Preview" className="h-32 w-full object-cover" /> : <audio controls src={form.mediaUrl} className="w-full px-4" /> : <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-slate-400"><Upload className="h-5 w-5" />Chưa chọn media</div>}</div>
        </div>
      </div>
      <div className="flex justify-end gap-3"><button type="button" onClick={() => navigate(routePaths.advertisements)} className="h-11 rounded-xl border border-slate-200 px-5 font-semibold text-slate-600">Hủy</button><button disabled={busy || uploading} className="h-11 rounded-xl bg-slate-950 px-6 font-semibold text-white disabled:opacity-50">{busy ? "Đang xử lý..." : uploading ? "Đang tải media..." : "Lưu quảng cáo"}</button></div>
    </form>
  </section>;
};

export default AdvertisementFormPage;
