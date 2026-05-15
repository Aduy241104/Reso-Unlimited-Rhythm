import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  getMyArtistProfileService,
  patchMyArtistProfileMediaService,
  patchMyArtistProfileService,
} from "../../services/artistService";
import { routePaths } from "../../routes/routePaths";
import { getApiErrorMessage } from "../../utils/apiError";
import { artistProfileEditSchema } from "./artistProfileFormSchema";
import {
  activeStatusBadgeClass,
  getAvatarSrc,
  getCoverSrc,
  verificationBadgeClass,
} from "./artistProfileUtils";

const fieldClassName =
  "w-full rounded-sm border border-neutral-200 bg-[#fffdf9] px-3 py-2 text-sm text-[#2a2019] outline-none transition placeholder:text-neutral-400 focus:border-[#8b5e3c]";

const FieldLabel = ({ children, htmlFor }) => (
  <label
    htmlFor={htmlFor}
    className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500"
  >
    {children}
  </label>
);

const ArtistProfileEditPage = () => {
  const navigate = useNavigate();
  const [artist, setArtist] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [saveFeedback, setSaveFeedback] = useState({ type: "", text: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [removeCover, setRemoveCover] = useState(false);
  const [avatarInputKey, setAvatarInputKey] = useState(0);
  const [coverInputKey, setCoverInputKey] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(artistProfileEditSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      bio: "",
      socialFacebook: "",
      socialInstagram: "",
      socialYoutube: "",
    },
  });

  const isBlocked = artist?.activeStatus === "blocked";

  const hasStoredAvatar = Boolean(artist?.avatar?.trim());
  const hasStoredCover = Boolean(artist?.coverImage?.trim());

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const data = await getMyArtistProfileService();
        if (!isMounted) {
          return;
        }
        setArtist(data);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setArtist(null);
        setErrorMessage(
          getApiErrorMessage(
            error,
            "Unable to load your artist profile from the server."
          )
        );
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
  }, []);

  useEffect(() => {
    if (!artist) {
      return;
    }

    reset({
      name: artist.name ?? "",
      bio: artist.bio ?? "",
      socialFacebook: artist.socialLinks?.facebook ?? "",
      socialInstagram: artist.socialLinks?.instagram ?? "",
      socialYoutube: artist.socialLinks?.youtube ?? "",
    });
    setRemoveAvatar(false);
    setRemoveCover(false);
    setAvatarFile(null);
    setCoverFile(null);
    setAvatarInputKey((key) => key + 1);
    setCoverInputKey((key) => key + 1);
  }, [artist, reset]);

  const coverSrc = useMemo(() => getCoverSrc(artist), [artist]);
  const avatarSrc = useMemo(() => getAvatarSrc(artist), [artist]);

  const onSaveAll = handleSubmit(async (values) => {
    if (isBlocked) {
      return;
    }

    setSaveFeedback({ type: "", text: "" });
    setIsSaving(true);

    try {
      if (avatarFile || coverFile) {
        const formData = new FormData();
        if (avatarFile) {
          formData.append("avatar", avatarFile);
        }
        if (coverFile) {
          formData.append("coverImage", coverFile);
        }
        await patchMyArtistProfileMediaService(formData);
      }

      const body = {
        name: values.name.trim(),
        bio: values.bio ?? "",
        socialLinks: {
          facebook: values.socialFacebook.trim(),
          instagram: values.socialInstagram.trim(),
          youtube: values.socialYoutube.trim(),
        },
      };

      if (removeAvatar && !avatarFile) {
        body.avatar = "";
      }

      if (removeCover && !coverFile) {
        body.coverImage = "";
      }

      const updated = await patchMyArtistProfileService(body);
      setArtist(updated);
      navigate(routePaths.artistProfile, { replace: true });
    } catch (error) {
      setSaveFeedback({
        type: "error",
        text: getApiErrorMessage(error, "Could not save your changes."),
      });
    } finally {
      setIsSaving(false);
    }
  });

  if (isLoading) {
    return (
      <section className="flex min-h-[320px] flex-col items-center justify-center rounded-md border border-neutral-200 bg-white p-10 text-neutral-600">
        <Loader2 className="h-8 w-8 animate-spin text-[#8b5e3c]" aria-hidden />
        <p className="mt-4 text-sm">Loading your artist profile…</p>
      </section>
    );
  }

  if (errorMessage || !artist) {
    return (
      <section className="rounded-md border border-red-200 bg-red-50/80 p-6 text-red-900">
        <h2 className="text-lg font-semibold">Could not load profile</h2>
        <p className="mt-2 text-sm leading-6">{errorMessage}</p>
        <Link
          to={routePaths.artistProfile}
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#8b5e3c] underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to profile
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={routePaths.artistProfile}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#8b5e3c] underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to profile
        </Link>
      </div>

      <div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm">
        <div className="relative h-32 w-full bg-neutral-900 sm:h-40">
          <img
            src={coverSrc}
            alt=""
            className="h-full w-full object-cover opacity-95"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>

        <div className="relative flex flex-col gap-4 border-b border-neutral-200 px-5 pb-5 pt-0 sm:flex-row sm:items-end sm:px-8">
          <div className="-mt-10 flex shrink-0 items-end gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-md border-4 border-white bg-white shadow-md sm:h-24 sm:w-24">
              <img
                src={avatarSrc}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="pb-1">
              <p className="text-xs uppercase tracking-[0.3em] text-[#8b5e3c]">
                Editing profile
              </p>
              <p className="mt-1 text-lg font-semibold text-[#241b15]">{artist.name}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className={[
                    "inline-flex rounded-sm px-2 py-0.5 text-xs font-medium capitalize",
                    verificationBadgeClass[artist.verificationStatus] ??
                      "bg-neutral-100 text-neutral-600",
                  ].join(" ")}
                >
                  {artist.verificationStatus}
                </span>
                <span
                  className={[
                    "inline-flex rounded-sm px-2 py-0.5 text-xs font-medium capitalize",
                    activeStatusBadgeClass[artist.activeStatus] ??
                      "bg-neutral-100 text-neutral-600",
                  ].join(" ")}
                >
                  {artist.activeStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isBlocked ? (
        <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="font-medium">Profile is blocked</p>
          <p className="mt-1 text-red-800/90">
            You cannot save changes or upload images until your account is active
            again.
          </p>
          {artist.blockedReason ? (
            <p className="mt-3 border-t border-red-200/80 pt-3 text-red-800/90">
              {artist.blockedReason}
            </p>
          ) : null}
        </div>
      ) : null}

      <form
        onSubmit={onSaveAll}
        className="space-y-6 rounded-md border border-neutral-200 bg-white p-6"
      >
        <div>
          <h2 className="text-lg font-semibold text-[#241b15]">
            Profile &amp; social links
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Update your public name, biography, and social URLs (full https links).
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <FieldLabel htmlFor="edit-artist-name">Display name</FieldLabel>
              <input
                id="edit-artist-name"
                type="text"
                disabled={isBlocked}
                className={fieldClassName}
                {...register("name")}
              />
              {errors.name ? (
                <p className="mt-1.5 text-sm text-red-600">{errors.name.message}</p>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <FieldLabel htmlFor="edit-artist-bio">Biography</FieldLabel>
              <textarea
                id="edit-artist-bio"
                rows={5}
                disabled={isBlocked}
                className={`${fieldClassName} resize-y min-h-[120px]`}
                {...register("bio")}
              />
              {errors.bio ? (
                <p className="mt-1.5 text-sm text-red-600">{errors.bio.message}</p>
              ) : null}
            </div>

            <div>
              <FieldLabel htmlFor="edit-artist-social-fb">Facebook</FieldLabel>
              <input
                id="edit-artist-social-fb"
                type="url"
                inputMode="url"
                placeholder="https://"
                disabled={isBlocked}
                className={fieldClassName}
                {...register("socialFacebook")}
              />
              {errors.socialFacebook ? (
                <p className="mt-1.5 text-sm text-red-600">
                  {errors.socialFacebook.message}
                </p>
              ) : null}
            </div>

            <div>
              <FieldLabel htmlFor="edit-artist-social-ig">Instagram</FieldLabel>
              <input
                id="edit-artist-social-ig"
                type="url"
                inputMode="url"
                placeholder="https://"
                disabled={isBlocked}
                className={fieldClassName}
                {...register("socialInstagram")}
              />
              {errors.socialInstagram ? (
                <p className="mt-1.5 text-sm text-red-600">
                  {errors.socialInstagram.message}
                </p>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <FieldLabel htmlFor="edit-artist-social-yt">YouTube</FieldLabel>
              <input
                id="edit-artist-social-yt"
                type="url"
                inputMode="url"
                placeholder="https://"
                disabled={isBlocked}
                className={fieldClassName}
                {...register("socialYoutube")}
              />
              {errors.socialYoutube ? (
                <p className="mt-1.5 text-sm text-red-600">
                  {errors.socialYoutube.message}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-6">
          <h2 className="text-lg font-semibold text-[#241b15]">Images</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Choose new files and/or remove current images. Everything is applied when
            you press <span className="font-medium text-[#2a2019]">Save changes</span>{" "}
            below (JPEG, PNG, WebP; max 5MB each).
          </p>

          <div className="mt-6 space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
              <div className="min-w-0 flex-1">
                <FieldLabel htmlFor="edit-artist-avatar-file">Avatar</FieldLabel>
                <input
                  key={`avatar-${avatarInputKey}`}
                  id="edit-artist-avatar-file"
                  type="file"
                  accept="image/*"
                  disabled={isBlocked}
                  className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-sm file:border file:border-neutral-200 file:bg-[#fcfaf7] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#2a2019] hover:file:bg-neutral-50"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setAvatarFile(file);
                    if (file) {
                      setRemoveAvatar(false);
                    }
                  }}
                />
              </div>
              <button
                type="button"
                disabled={
                  isBlocked ||
                  (!hasStoredAvatar && !avatarFile && !removeAvatar)
                }
                onClick={() => {
                  if (removeAvatar && !avatarFile) {
                    setRemoveAvatar(false);
                    return;
                  }
                  setAvatarFile(null);
                  setRemoveAvatar(true);
                  setAvatarInputKey((key) => key + 1);
                }}
                className="shrink-0 rounded-sm border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                title={
                  removeAvatar && !avatarFile
                    ? "Restore avatar (cancel removal)"
                    : "Clear avatar from profile when you save"
                }
              >
                Remove image
              </button>
            </div>
            {removeAvatar && !avatarFile ? (
              <p className="text-xs text-neutral-500">
                Avatar will be cleared from your profile when you save.
              </p>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
              <div className="min-w-0 flex-1">
                <FieldLabel htmlFor="edit-artist-cover-file">Cover</FieldLabel>
                <input
                  key={`cover-${coverInputKey}`}
                  id="edit-artist-cover-file"
                  type="file"
                  accept="image/*"
                  disabled={isBlocked}
                  className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-sm file:border file:border-neutral-200 file:bg-[#fcfaf7] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#2a2019] hover:file:bg-neutral-50"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setCoverFile(file);
                    if (file) {
                      setRemoveCover(false);
                    }
                  }}
                />
              </div>
              <button
                type="button"
                disabled={
                  isBlocked ||
                  (!hasStoredCover && !coverFile && !removeCover)
                }
                onClick={() => {
                  if (removeCover && !coverFile) {
                    setRemoveCover(false);
                    return;
                  }
                  setCoverFile(null);
                  setRemoveCover(true);
                  setCoverInputKey((key) => key + 1);
                }}
                className="shrink-0 rounded-sm border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                title={
                  removeCover && !coverFile
                    ? "Restore cover (cancel removal)"
                    : "Clear cover from profile when you save"
                }
              >
                Remove image
              </button>
            </div>
            {removeCover && !coverFile ? (
              <p className="text-xs text-neutral-500">
                Cover will be cleared from your profile when you save.
              </p>
            ) : null}
          </div>
        </div>

        {saveFeedback.text ? (
          <div
            className={[
              "rounded-sm border px-4 py-3 text-sm",
              saveFeedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900",
            ].join(" ")}
            role="status"
          >
            {saveFeedback.text}
          </div>
        ) : null}

        <div className="border-t border-neutral-200 pt-6">
          <button
            type="submit"
            disabled={isBlocked || isSaving}
            className="inline-flex items-center justify-center rounded-sm bg-[#8b5e3c] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#744a30] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </button>
        </div>
      </form>
    </section>
  );
};

export default ArtistProfileEditPage;
