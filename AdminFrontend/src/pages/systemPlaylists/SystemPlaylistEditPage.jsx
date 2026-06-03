import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Disc, Loader2, Upload, X } from "lucide-react";
import {
  getAdminSystemPlaylistDetailService,
  updateAdminSystemPlaylistService,
  uploadSystemPlaylistCoverService,
  deleteSystemPlaylistCoverService,
} from "../../services/playlistService";
import { routePaths } from "../../routes/routePaths";

/* ─── Shared UI ────────────────────────────────────────────────── */
const FormInput = ({ id, type = "text", rows, label, required, hint, ...props }) => {
  const base = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100 disabled:opacity-50";
  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
          {label}{required && <span className="ml-1 text-red-400">*</span>}
        </label>
      )}
      {type === "textarea"
        ? <textarea id={id} rows={rows ?? 3} className={`${base} resize-y`} {...props} />
        : <input id={id} type={type} className={base} {...props} />
      }
      {hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
};

const SectionCard = ({ title, children }) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{title}</p>
    </div>
    <div className="p-5 space-y-4">{children}</div>
  </div>
);

const ToggleField = ({ checked, onChange, label, hint, disabled }) => (
  <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition-colors hover:bg-slate-100">
    <div>
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
    <div className="relative ml-4 shrink-0">
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="sr-only" />
      <div className={`h-5 w-9 rounded-full transition-colors duration-200 ${checked ? "bg-violet-500" : "bg-slate-300"} ${disabled ? "opacity-50" : ""}`} />
      <div className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-4" : ""}`} />
    </div>
  </label>
);

