import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Disc, Loader2, Pencil, Upload, X } from "lucide-react";
import {
  getAdminSystemPlaylistDetailService,
  updateAdminSystemPlaylistService,
  uploadSystemPlaylistCoverService,
  deleteSystemPlaylistCoverService,
} from "../../services/playlistService";
import { routePaths } from "../../routes/routePaths";

const FormInput = ({ id, type = "text", rows, ...props }) => {
  const base = "w-full border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-black disabled:opacity-50";
  if (type === "textarea") return <textarea id={id} rows={rows ?? 3} className={`${base} resize-y`} {...props} />;
  return <input id={id} type={type} className={base} {...props} />;
};

const FieldLabel = ({ children }) => (
  <label className="block text-xs font-semibold uppercase tracking-widest text-black/40 mb-1.5">{children}</label>
);

const ToggleField = ({ checked, onChange, label, hint, disabled }) => (
  <label className="flex items-center gap-3 cursor-pointer">
    <div className="relative">
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="sr-only" />
      <div className={`w-9 h-5 rounded-full transition-colors ${checked ? "bg-black" : "bg-black/15"} ${disabled ? "opacity-50" : ""}`} />
      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-4" : ""}`} />
    </div>
    <span className="text-sm font-semibold text-black/70">{label}</span>
    {hint && <span className="text-xs text-black/30">{hint}</span>}
  </label>
);

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

  const handleChange = (field) => (event) => {
    const v = field === "isPublic" || field === "isHidden" ? event.target.checked : event.target.value;
    setForm((p) => ({ ...p, [field]: v }));
  };

  const handleCoverFileChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    setCoverFile(file); setRemoveCover(false);
    const reader = new FileReader();
    reader.onloadend = () => setCoverPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveCover = () => { setCoverFile(null); setCoverPreview(null); setRemoveCover(true); setCoverInputKey((k) => k + 1); };
  const handleRestoreCover = () => { setRemoveCover(false); };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!playlistId) return;
    setFeedback({ type: "", text: "" }); setIsSubmitting(true);
    try {
      if (coverFile) {
        setIsUploadingCover(true);
        try { await uploadSystemPlaylistCoverService(playlistId, coverFile); }
        catch (e) { setFeedback({ type: "error", text: "Could not upload cover." }); setIsSubmitting(false); return; }
        finally { setIsUploadingCover(false); }
      } else if (removeCover && hasStoredCover) {
        setIsUploadingCover(true);
        try { await deleteSystemPlaylistCoverService(playlistId); }
        catch (e) { setFeedback({ type: "error", text: "Could not remove cover." }); setIsSubmitting(false); return; }
        finally { setIsUploadingCover(false); }
      }
      await updateAdminSystemPlaylistService(playlistId, { title: form.title.trim(), description: form.description.trim(), isPublic: form.isPublic, isHidden: form.isHidden });
      toast.success("Playlist updated.");
      navigate(routePaths.systemPlaylistDetail(playlistId), { replace: true });
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Could not update.");
    } finally { setIsSubmitting(false); }
  };

  if (isLoading) {
    return (
      <section className="m-6">
        <div className="flex min-h-[200px] items-center justify-center border border-black bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-black/30" />
        </div>
      </section>
    );
  }

  if (feedback.type === "error" && !playlist) {
    return (
      <section className="m-6 space-y-4">
        <Link to={routePaths.systemPlaylists}
          className="inline-flex items-center gap-2 border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-black/60 hover:bg-black/[0.03]">
          <ArrowLeft className="h-4 w-4" /> System Playlists
        </Link>
        <div className="border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {feedback.text}
        </div>
      </section>
    );
  }

  const isBusy = isSubmitting || isUploadingCover;
  const showRestoreOption = removeCover && !coverFile;
  const currentCover = coverPreview || (playlist?.coverImage && !removeCover ? playlist.coverImage : null);

  return (
    <section className="m-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border border-black bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to={routePaths.systemPlaylistDetail(playlistId)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-black/50 hover:text-black/80">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-black/30">Edit Playlist</p>
            <h1 className="text-xl font-bold text-black">{playlist?.title}</h1>
          </div>
        </div>
        <Link to={routePaths.systemPlaylistDetail(playlistId)}
          className="inline-flex items-center gap-2 border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/60 hover:bg-black/[0.03]">
          View Detail
        </Link>
      </div>

      {feedback.text && (
        <div className={`border px-5 py-4 text-sm font-medium ${
          feedback.type === "error"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
        }`}>
          {feedback.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <div className="border border-black bg-white">
          <div className="px-6 py-4 border-b border-black/10">
            <p className="text-xs font-bold uppercase tracking-widest text-black/30">Basic Information</p>
          </div>
          <div className="space-y-4 px-6 py-5">
            <div>
              <FieldLabel>Title <span className="text-red-400">*</span></FieldLabel>
              <FormInput
                id="sys-pl-edit-title"
                required maxLength={200} value={form.title}
                onChange={handleChange("title")} disabled={isBusy}
                placeholder="Playlist title"
              />
            </div>
            <div>
              <FieldLabel>Description</FieldLabel>
              <FormInput
                id="sys-pl-edit-desc" type="textarea" rows={3}
                value={form.description} onChange={handleChange("description")} disabled={isBusy}
                placeholder="Short description"
              />
            </div>
          </div>
        </div>

        {/* Cover Image */}
        <div className="border border-black bg-white">
          <div className="px-6 py-4 border-b border-black/10">
            <p className="text-xs font-bold uppercase tracking-widest text-black/30">Cover Image</p>
          </div>
          <div className="px-6 py-5">
            <div className="flex flex-wrap items-start gap-5">
              {currentCover ? (
                <div className="relative flex-shrink-0">
                  <img src={currentCover} alt="Cover" className="h-28 w-28 object-cover ring-1 ring-black/5" />
                  <button type="button" onClick={handleRemoveCover} disabled={isBusy}
                    className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 disabled:opacity-40">
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <p className="mt-1.5 text-center text-xs text-black/30">{coverPreview ? "New cover" : "Current"}</p>
                </div>
              ) : (
                <div className="flex h-28 w-28 items-center justify-center border-2 border-dashed border-black/10 bg-black/[0.02]">
                  <Disc className="h-8 w-8 text-black/10" />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label htmlFor="sys-pl-edit-cover-file"
                  className="inline-flex cursor-pointer items-center gap-2 border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-black/70 hover:bg-black/[0.03] disabled:opacity-50">
                  <Upload className="h-4 w-4" />
                  {currentCover ? "Change Cover" : "Upload Cover"}
                  <input key={`cover-${coverInputKey}`} id="sys-pl-edit-cover-file" type="file" accept="image/*"
                    disabled={isBusy} className="sr-only" onChange={handleCoverFileChange} />
                </label>
                {showRestoreOption && (
                  <button type="button" onClick={handleRestoreCover} disabled={isBusy}
                    className="inline-flex items-center gap-2 border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-black/40 hover:bg-black/[0.03] disabled:opacity-50">
                    Restore Original
                  </button>
                )}
                <p className="text-xs text-black/25">JPEG, PNG, WebP (max 5MB)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Visibility */}
        <div className="border border-black bg-white">
          <div className="px-6 py-4 border-b border-black/10">
            <p className="text-xs font-bold uppercase tracking-widest text-black/30">Visibility</p>
          </div>
          <div className="space-y-4 px-6 py-5">
            <ToggleField checked={form.isPublic} onChange={handleChange("isPublic")} label="Public" hint="Visible to non-owner clients." disabled={isBusy} />
            <ToggleField checked={form.isHidden} onChange={handleChange("isHidden")} label="Hidden" hint="Excluded from public list." disabled={isBusy} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={isBusy || !form.title.trim()}
            className="inline-flex items-center gap-2 bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed">
            {isBusy ? <><Loader2 className="h-4 w-4 animate-spin" />{isUploadingCover ? "Uploading..." : "Saving..."}</> : "Save changes"}
          </button>
          <Link to={routePaths.systemPlaylistDetail(playlistId)}
            className="border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-black/50 hover:bg-black/[0.03]">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
};

export default SystemPlaylistEditPage;
