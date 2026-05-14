import { useState } from "react";
import { createSystemPlaylistService } from "../../services/playlistService";

const initialForm = {
  title: "",
  description: "",
  coverImage: "",
};

const CreateSystemPlaylistPage = () => {
  const [form, setForm] = useState(initialForm);
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [createdSummary, setCreatedSummary] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback({ type: "", text: "" });
    setCreatedSummary(null);
    setIsSubmitting(true);

    try {
      const playlist = await createSystemPlaylistService({
        title: form.title.trim(),
        description: form.description.trim(),
        coverImage: form.coverImage.trim(),
      });
      setCreatedSummary(playlist);
      setForm(initialForm);
      setFeedback({
        type: "success",
        text: "System playlist created successfully.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        text:
          error?.response?.data?.message ||
          error?.message ||
          "Could not create the system playlist.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-8">
      <div className="rounded-[2rem] border border-black bg-white p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-black/50">
          System playlist management
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-black">
          Create system playlist
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-black/70">
          System playlists are curated collections visible to listeners. They are
          stored with type <span className="font-mono text-black">system</span>,
          public, and owned by your admin account for audit purposes.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-6 rounded-[2rem] border border-black bg-white p-8"
      >
        <div>
          <label
            htmlFor="sys-pl-title"
            className="block text-xs font-semibold uppercase tracking-[0.24em] text-black/45"
          >
            Title <span className="text-red-600">*</span>
          </label>
          <input
            id="sys-pl-title"
            type="text"
            required
            maxLength={200}
            value={form.title}
            onChange={handleChange("title")}
            className="mt-2 w-full rounded-2xl border border-black bg-white px-4 py-3 text-sm text-black outline-none transition focus:ring-4 focus:ring-black/10"
            placeholder="e.g. Weekend Focus"
          />
        </div>

        <div>
          <label
            htmlFor="sys-pl-desc"
            className="block text-xs font-semibold uppercase tracking-[0.24em] text-black/45"
          >
            Description
          </label>
          <textarea
            id="sys-pl-desc"
            rows={4}
            value={form.description}
            onChange={handleChange("description")}
            className="mt-2 w-full resize-y rounded-2xl border border-black bg-white px-4 py-3 text-sm text-black outline-none transition focus:ring-4 focus:ring-black/10"
            placeholder="Short description for listeners and editors."
          />
        </div>

        <div>
          <label
            htmlFor="sys-pl-cover"
            className="block text-xs font-semibold uppercase tracking-[0.24em] text-black/45"
          >
            Cover image URL
          </label>
          <input
            id="sys-pl-cover"
            type="url"
            inputMode="url"
            value={form.coverImage}
            onChange={handleChange("coverImage")}
            className="mt-2 w-full rounded-2xl border border-black bg-white px-4 py-3 text-sm text-black outline-none transition focus:ring-4 focus:ring-black/10"
            placeholder="https://… (optional)"
          />
          <p className="mt-2 text-xs text-black/50">
            Optional https image URL. Leave blank to use the default cover in apps.
          </p>
        </div>

        {feedback.text ? (
          <div
            className={[
              "rounded-2xl border px-4 py-3 text-sm",
              feedback.type === "success"
                ? "border-black bg-white text-black"
                : "border-red-600 bg-red-50 text-red-900",
            ].join(" ")}
            role="status"
          >
            {feedback.text}
          </div>
        ) : null}

        {createdSummary?.id ? (
          <div className="rounded-2xl border border-black bg-white px-4 py-3 text-sm text-black/80">
            <p className="font-semibold text-black">Created playlist</p>
            <p className="mt-1 font-mono text-xs">id: {createdSummary.id}</p>
            <p className="mt-1">
              <span className="text-black/50">title:</span> {createdSummary.title}
            </p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || !form.title.trim()}
          className="rounded-2xl bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Creating…" : "Create playlist"}
        </button>
      </form>
    </section>
  );
};

export default CreateSystemPlaylistPage;
