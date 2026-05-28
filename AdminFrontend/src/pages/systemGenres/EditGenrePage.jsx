import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, Plus, Upload, X } from "lucide-react";
import {
  getAdminGenreService,
  updateAdminGenreService,
  uploadAdminGenreImageService,
} from "../../services/adminGenreService";
import { routePaths } from "../../routes/routePaths";

const EditGenrePage = () => {
  const { genreId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", description: "", isActive: true, image: "" });
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    const loadGenre = async () => {
      setIsLoading(true);
      try {
        const genre = await getAdminGenreService(genreId);
        if (!active) return;
        if (!genre) {
          setMessage("Genre not found.");
          return;
        }
        setForm({
          name: genre.name || "",
          description: genre.description || "",
          isActive: typeof genre.isActive !== "undefined" ? genre.isActive : true,
          image: genre.image || "",
        });
        setCoverPreview(genre.image || "");
      } catch (error) {
        setMessage(error?.response?.data?.message || error?.message || "Could not load genre.");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadGenre();

    return () => {
      active = false;
    };
  }, [genreId]);

  const handleChange = (field) => (event) => {
    const value = field === "isActive" ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCoverChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    setCoverFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setCoverPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const clearCover = () => {
    setCoverFile(null);
    setCoverPreview("");
    setForm((prev) => ({ ...prev, image: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      let imageUrl = form.image || "";
      if (coverFile) {
        imageUrl = await uploadAdminGenreImageService(coverFile);
      }

      await updateAdminGenreService(genreId, {
        name: form.name.trim(),
        description: form.description.trim(),
        isActive: form.isActive,
        image: imageUrl,
      });

      toast.success("Genre updated successfully.");
      navigate(routePaths.genres, { replace: true });
    } catch (error) {
      setMessage(error?.response?.data?.message || error?.message || "Could not update genre.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded border border-black bg-white p-8 text-center text-black/50">
        <Loader2 className="mx-auto mb-4 h-6 w-6 animate-spin" />
        Loading genre details...
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 rounded border border-black bg-white p-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-black/50">Genre Management</p>
          <h1 className="mt-3 text-4xl font-semibold text-black">Edit Genre</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/70">Update genre name, description, image, and active status.</p>
        </div>
        <Link
          to={routePaths.genres}
          className="inline-flex items-center justify-center rounded bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/90"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="rounded border border-black bg-white p-6 space-y-6">
        {message && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-[1fr_0.8fr]">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-black/70">Genre Name</label>
            <input
              type="text"
              value={form.name}
              onChange={handleChange("name")}
              placeholder="e.g. Pop, Rock, Lofi"
              required
              className="w-full rounded border border-black/10 bg-slate-50 px-4 py-3 text-sm text-black outline-none focus:border-black"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-black/70">Active</label>
            <label className="inline-flex items-center gap-3 rounded border border-black/10 bg-slate-50 px-4 py-3 text-sm text-black">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={handleChange("isActive")}
                disabled={isSubmitting}
                className="h-4 w-4 rounded border-black/10"
              />
              Enabled
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-black/70">Description</label>
          <textarea
            value={form.description}
            onChange={handleChange("description")}
            rows={4}
            className="w-full rounded border border-black/10 bg-slate-50 px-4 py-3 text-sm text-black outline-none focus:border-black resize-y"
            disabled={isSubmitting}
            placeholder="Optional description"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-black/70">Genre Image</label>
          <div className="rounded border border-black/10 bg-slate-50 p-4">
            {coverPreview ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <img src={coverPreview} alt="Preview" className="h-28 w-28 rounded object-cover border border-black/10" />
                <div className="flex flex-1 items-center justify-between gap-3">
                  <p className="text-sm text-black/70">Upload a new image or keep the current one.</p>
                  <button type="button" onClick={clearCover} disabled={isSubmitting} className="inline-flex items-center gap-2 rounded border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-black/[0.03]">
                    <X className="h-4 w-4" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-3 rounded border border-dashed border-black/30 bg-white px-4 py-8 text-center text-sm font-semibold text-black/50 hover:border-black/40 hover:text-black/80">
                <Upload className="h-5 w-5" />
                Select image
                <input type="file" accept="image/*" className="sr-only" onChange={handleCoverChange} disabled={isSubmitting} />
              </label>
            )}
            <p className="mt-3 text-xs text-black/40">Optional cover image for the genre.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting || !form.name.trim()}
            className="inline-flex items-center gap-2 rounded bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Plus className="h-4 w-4" /> Update Genre</>}
          </button>
          <Link
            to={routePaths.genres}
            className="inline-flex items-center justify-center rounded border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-black/[0.03]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
};

export default EditGenrePage;
