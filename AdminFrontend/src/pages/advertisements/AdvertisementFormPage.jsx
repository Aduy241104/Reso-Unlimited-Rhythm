import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, FileAudio, LoaderCircle, Upload } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import advertisementService from "../../services/advertisementService";
import { routePaths } from "../../routes/routePaths";

const asLocal = (value = new Date()) => new Date(new Date(value).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const INITIAL = {
  title: "",
  advertiserName: "",
  type: "audio",
  status: "draft",
  mediaUrl: "",
  thumbnailUrl: "",
  clickUrl: "",
  startAt: asLocal(),
  endAt: asLocal(Date.now() + 86400000),
  priority: 1,
  maxPerHour: 4,
  minTracksBetweenAds: 3,
  minMinutesBetweenAds: 8,
  skipEnabled: true,
  skipAfterSeconds: 5,
  duration: 0,
};

const getErrorMessage = (error) => error?.response?.data?.message || error?.message || "Không thể lưu quảng cáo.";

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
    advertisementService.get(id)
      .then((item) => {
        if (!active) return;
        setForm({
          ...INITIAL,
          ...item,
          type: "audio",
          mediaUrl: item?.type === "audio" ? item.mediaUrl : "",
          startAt: asLocal(item.startAt),
          endAt: asLocal(item.endAt),
          maxPerHour: item.frequencyCap?.maxPerHour ?? 4,
          minTracksBetweenAds: item.frequencyCap?.minTracksBetweenAds ?? 3,
          minMinutesBetweenAds: item.frequencyCap?.minMinutesBetweenAds ?? 8,
        });
      })
      .catch((nextError) => active && setError(getErrorMessage(nextError)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.mediaUrl) {
      setError("Vui lòng chọn và tải lên file âm thanh.");
      return;
    }

    setBusy(true);
    const payload = {
      title: form.title,
      advertiserName: form.advertiserName,
      type: "audio",
      status: form.status,
      mediaUrl: form.mediaUrl,
      thumbnailUrl: form.thumbnailUrl,
      clickUrl: form.clickUrl,
      startAt: new Date(form.startAt).toISOString(),
      endAt: new Date(form.endAt).toISOString(),
      priority: Number(form.priority),
      duration: Number(form.duration),
      skipEnabled: Boolean(form.skipEnabled),
      skipAfterSeconds: Number(form.skipAfterSeconds),
      frequencyCap: {
        maxPerHour: Number(form.maxPerHour),
        minTracksBetweenAds: Math.max(3, Number(form.minTracksBetweenAds) || 0),
        minMinutesBetweenAds: Number(form.minMinutesBetweenAds),
      },
    };

    try {
      if (id) await advertisementService.update(id, payload);
      else await advertisementService.create(payload);
      navigate(routePaths.advertisements, { replace: true });
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  };

  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const media = await advertisementService.upload(file, "audio");
      setForm((current) => ({ ...current, mediaUrl: media.url, duration: media.duration || current.duration }));
      setSelectedFileName(file.name);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  if (loading) return <p className="py-20 text-center text-sm text-slate-500">Đang tải quảng cáo...</p>;

  const textFields = [
    ["Tiêu đề", "title", true],
    ["Nhà quảng cáo", "advertiserName", true],
    ["Thumbnail URL", "thumbnailUrl"],
    ["Click URL", "clickUrl"],
  ];
  const numberFields = [
    ["Ưu tiên", "priority"],
    ["Tối đa / giờ", "maxPerHour"],
    ["Track tối thiểu", "minTracksBetweenAds"],
    ["Phút tối thiểu", "minMinutesBetweenAds"],
  ];

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <button type="button" onClick={() => navigate(routePaths.advertisements)} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-950"><ArrowLeft className="h-4 w-4" />Quay lại</button>
      <header><p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-600">Advertisement management</p><h1 className="mt-2 text-3xl font-bold text-slate-950">{id ? "Cập nhật quảng cáo" : "Tạo quảng cáo mới"}</h1></header>
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <form onSubmit={submit} className="space-y-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="grid gap-5 md:grid-cols-2">
          <fieldset className="md:col-span-2">
            <legend className="mb-2 text-sm font-semibold text-slate-700">Loại quảng cáo</legend>
            <div className="flex items-center gap-3 rounded-2xl border border-blue-500 bg-blue-50 p-4 text-blue-800 ring-2 ring-blue-100"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white"><FileAudio className="h-5 w-5" /></span><span><span className="block text-sm font-bold">Quảng cáo âm thanh</span><span className="mt-1 block text-xs font-normal text-slate-500">Phát audio giữa các bài hát</span></span></div>
          </fieldset>

          {textFields.map(([label, key, required]) => <label key={key}><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span><input required={required} value={form[key]} onChange={(event) => set(key, event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-blue-500" /></label>)}

          <label><span className="mb-2 block text-sm font-semibold text-slate-700">Trạng thái</span><select value={form.status} onChange={(event) => set("status", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3"><option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option></select></label>
          {[['Bắt đầu', 'startAt'], ['Kết thúc', 'endAt']].map(([label, key]) => <label key={key}><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span><input required type="datetime-local" value={form[key]} onChange={(event) => set(key, event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3" /></label>)}
          {numberFields.map(([label, key]) => <label key={key}><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span><input type="number" min={key === "minTracksBetweenAds" ? 3 : 0} value={form[key]} onChange={(event) => set(key, event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3" /></label>)}
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox" checked={form.skipEnabled} onChange={(event) => set("skipEnabled", event.target.checked)} /><span className="text-sm font-semibold">Cho phép bỏ qua</span></label>
          <label><span className="mb-2 block text-sm font-semibold text-slate-700">Bỏ qua sau (giây)</span><input type="number" min="0" value={form.skipAfterSeconds} onChange={(event) => set("skipAfterSeconds", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
        </div>

        <div className="space-y-3">
          <div><p className="text-sm font-semibold text-slate-700">File âm thanh quảng cáo <span className="text-rose-500">*</span></p><p className="mt-1 text-xs text-slate-500">Chọn MP3, WAV, M4A, AAC hoặc FLAC; tối đa 50 MB.</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-5 text-center transition ${uploading ? "cursor-wait border-slate-300 bg-slate-50 text-slate-400" : "border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-500 hover:bg-blue-100"}`}>
              {uploading ? <LoaderCircle className="h-6 w-6 animate-spin" /> : <FileAudio className="h-6 w-6" />}
              <span className="text-sm font-semibold">{uploading ? "Đang tải file lên..." : form.mediaUrl ? "Chọn file audio khác" : "Chọn file audio"}</span>
              {selectedFileName ? <span className="max-w-full truncate text-xs text-slate-500">{selectedFileName}</span> : form.mediaUrl ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />Media đã được tải lên</span> : <span className="text-xs font-normal text-slate-500">Bấm để chọn file từ máy</span>}
              <input type="file" disabled={uploading} accept="audio/*,.mp3,.wav,.m4a,.aac,.flac" onChange={upload} className="hidden" />
            </label>
            <div className="flex min-h-32 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">{form.mediaUrl ? <audio controls src={form.mediaUrl} className="w-full px-4" /> : <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-slate-400"><Upload className="h-5 w-5" />Chưa chọn media</div>}</div>
          </div>
        </div>

        <div className="flex justify-end gap-3"><button type="button" onClick={() => navigate(routePaths.advertisements)} className="h-11 rounded-xl border border-slate-200 px-5 font-semibold text-slate-600">Hủy</button><button disabled={busy || uploading} className="h-11 rounded-xl bg-slate-950 px-6 font-semibold text-white disabled:opacity-50">{busy ? "Đang xử lý..." : uploading ? "Đang tải media..." : "Lưu quảng cáo"}</button></div>
      </form>
    </section>
  );
};

export default AdvertisementFormPage;
