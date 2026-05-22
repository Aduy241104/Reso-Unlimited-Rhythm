import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Disc, Loader2, Plus, Upload, X } from "lucide-react";
import { createSystemPlaylistService, uploadSystemPlaylistCoverService } from "../../services/playlistService";
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

const CreateSystemPlaylistPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", description: "", isPublic: true, isHidden: false });
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [coverInputKey, setCoverInputKey] = useState(0);
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const handleChange = (field) => (event) => setForm((p) => ({ ...p, [field]: event.target.value }));

  const handleCoverFileChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    setCoverFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setCoverPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveCover = () => { setCoverFile(null); setCoverPreview(null); setCoverInputKey((k) => k + 1); };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback({ type: "", text: "" });
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
        catch (e) {
          toast.success("Playlist created (cover upload failed — you can upload later).");
          navigate(routePaths.systemPlaylists, { replace: true });
          return;
        } finally { setIsUploadingCover(false); }
      }
      toast.success("Playlist created.");
      navigate(routePaths.systemPlaylists, { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Could not create playlist.");
    } finally { setIsSubmitting(false); }
  };

  const isBusy = isSubmitting || isUploadingCover;

  return (
    <section className="m-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border border-black bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to={routePaths.systemPlaylists}
            className="inline-flex items-center gap-2 text-sm font-semibold text-black/50 hover:text-black/80">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-black/30">New Playlist</p>
            <h1 className="text-xl font-bold text-black">Create System Playlist</h1>
          </div>
        </div>
        <Link to={routePaths.systemPlaylists}
          className="inline-flex items-center gap-2 border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/60 hover:bg-black/[0.03]">
          Back to List
        </Link>
      </div>

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
                id="sys-pl-title"
                required maxLength={200} value={form.title}
                onChange={handleChange("title")} disabled={isBusy}
                placeholder="e.g. Weekend Focus"
              />
            </div>
            <div>
              <FieldLabel>Description</FieldLabel>
              <FormInput
                id="sys-pl-desc" type="textarea" rows={3}
                value={form.description} onChange={handleChange("description")} disabled={isBusy}
                placeholder="Short description"
              />
            </div>

            {/* Visibility & Status */}
            <div className="space-y-4 pt-2">
              <div>
                <FieldLabel>Visibility</FieldLabel>
                <div className="mt-2">
                  <ToggleField 
                    checked={form.isPublic} 
                    onChange={(e) => setForm((p) => ({ ...p, isPublic: e.target.checked }))} 
                    label="Public" 
                    hint="Visible to non-owner clients." 
                    disabled={isBusy} 
                  />
                </div>
              </div>

              <div>
                <FieldLabel>Status</FieldLabel>
                <div className="mt-2">
                  <ToggleField 
                    checked={form.isHidden} 
                    onChange={(e) => setForm((p) => ({ ...p, isHidden: e.target.checked }))} 
                    label="Hidden" 
                    hint="Excluded from public list." 
                    disabled={isBusy} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cover Image */}
        <div className="border border-black bg-white">
          <div className="px-6 py-4 border-b border-black/10">
            <p className="text-xs font-bold uppercase tracking-widest text-black/30">Cover Image</p>
          </div>
          <div className="px-6 py-5">
            {coverPreview ? (
              <div className="flex items-center gap-5">
                <div className="relative flex-shrink-0">
                  <img src={coverPreview} alt="Cover" className="h-28 w-28 object-cover ring-1 ring-black/5" />
                  <button type="button" onClick={handleRemoveCover} disabled={isBusy}
                    className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 disabled:opacity-40">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div>
                  <p className="text-sm font-semibold text-black/70">{coverFile?.name}</p>
                  <p className="mt-0.5 text-xs text-black/30">{(coverFile?.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            ) : (
              <label htmlFor="sys-pl-cover-file"
                className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-black/10 bg-black/[0.02] px-8 py-10 text-black/30 cursor-pointer hover:border-black/20 hover:bg-black/[0.03]">
                <Disc className="h-8 w-8" />
                <div className="text-center">
                  <span className="text-sm font-semibold">Click to upload cover</span>
                  <p className="mt-1 text-xs text-black/20">JPEG, PNG, WebP (max 5MB)</p>
                </div>
                <input key={`cover-${coverInputKey}`} id="sys-pl-cover-file" type="file" accept="image/*"
                  disabled={isBusy} className="sr-only" onChange={handleCoverFileChange} />
              </label>
            )}
            <p className="mt-3 text-xs text-black/20">Optional. Leave blank for default cover.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={isBusy || !form.title.trim()}
            className="inline-flex items-center gap-2 bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed">
            {isBusy ? <><Loader2 className="h-4 w-4 animate-spin" />{isUploadingCover ? "Uploading..." : "Creating..."}</> : <><Plus className="h-4 w-4" /> Create playlist</>}
          </button>
          <Link to={routePaths.systemPlaylists}
            className="border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-black/50 hover:bg-black/[0.03]">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
};

export default CreateSystemPlaylistPage;
