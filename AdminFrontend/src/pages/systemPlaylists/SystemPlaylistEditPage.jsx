import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Disc, Loader2, Pencil, Upload, X } from "lucide-react";
import {
  deleteSystemPlaylistCoverService,
  getAdminSystemPlaylistDetailService,
  updateAdminSystemPlaylistService,
  uploadSystemPlaylistCoverService,
} from "../../services/playlistService";
import { routePaths } from "../../routes/routePaths";

const FormInput = ({ id, type = "text", rows, ...props }) => {
  const base = `w-full rounded-xl px-4 py-3 text-sm outline-none transition disabled:opacity-50`;
  const styling = {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#1e293b",
  };
  if (type === "textarea")
    return (
      <textarea
        id={id}
        rows={rows ?? 3}
        className={`${base} resize-y`}
        style={styling}
        {...props}
      />
    );
  return <input id={id} type={type} className={base} style={styling} {...props} />;
};

const FieldLabel = ({ children, required = false }) => (
  <label
    className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.25em]"
    style={{ color: "#64748b" }}
  >
    {children}
    {required && <span className="ml-1 text-red-500">*</span>}
  </label>
);

const ToggleField = ({ checked, onChange, label, hint, disabled }) => (
  <label className="flex cursor-pointer items-center gap-3">
    <div className="relative">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
      />
      <div
        className={`h-5 w-9 rounded-full transition-colors ${disabled ? "opacity-50" : ""}`}
        style={{ backgroundColor: checked ? "#1e40af" : "#cbd5e1" }}
      />
      <div
        className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full shadow transition-transform"
        style={{
          backgroundColor: "white",
          transform: checked ? "translateX(16px)" : "translateX(0)",
        }}
      />
    </div>
    <span className="text-sm font-medium text-slate-700">{label}</span>
    {hint && (
      <span className="text-xs" style={{ color: "#94a3b8" }}>
        {hint}
      </span>
    )}
  </label>
);