/* ─── Page ─────────────────────────────────────────────────────── */
const SystemPlaylistEditPage = () => {
  const { playlistId } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", isPublic: true, isHidden: false });
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [coverInputKey, setCoverInputKey] = useState(0);
  const [removeCover, setRemoveCover] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const hasStoredCover = Boolean(playlist?.coverImage?.trim());

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!playlistId) { setIsLoading(false); setFeedback({ type: "error", text: "Missing playlist id." }); return; }
      setIsLoading(true); setFeedback({ type: "", text: "" });
      try {
        const data = await getAdminSystemPlaylistDetailService(playlistId);
        if (!isMounted) return;
        if (!data) { setPlaylist(null); setFeedback({ type: "error", text: "Playlist not found." }); return; }
        setPlaylist(data);
        setForm({ title: data.title ?? "", description: data.description ?? "", isPublic: Boolean(data.isPublic), isHidden: Boolean(data.isHidden) });
      } catch (e) {
        if (!isMounted) return;
        setPlaylist(null);
        setFeedback({ type: "error", text: e?.response?.data?.message || e.message || "Could not load." });
      } finally { if (isMounted) setIsLoading(false); }
    };
    load();
    return () => { isMounted = false; };
  }, [playlistId]);

  const handleChange = (field) => (e) => {
    const v = field === "isPublic" || field === "isHidden" ? e.target.checked : e.target.value;
    setForm((p) => ({ ...p, [field]: v }));
  };

  const handleCoverFileChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    setCoverFile(file); setRemoveCover(false);
    const reader = new FileReader();
    reader.onloadend = () => setCoverPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveCover = () => { setCoverFile(null); setCoverPreview(null); setRemoveCover(true); setCoverInputKey((k) => k + 1); };
  const handleRestoreCover = () => { setRemoveCover(false); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!playlistId) return;
    setFeedback({ type: "", text: "" }); setIsSubmitting(true);
    try {
      if (coverFile) {
        setIsUploadingCover(true);
        try { await uploadSystemPlaylistCoverService(playlistId, coverFile); }
        catch { setFeedback({ type: "error", text: "Could not upload cover." }); setIsSubmitting(false); return; }
        finally { setIsUploadingCover(false); }
      } else if (removeCover && hasStoredCover) {
        setIsUploadingCover(true);
        try { await deleteSystemPlaylistCoverService(playlistId); }
        catch { setFeedback({ type: "error", text: "Could not remove cover." }); setIsSubmitting(false); return; }
        finally { setIsUploadingCover(false); }
      }
      await updateAdminSystemPlaylistService(playlistId, {
        title: form.title.trim(),
        description: form.description.trim(),
        isPublic: form.isPublic,
        isHidden: form.isHidden,
      });
      toast.success("Playlist updated.");
      navigate(routePaths.systemPlaylistDetail(playlistId), { replace: true });
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Could not update.");
    } finally { setIsSubmitting(false); }
  };

  /* Loading */
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center bg-slate-50 p-6">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="text-sm">Loading playlist...</p>
        </div>
      </div>
    );
  }

  /* Error */
  if (feedback.type === "error" && !playlist) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 space-y-4">
        <Link
          to={routePaths.systemPlaylists}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> System Playlists
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
          {feedback.text}
        </div>
      </div>
    );
  }

  const isBusy = isSubmitting || isUploadingCover;
  const showRestoreOption = removeCover && !coverFile;
  const currentCover = coverPreview || (playlist?.coverImage && !removeCover ? playlist.coverImage : null);

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            to={routePaths.systemPlaylistDetail(playlistId)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-slate-400">Edit Playlist</p>
            <h1 className="text-xl font-black text-slate-900">{playlist?.title}</h1>
          </div>
        </div>
        <Link
          to={routePaths.systemPlaylistDetail(playlistId)}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          View Detail
        </Link>
      </div>

      {/* Feedback */}
      {feedback.text && (
        <div className={`rounded-xl border px-5 py-4 text-sm font-medium ${
          feedback.type === "error"
            ? "border-red-200 bg-red-50 text-red-600"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
        }`}>
          {feedback.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <SectionCard title="Basic Information">
          <FormInput
            id="sys-pl-edit-title"
            label="Title"
            required
            maxLength={200}
            value={form.title}
            onChange={handleChange("title")}
            disabled={isBusy}
            placeholder="Playlist title"
          />
          <FormInput
            id="sys-pl-edit-desc"
            type="textarea"
            rows={3}
            label="Description"
            value={form.description}
            onChange={handleChange("description")}
            disabled={isBusy}
            placeholder="Short description"
          />
        </SectionCard>

        {/* Cover Image */}
        <SectionCard title="Cover Image">
          <div className="flex flex-wrap items-start gap-5">
            {/* Current cover thumbnail */}
            {currentCover ? (
              <div className="relative shrink-0">
                <img src={currentCover} alt="Cover" className="h-28 w-28 rounded-xl object-cover ring-2 ring-slate-200" />
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  disabled={isBusy}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600 disabled:opacity-40"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <p className="mt-1.5 text-center text-[10px] text-slate-400">
                  {coverPreview ? "New cover" : "Current"}
                </p>
              </div>
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
                <Disc className="h-8 w-8 text-slate-300" />
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2.5">
              <label
                htmlFor="sys-pl-edit-cover-file"
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
              >
                <Upload className="h-4 w-4" />
                {currentCover ? "Change Cover" : "Upload Cover"}
                <input
                  key={`cover-${coverInputKey}`}
                  id="sys-pl-edit-cover-file"
                  type="file"
                  accept="image/*"
                  disabled={isBusy}
                  className="sr-only"
                  onChange={handleCoverFileChange}
                />
              </label>
              {showRestoreOption && (
                <button
                  type="button"
                  onClick={handleRestoreCover}
                  disabled={isBusy}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                >
                  Restore Original
                </button>
              )}
              <p className="text-xs text-slate-400">JPEG, PNG, WebP (max 5MB)</p>
            </div>
          </div>
        </SectionCard>

        {/* Visibility */}
        <SectionCard title="Visibility & Status">
          <ToggleField
            checked={form.isPublic}
            onChange={handleChange("isPublic")}
            label="Public"
            hint="Visible to all users on the platform."
            disabled={isBusy}
          />
          <ToggleField
            checked={form.isHidden}
            onChange={handleChange("isHidden")}
            label="Hidden"
            hint="Excluded from the public playlist list."
            disabled={isBusy}
          />
        </SectionCard>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isBusy || !form.title.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-violet-200 transition-all hover:bg-violet-700 hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBusy
              ? <><Loader2 className="h-4 w-4 animate-spin" />{isUploadingCover ? "Uploading..." : "Saving..."}</>
              : "Save Changes"
            }
          </button>
          <Link
            to={routePaths.systemPlaylistDetail(playlistId)}
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

export default SystemPlaylistEditPage;
