import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Disc, Loader2, Plus, Upload, X } from "lucide-react";
import {
  createSystemPlaylistService,
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

const CreateSystemPlaylistPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    isPublic: true,
    isHidden: false,
  });
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [coverInputKey, setCoverInputKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const handleChange = (field) => (event) =>
    setForm((p) => ({ ...p, [field]: event.target.value }));

  const handleCoverFileChange = (event) => {
    const file = event.target.files?.[0] ?? null;
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

  const handleSubmit = async (event) => {
    event.preventDefault();
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
        try {
          await uploadSystemPlaylistCoverService(playlistId, coverFile);
        } catch (e) {
          toast.success(
            "Playlist created (cover upload failed — you can upload later)."
          );
          navigate(routePaths.systemPlaylists, { replace: true });
          return;
        } finally {
          setIsUploadingCover(false);
        }
      }
      toast.success("Playlist created.");
      navigate(routePaths.systemPlaylists, { replace: true });
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Could not create playlist."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = isSubmitting || isUploadingCover;

  return (
    <section className="space-y-5 p-3 lg:p-5 bg-slate-50/50 min-h-screen text-slate-800 font-sans antialiased">

      {/* Header */}
      <div className="flex items-center gap-4 px-1">
        <Link
          to={routePaths.systemPlaylists}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4.5 w-4.5" style={{ color: "#64748b" }} />
        </Link>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            New Playlist
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            Create System Playlist
          </h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Basic Info Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Basic Information</h2>
          <div className="space-y-5">
            <div>
              <FieldLabel required>Title</FieldLabel>
              <FormInput
                id="sys-pl-title"
                required
                maxLength={200}
                value={form.title}
                onChange={handleChange("title")}
                disabled={isBusy}
                placeholder="e.g. Weekend Focus"
              />
            </div>
            <div>
              <FieldLabel>Description</FieldLabel>
              <FormInput
                id="sys-pl-desc"
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
          {coverPreview ? (
            <div className="flex items-center gap-5">
              <div className="relative flex-shrink-0">
                <img
                  src={coverPreview}
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
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {coverFile?.name}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: "#94a3b8" }}>
                  {(coverFile?.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          ) : (
            <label
              htmlFor="sys-pl-cover-file"
              className="flex flex-col items-center justify-center gap-3 cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-10 transition hover:border-blue-300 hover:bg-slate-100"
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50"
              >
                <Disc className="h-7 w-7 text-blue-500" />
              </div>
              <div className="text-center">
                <span className="text-sm font-medium text-slate-700">
                  Click to upload cover
                </span>
                <p className="mt-1 text-xs" style={{ color: "#94a3b8" }}>
                  JPEG, PNG, WebP (max 5MB)
                </p>
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
          <p className="mt-3 text-xs" style={{ color: "#94a3b8" }}>
            Optional. Leave blank for default cover.
          </p>
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
                onChange={(e) =>
                  setForm((p) => ({ ...p, isPublic: e.target.checked }))
                }
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
                onChange={(e) =>
                  setForm((p) => ({ ...p, isHidden: e.target.checked }))
                }
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
                {isUploadingCover ? "Uploading..." : "Creating..."}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Create playlist
              </>
            )}
          </button>
          <Link
            to={routePaths.systemPlaylists}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
};

export default CreateSystemPlaylistPage;