const SystemPlaylistEditPage = () => {
  const { playlistId } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    isPublic: true,
    isHidden: false,
  });
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [coverInputKey, setCoverInputKey] = useState(0);
  const [removeCover, setRemoveCover] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const hasStoredCover = Boolean(playlist?.coverImage?.trim());

  const load = useCallback(async () => {
    if (!playlistId) {
      setIsLoading(false);
      setFeedback({ type: "error", text: "Missing playlist id." });
      return;
    }
    setIsLoading(true);
    setFeedback({ type: "", text: "" });
    try {
      const data = await getAdminSystemPlaylistDetailService(playlistId);
      if (!data) {
        setPlaylist(null);
        setFeedback({ type: "error", text: "Playlist not found." });
        return;
      }
      setPlaylist(data);
      setForm({
        title: data.title ?? "",
        description: data.description ?? "",
        isPublic: Boolean(data.isPublic),
        isHidden: Boolean(data.isHidden),
      });
    } catch (e) {
      setPlaylist(null);
      setFeedback({
        type: "error",
        text: e?.response?.data?.message || e.message || "Could not load.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [playlistId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (field) => (event) => {
    const v =
      field === "isPublic" || field === "isHidden"
        ? event.target.checked
        : event.target.value;
    setForm((p) => ({ ...p, [field]: v }));
  };

  const handleCoverFileChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    setCoverFile(file);
    setRemoveCover(false);
    const reader = new FileReader();
    reader.onloadend = () => setCoverPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    setRemoveCover(true);
    setCoverInputKey((k) => k + 1);
  };

  const handleRestoreCover = () => {
    setRemoveCover(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!playlistId) return;
    setFeedback({ type: "", text: "" });
    setIsSubmitting(true);
    try {
      if (coverFile) {
        setIsUploadingCover(true);
        try {
          await uploadSystemPlaylistCoverService(playlistId, coverFile);
        } catch (e) {
          setFeedback({ type: "error", text: "Could not upload cover." });
          setIsSubmitting(false);
          return;
        } finally {
          setIsUploadingCover(false);
        }
      } else if (removeCover && hasStoredCover) {
        setIsUploadingCover(true);
        try {
          await deleteSystemPlaylistCoverService(playlistId);
        } catch (e) {
          setFeedback({ type: "error", text: "Could not remove cover." });
          setIsSubmitting(false);
          return;
        } finally {
          setIsUploadingCover(false);
        }
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
      toast.error(
        e?.response?.data?.message || e.message || "Could not update."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="flex items-center justify-center rounded-2xl shadow-sm"
          style={{ backgroundColor: "white", border: "1px solid #e2e8f0", minWidth: 200, minHeight: 200 }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (feedback.type === "error" && !playlist) {
    return (
      <section className="space-y-4 max-w-[800px] mx-auto p-6">
        <Link
          to={routePaths.systemPlaylists}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> System Playlists
        </Link>
        <div
          className="rounded-xl border px-5 py-4 text-sm"
          style={{
            borderColor: "#fca5a5",
            backgroundColor: "#fef2f2",
            color: "#dc2626",
          }}
        >
          {feedback.text}
        </div>
      </section>
    );
  }

  const isBusy = isSubmitting || isUploadingCover;
  const showRestoreOption = removeCover && !coverFile;
  const currentCover =
    coverPreview ||
    (playlist?.coverImage && !removeCover ? playlist.coverImage : null);

  return (
    <section className="space-y-5 p-3 lg:p-5 bg-slate-50/50 min-h-screen text-slate-800 font-sans antialiased">

      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-4">
          <Link
            to={routePaths.systemPlaylistDetail(playlistId)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4.5 w-4.5" style={{ color: "#64748b" }} />
          </Link>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              Edit Playlist
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
              {playlist?.title}
            </h1>
          </div>
        </div>
        <Link
          to={routePaths.systemPlaylistDetail(playlistId)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition hover:bg-slate-50"
        >
          View Detail
        </Link>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">

        {feedback.text && (
          <div
            className="rounded-xl border px-5 py-4 text-sm font-medium"
            style={
              feedback.type === "error"
                ? { borderColor: "#fca5a5", backgroundColor: "#fef2f2", color: "#dc2626" }
                : { borderColor: "#bbf7d0", backgroundColor: "#f0fdf4", color: "#16a34a" }
            }
          >
            {feedback.text}
          </div>
        )}

        {/* Basic Info Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Basic Information</h2>
          <div className="space-y-5">
            <div>
              <FieldLabel required>Title</FieldLabel>
              <FormInput
                id="sys-pl-edit-title"
                required
                maxLength={200}
                value={form.title}
                onChange={handleChange("title")}
                disabled={isBusy}
                placeholder="Playlist title"
              />
            </div>
            <div>
              <FieldLabel>Description</FieldLabel>
              <FormInput
                id="sys-pl-edit-desc"
                type="textarea"
                rows={3}
                value={form.description}
                onChange={handleChange("description")}
                disabled={isBusy}
                placeholder="Short description for this playlist"
              />
            </div>
          </div>
        </div>

        {/* Cover Image Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Cover Image</h2>
          <div className="flex flex-wrap items-start gap-5">
            {currentCover ? (
              <div className="relative flex-shrink-0">
                <img
                  src={currentCover}
                  alt="Cover"
                  className="h-28 w-28 rounded-2xl object-cover shadow-sm"
                />
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  disabled={isBusy}
                  className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full transition hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: "#dc2626", color: "white" }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <p className="mt-1.5 text-center text-xs" style={{ color: "#94a3b8" }}>
                  {coverPreview ? "New cover" : "Current"}
                </p>
              </div>
            ) : (
              <div
                className="flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50"
              >
                <Disc className="h-8 w-8 text-slate-300" />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="sys-pl-edit-cover-file"
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" style={{ color: "#64748b" }} />
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
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Restore Original
                </button>
              )}
              <p className="text-xs" style={{ color: "#94a3b8" }}>
                JPEG, PNG, WebP (max 5MB)
              </p>
            </div>
          </div>
        </div>

        {/* Settings Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Settings</h2>
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: "#64748b" }}>
                Visibility
              </p>
              <ToggleField
                checked={form.isPublic}
                onChange={handleChange("isPublic")}
                label="Public"
                hint="Visible to all users."
                disabled={isBusy}
              />
            </div>
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: "#64748b" }}>
                Status
              </p>
              <ToggleField
                checked={form.isHidden}
                onChange={handleChange("isHidden")}
                label="Hidden"
                hint="Excluded from public list."
                disabled={isBusy}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isBusy || !form.title.trim()}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: "#1e40af", color: "white" }}
          >
            {isBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isUploadingCover ? "Uploading..." : "Saving..."}
              </>
            ) : (
              <>
                <Pencil className="h-4 w-4" /> Save changes
              </>
            )}
          </button>
          <Link
            to={routePaths.systemPlaylistDetail(playlistId)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-medium shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
};

export default SystemPlaylistEditPage;
