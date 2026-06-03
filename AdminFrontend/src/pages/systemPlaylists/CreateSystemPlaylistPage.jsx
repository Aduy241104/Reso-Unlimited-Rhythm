import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Disc, Loader2, Plus, X } from "lucide-react";
import { createSystemPlaylistService, uploadSystemPlaylistCoverService } from "../../services/playlistService";
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
const CreateSystemPlaylistPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", description: "", isPublic: true, isHidden: false });
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [coverInputKey, setCoverInputKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const handleChange = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleCoverFileChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    setCoverFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setCoverPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    setCoverInputKey((k) => k + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const playlist = await createSystemPlaylistService({
        title: form.title.trim(),
        description: form.description.trim(),
        coverImage: "",
        isPublic: form.isPublic,
        isHidden: form.isHidden,
      });
      const playlistId = playlist?.id || playlist?._id;
      if (coverFile && playlistId) {
        setIsUploadingCover(true);
        try { await uploadSystemPlaylistCoverService(playlistId, coverFile); }
        catch { toast.success("Playlist created (cover upload failed — you can upload later)."); navigate(routePaths.systemPlaylists, { replace: true }); return; }
        finally { setIsUploadingCover(false); }
      }
      toast.success("Playlist created.");
      navigate(routePaths.systemPlaylists, { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Could not create playlist.");
    } finally { setIsSubmitting(false); }
  };

  const isBusy = isSubmitting || isUploadingCover;

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            to={routePaths.systemPlaylists}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-slate-400">System Playlists</p>
            <h1 className="text-xl font-black text-slate-900">Create Playlist</h1>
          </div>
        </div>
        <Link
          to={routePaths.systemPlaylists}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <SectionCard title="Basic Information">
          <FormInput
            id="sys-pl-title"
            label="Title"
            required
            maxLength={200}
            value={form.title}
            onChange={handleChange("title")}
            disabled={isBusy}
            placeholder="e.g. Weekend Focus"
          />
          <FormInput
            id="sys-pl-desc"
            type="textarea"
            rows={3}
            label="Description"
            value={form.description}
            onChange={handleChange("description")}
            disabled={isBusy}
            placeholder="Short description (optional)"
          />
        </SectionCard>

        {/* Visibility */}
        <SectionCard title="Visibility & Status">
          <ToggleField
            checked={form.isPublic}
            onChange={(e) => setForm((p) => ({ ...p, isPublic: e.target.checked }))}
            label="Public"
            hint="Visible to all users on the platform."
            disabled={isBusy}
          />
          <ToggleField
            checked={form.isHidden}
            onChange={(e) => setForm((p) => ({ ...p, isHidden: e.target.checked }))}
            label="Hidden"
            hint="Excluded from the public playlist list."
            disabled={isBusy}
          />
        </SectionCard>

        {/* Cover Image */}
        <SectionCard title="Cover Image">
          {coverPreview ? (
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <img src={coverPreview} alt="Cover" className="h-28 w-28 rounded-xl object-cover ring-2 ring-slate-200" />
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  disabled={isBusy}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600 disabled:opacity-40"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">{coverFile?.name}</p>
                <p className="mt-0.5 text-xs text-slate-400">{(coverFile?.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
          ) : (
            <label
              htmlFor="sys-pl-cover-file"
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-8 py-10 text-slate-400 transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-500"
            >
              <Disc className="h-8 w-8" />
              <div className="text-center">
                <span className="text-sm font-semibold">Click to upload cover</span>
                <p className="mt-1 text-xs text-slate-400">JPEG, PNG, WebP (max 5MB)</p>
              </div>
              <input
                key={`cover-${coverInputKey}`}
                id="sys-pl-cover-file"
                type="file"
                accept="image/*"
                disabled={isBusy}
                className="sr-only"
                onChange={handleCoverFileChange}
              />
            </label>
          )}
          <p className="text-xs text-slate-400">Optional. Leave blank for default cover.</p>
        </SectionCard>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isBusy || !form.title.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-violet-200 transition-all hover:bg-violet-700 hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBusy
              ? <><Loader2 className="h-4 w-4 animate-spin" />{isUploadingCover ? "Uploading..." : "Creating..."}</>
              : <><Plus className="h-4 w-4" />Create Playlist</>
            }
          </button>
          <Link
            to={routePaths.systemPlaylists}
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

export default CreateSystemPlaylistPage;
