import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, X } from "lucide-react";
import { createAlbumService } from "../../services/artist/artistAlbumService";
import { routePaths } from "../../routes/routePaths";
import { getApiErrorMessage } from "../../utils/apiError";

const ArtistCreateAlbumPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    releaseDate: "",
    coverImage: null,
    coverImagePreview: "",
  });

  const [formErrors, setFormErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleCoverImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setFormErrors((prev) => ({
          ...prev,
          coverImage: "Please select a valid image file",
        }));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          coverImage: file,
          coverImagePreview: reader.result,
        }));
      };
      reader.readAsDataURL(file);

      if (formErrors.coverImage) {
        setFormErrors((prev) => ({
          ...prev,
          coverImage: "",
        }));
      }
    }
  };

  const removeCoverImage = () => {
    setFormData((prev) => ({
      ...prev,
      coverImage: null,
      coverImagePreview: "",
    }));
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.title.trim()) {
      errors.title = "Album title is required";
    }

    if (formData.releaseDate && isNaN(new Date(formData.releaseDate).getTime())) {
      errors.releaseDate = "Please enter a valid date";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = new FormData();
      payload.append("title", formData.title.trim());
      payload.append("status", "active");

      if (formData.releaseDate) {
        payload.append("releaseDate", new Date(formData.releaseDate).toISOString());
      }

      if (formData.coverImage) {
        payload.append("coverImage", formData.coverImage);
      }

      const newAlbum = await createAlbumService(payload);

      setSuccessMessage("Album created successfully! Redirecting...");
      setFormData({
        title: "",
        releaseDate: "",
        coverImage: null,
        coverImagePreview: "",
      });

      setTimeout(() => {
        navigate(routePaths.artistAlbumDetail(newAlbum.id));
      }, 1500);
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Failed to create album. Please try again.")
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(routePaths.artistAlbums)}
        className="flex items-center gap-2 text-sm font-medium text-[#8b5e3c] hover:text-[#6d4a2f] transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Albums
      </button>

      <div className="rounded-md border border-neutral-200 bg-white p-6">
        <div className="max-w-2xl">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.3em] text-[#8b5e3c]">
              Artist Dashboard
            </p>
            <h1 className="mt-2 text-2xl font-bold text-[#241b15]">Create New Album</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Create a new album to organize and manage your music collection.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-[#241b15]">
                Album Title <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter album title"
                className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-[#8b5e3c] focus:outline-none focus:ring-1 focus:ring-[#8b5e3c]"
              />
              {formErrors.title && (
                <p className="mt-1 text-xs text-rose-600">{formErrors.title}</p>
              )}
            </div>

            {/* Release Date */}
            <div>
              <label htmlFor="releaseDate" className="block text-sm font-medium text-[#241b15]">
                Release Date
              </label>
              <input
                type="date"
                id="releaseDate"
                name="releaseDate"
                value={formData.releaseDate}
                onChange={handleInputChange}
                className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-[#8b5e3c] focus:outline-none focus:ring-1 focus:ring-[#8b5e3c]"
              />
              {formErrors.releaseDate && (
                <p className="mt-1 text-xs text-rose-600">{formErrors.releaseDate}</p>
              )}
              <p className="mt-1 text-xs text-neutral-500">Leave empty to set later</p>
            </div>

            {/* Cover Image Upload */}
            <div>
              <label className="block text-sm font-medium text-[#241b15]">
                Cover Image
              </label>
              
              {formData.coverImagePreview ? (
                <div className="mt-2 relative inline-block">
                  <img
                    src={formData.coverImagePreview}
                    alt="Cover preview"
                    className="h-40 w-40 rounded-md object-cover border border-neutral-200"
                  />
                  <button
                    type="button"
                    onClick={removeCoverImage}
                    className="absolute top-2 right-2 rounded-full bg-rose-600 p-1 text-white hover:bg-rose-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="mt-2 block cursor-pointer">
                  <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-neutral-300 bg-neutral-50 px-6 py-8 transition hover:border-[#8b5e3c] hover:bg-[#fcfaf7]">
                    <Upload className="h-8 w-8 text-neutral-400 mb-2" />
                    <span className="text-sm font-medium text-[#241b15]">
                      Click to upload cover image
                    </span>
                    <span className="text-xs text-neutral-500">
                      PNG, JPG, GIF up to 10MB
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverImageChange}
                    className="hidden"
                  />
                </label>
              )}
              {formErrors.coverImage && (
                <p className="mt-1 text-xs text-rose-600">{formErrors.coverImage}</p>
              )}
              <p className="mt-1 text-xs text-neutral-500">Leave empty to add later</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 rounded-md bg-[#8b5e3c] px-4 py-2.5 font-medium text-white transition hover:bg-[#6d4a2f] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "Creating..." : "Create Album"}
              </button>
              <button
                type="button"
                onClick={() => navigate(routePaths.artistAlbums)}
                disabled={isLoading}
                className="rounded-md border border-neutral-200 px-4 py-2.5 font-medium text-[#241b15] transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ArtistCreateAlbumPage;
