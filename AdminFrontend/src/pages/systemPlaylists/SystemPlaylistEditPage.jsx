import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  getAdminSystemPlaylistDetailService,
  updateAdminSystemPlaylistService,
} from "../../services/playlistService";
import { routePaths } from "../../routes/routePaths";

const SystemPlaylistEditPage = () => {
  const { playlistId } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    coverImage: "",
    isPublic: true,
    isHidden: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!playlistId) {
        setIsLoading(false);
        setFeedback({ type: "error", text: "Missing playlist id." });
        return;
      }

      setIsLoading(true);
      setFeedback({ type: "", text: "" });

      try {
        const data = await getAdminSystemPlaylistDetailService(playlistId);
        if (!isMounted) {
          return;
        }
        if (!data) {
          setPlaylist(null);
          setFeedback({ type: "error", text: "Playlist not found." });
          return;
        }
        setPlaylist(data);
        setForm({
          title: data.title ?? "",
          description: data.description ?? "",
          coverImage: data.coverImage ?? "",
          isPublic: Boolean(data.isPublic),
          isHidden: Boolean(data.isHidden),
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setPlaylist(null);
        setFeedback({
          type: "error",
          text:
            error?.response?.data?.message ||
            error?.message ||
            "Could not load this playlist.",
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [playlistId]);

  const handleChange = (field) => (event) => {
    const value =
      field === "isPublic" || field === "isHidden"
        ? event.target.checked
        : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!playlistId) {
      return;
    }

    setFeedback({ type: "", text: "" });
    setIsSubmitting(true);

    try {
      await updateAdminSystemPlaylistService(playlistId, {
        title: form.title.trim(),
        description: form.description.trim(),
        coverImage: form.coverImage.trim(),
        isPublic: form.isPublic,
        isHidden: form.isHidden,
      });
      navigate(routePaths.systemPlaylistDetail(playlistId), { replace: true });
    } catch (error) {
      setFeedback({
        type: "error",
        text:
          error?.response?.data?.message ||
          error?.message ||
          "Could not update the system playlist.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="flex min-h-[240px] flex-col items-center justify-center rounded-[2rem] border border-black bg-white p-10 text-black/60">
        <Loader2 className="h-8 w-8 animate-spin text-black" aria-hidden />
        <p className="mt-4 text-sm">Loading playlist…</p>
      </section>
    );
  }

  if (feedback.type === "error" && !playlist) {
    return (
      <section className="space-y-6">
        <Link
          to={routePaths.systemPlaylists}
          className="inline-flex items-center gap-2 text-sm font-semibold text-black underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to system playlists
        </Link>
        <div className="rounded-[2rem] border border-red-600 bg-red-50 px-6 py-4 text-sm text-red-900">
          {feedback.text}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={routePaths.systemPlaylistDetail(playlistId)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-black underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to playlist detail
        </Link>
      </div>

      <div className="rounded-[2rem] border border-black bg-white p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-black/50">
          System playlist management
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-black">Edit system playlist</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-black/70">
          Update metadata and visibility. Hidden playlists do not appear in the public system
          list.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-6 rounded-[2rem] border border-black bg-white p-8"
      >
        <div>
          <label
            htmlFor="sys-pl-edit-title"
            className="block text-xs font-semibold uppercase tracking-[0.24em] text-black/45"
          >
            Title <span className="text-red-600">*</span>
          </label>
          <input
            id="sys-pl-edit-title"
            type="text"
            required
            maxLength={200}
            value={form.title}
            onChange={handleChange("title")}
            className="mt-2 w-full rounded-2xl border border-black bg-white px-4 py-3 text-sm text-black outline-none transition focus:ring-4 focus:ring-black/10"
          />
        </div>

        <div>
          <label
            htmlFor="sys-pl-edit-desc"
            className="block text-xs font-semibold uppercase tracking-[0.24em] text-black/45"
          >
            Description
          </label>
          <textarea
            id="sys-pl-edit-desc"
            rows={4}
            value={form.description}
            onChange={handleChange("description")}
            className="mt-2 w-full resize-y rounded-2xl border border-black bg-white px-4 py-3 text-sm text-black outline-none transition focus:ring-4 focus:ring-black/10"
          />
        </div>

        <div>
          <label
            htmlFor="sys-pl-edit-cover"
            className="block text-xs font-semibold uppercase tracking-[0.24em] text-black/45"
          >
            Cover image URL
          </label>
          <input
            id="sys-pl-edit-cover"
            type="url"
            inputMode="url"
            value={form.coverImage}
            onChange={handleChange("coverImage")}
            className="mt-2 w-full rounded-2xl border border-black bg-white px-4 py-3 text-sm text-black outline-none transition focus:ring-4 focus:ring-black/10"
            placeholder="https://… (optional)"
          />
        </div>

        <div className="space-y-3 rounded-2xl border border-black/15 bg-black/[0.02] px-4 py-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-black">
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={handleChange("isPublic")}
              className="mt-1 h-4 w-4 rounded border border-black text-black focus:ring-black/20"
            />
            <span>
              <span className="font-semibold">Public</span>
              <span className="mt-1 block text-xs text-black/55">
                When public, non-owner clients may see this playlist where your product exposes
                public playlists.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-black">
            <input
              type="checkbox"
              checked={form.isHidden}
              onChange={handleChange("isHidden")}
              className="mt-1 h-4 w-4 rounded border border-black text-black focus:ring-black/20"
            />
            <span>
              <span className="font-semibold">Hidden</span>
              <span className="mt-1 block text-xs text-black/55">
                Hidden system playlists are excluded from the public system playlist list.
              </span>
            </span>
          </label>
        </div>

        {feedback.text ? (
          <div
            className={[
              "rounded-2xl border px-4 py-3 text-sm",
              feedback.type === "error"
                ? "border-red-600 bg-red-50 text-red-900"
                : "border-black bg-white text-black",
            ].join(" ")}
            role="status"
          >
            {feedback.text}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || !form.title.trim()}
          className="rounded-2xl bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving…" : "Save changes"}
        </button>
      </form>
    </section>
  );
};

export default SystemPlaylistEditPage;
