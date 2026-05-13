import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Image as ImageIcon,
  Info,
  Loader2,
  Shield,
  X,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { routePaths } from "../../routes/routePaths";
import {
  getArtistProfileService,
  patchArtistProfileService,
  requestArtistVerificationService,
  uploadArtistAvatarService,
  uploadArtistCoverService,
} from "../../services/artistProfileService";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  verificationBadgeClass,
  verificationLabel,
} from "./artistProfileConstants";

const alertSurface = {
  success:
    "border-[#c9b89a]/90 bg-gradient-to-r from-[#f8f2ea] to-[#f3ebe3] text-[#2a2019] shadow-[0_1px_0_rgba(255,255,255,0.6)_inset]",
  error:
    "border-rose-200/90 bg-[#fdf4f2] text-[#7f1d1d] shadow-sm",
  info: "border-neutral-200 bg-[#fcfaf7] text-[#3a2d23] shadow-sm",
};

const EditProfileAlert = ({ variant, children, onDismiss }) => {
  const Icon =
    variant === "success"
      ? CheckCircle2
      : variant === "error"
        ? AlertCircle
        : Info;

  const iconClass =
    variant === "success"
      ? "text-[#8b5e3c]"
      : variant === "error"
        ? "text-rose-600"
        : "text-[#8b5e3c]";

  return (
    <div
      className={[
        "relative flex gap-3 rounded-md border px-4 py-3.5 pr-10 text-sm leading-snug",
        alertSurface[variant] ?? alertSurface.info,
      ].join(" ")}
      role="status"
    >
      <Icon className={["mt-0.5 h-5 w-5 shrink-0", iconClass].join(" ")} />
      <div className="min-w-0 flex-1 font-medium tracking-tight">{children}</div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-sm text-[#5c4d42] opacity-70 transition hover:bg-black/5 hover:opacity-100"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
};

const ArtistProfileEditPage = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [serverBundle, setServerBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");

  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [pendingCoverFile, setPendingCoverFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(null);
  const [avatarRemovedPending, setAvatarRemovedPending] = useState(false);
  const [coverRemovedPending, setCoverRemovedPending] = useState(false);

  const clearPendingMedia = useCallback(() => {
    setAvatarPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    setCoverPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    setPendingAvatarFile(null);
    setPendingCoverFile(null);
    setAvatarRemovedPending(false);
    setCoverRemovedPending(false);
  }, []);

  const applyBundleToForm = useCallback((data) => {
    if (!data?.artist) {
      return;
    }

    const { artist } = data;
    setName(artist.name ?? "");
    setBio(artist.bio ?? "");
    setFacebook(artist.socialLinks?.facebook ?? "");
    setInstagram(artist.socialLinks?.instagram ?? "");
    setYoutube(artist.socialLinks?.youtube ?? "");
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setFormError("");

    try {
      const data = await getArtistProfileService();
      setServerBundle(data);
      applyBundleToForm(data);
      clearPendingMedia();
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [applyBundleToForm, clearPendingMedia]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(
    () => () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    },
    [avatarPreviewUrl, coverPreviewUrl]
  );

  const syncUserAvatar = useCallback(
    (account) => {
      if (!account || account.avatar === undefined) {
        return;
      }

      setUser((prev) => (prev ? { ...prev, avatar: account.avatar } : null));
    },
    [setUser]
  );

  const handleDiscardChanges = () => {
    setFormError("");
    setFormSuccess("");
    clearPendingMedia();
    navigate(routePaths.artistProfile, { replace: true });
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    if (!serverBundle) {
      return;
    }

    setSaving(true);
    setFormError("");
    setFormSuccess("");

    try {
      let data = serverBundle;

      if (pendingAvatarFile) {
        const formData = new FormData();
        formData.append("file", pendingAvatarFile);
        const res = await uploadArtistAvatarService(formData);
        data = res?.data?.data ?? data;
      } else if (avatarRemovedPending) {
        data = await patchArtistProfileService({ avatar: "" });
      }

      if (pendingCoverFile) {
        const formData = new FormData();
        formData.append("file", pendingCoverFile);
        const res = await uploadArtistCoverService(formData);
        data = res?.data?.data ?? data;
      } else if (coverRemovedPending) {
        data = await patchArtistProfileService({ coverImage: "" });
      }

      data = await patchArtistProfileService({
        name: name.trim(),
        bio,
        socialLinks: {
          facebook: facebook.trim(),
          instagram: instagram.trim(),
          youtube: youtube.trim(),
        },
      });

      setServerBundle(data);
      applyBundleToForm(data);
      syncUserAvatar(data?.account);
      clearPendingMedia();
      navigate(routePaths.artistProfile, { replace: true });
    } catch (error) {
      setFormError(getApiErrorMessage(error));
      await loadProfile();
    } finally {
      setSaving(false);
    }
  };

  const handleStageAvatarFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setFormError("");
    setFormSuccess("");
    setAvatarRemovedPending(false);
    setPendingAvatarFile(file);
    setAvatarPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return URL.createObjectURL(file);
    });
    event.target.value = "";
  };

  const handleStageCoverFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setFormError("");
    setFormSuccess("");
    setCoverRemovedPending(false);
    setPendingCoverFile(file);
    setCoverPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return URL.createObjectURL(file);
    });
    event.target.value = "";
  };

  const handleStageRemoveAvatar = () => {
    setFormError("");
    setFormSuccess("");
    setPendingAvatarFile(null);
    setAvatarPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    setAvatarRemovedPending(true);
  };

  const handleStageRemoveCover = () => {
    setFormError("");
    setFormSuccess("");
    setPendingCoverFile(null);
    setCoverPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    setCoverRemovedPending(true);
  };

  const handleVerificationRequest = async () => {
    setVerificationBusy(true);
    setFormError("");
    setFormSuccess("");

    try {
      const data = await requestArtistVerificationService();
      setServerBundle((prev) =>
        prev ? { ...prev, artist: data?.artist ?? prev.artist } : prev
      );
      setFormSuccess(data?.message ?? "Request submitted.");
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setVerificationBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="flex min-h-[320px] items-center justify-center rounded-md border border-neutral-200 bg-white">
        <div className="flex items-center gap-3 text-sm text-neutral-600">
          <Loader2 className="h-5 w-5 animate-spin text-[#8b5e3c]" />
          Loading profile…
        </div>
      </section>
    );
  }

  if (!serverBundle?.artist) {
    return (
      <section className="rounded-md border border-neutral-200 bg-white p-6">
        <p className="text-sm text-neutral-600">
          {formError || "We could not load your artist profile."}
        </p>
        <button
          type="button"
          onClick={loadProfile}
          className="mt-4 rounded-sm border border-neutral-300 px-4 py-2 text-sm font-medium text-[#241b15] transition hover:bg-neutral-50"
        >
          Retry
        </button>
      </section>
    );
  }

  const { artist: serverArtist, account } = serverBundle;
  const status = serverArtist.verificationStatus;

  const displayCoverSrc = coverRemovedPending
    ? null
    : (coverPreviewUrl ?? serverArtist.coverImage ?? null);

  const displayAvatarSrc = avatarRemovedPending
    ? null
    : (avatarPreviewUrl ?? serverArtist.avatar ?? null);

  const hasUnsavedMedia =
    Boolean(pendingAvatarFile) ||
    Boolean(pendingCoverFile) ||
    avatarRemovedPending ||
    coverRemovedPending;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to={routePaths.artistRoot}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#8b5e3c] transition hover:text-[#6f4a2c]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to overview
          </Link>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#241b15]">
            Edit artist profile
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            Choose new images to preview them here. Nothing is uploaded until you
            press <span className="font-semibold text-[#241b15]">Save changes</span>
            . <span className="font-semibold text-[#241b15]">Cancel changes</span>{" "}
            discards edits and returns to your profile view without saving.
          </p>
        </div>
      </div>

      {formError ? (
        <EditProfileAlert
          variant="error"
          onDismiss={() => setFormError("")}
        >
          {formError}
        </EditProfileAlert>
      ) : null}

      {formSuccess ? (
        <EditProfileAlert
          variant={
            formSuccess.includes("discarded") ? "info" : "success"
          }
          onDismiss={() => setFormSuccess("")}
        >
          {formSuccess}
        </EditProfileAlert>
      ) : null}

      <div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm">
        <div className="relative h-40 bg-[#2a2019] sm:h-48">
          {displayCoverSrc ? (
            <img
              src={displayCoverSrc}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-white/50">
              {coverRemovedPending
                ? "Cover will be removed when you save"
                : "No cover image"}
            </div>
          )}

          <div className="absolute -bottom-10 left-6 flex items-end gap-4 sm:left-8">
            <div className="relative h-24 w-24 overflow-hidden rounded-md border-4 border-white bg-[#f6f0e8] shadow-md sm:h-28 sm:w-28">
              {displayAvatarSrc ? (
                <img
                  src={displayAvatarSrc}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-2 text-center text-[10px] text-neutral-500">
                  {avatarRemovedPending
                    ? "Removed on save"
                    : "No avatar"}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-b border-neutral-200 px-6 pb-6 pt-14 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-[#8b5e3c]">
                Account
              </p>
              <h3 className="mt-2 text-xl font-semibold text-[#241b15]">
                {name.trim() || serverArtist.name}
              </h3>
              <p className="mt-1 text-sm text-neutral-500">{account?.email}</p>
              {account?.profile?.fullName ? (
                <p className="mt-1 text-sm text-neutral-600">
                  Legal name: {account.profile.fullName}
                </p>
              ) : null}
            </div>

            <span
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                verificationBadgeClass[status] ?? verificationBadgeClass.pending,
              ].join(" ")}
            >
              <Shield className="h-3.5 w-3.5" />
              {verificationLabel[status] ?? status}
            </span>
          </div>

          {bio.trim() ? (
            <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-700">
              {bio}
            </p>
          ) : (
            <p className="mt-4 text-sm italic text-neutral-400">No biography yet.</p>
          )}

          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-sm border border-neutral-100 bg-[#fcfaf7] px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Followers
              </dt>
              <dd className="mt-1 text-lg font-semibold text-[#241b15]">
                {serverArtist.stats?.followers?.toLocaleString?.() ?? 0}
              </dd>
            </div>
            <div className="rounded-sm border border-neutral-100 bg-[#fcfaf7] px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Total streams
              </dt>
              <dd className="mt-1 text-lg font-semibold text-[#241b15]">
                {serverArtist.stats?.totalStreams?.toLocaleString?.() ?? 0}
              </dd>
            </div>
            <div className="rounded-sm border border-neutral-100 bg-[#fcfaf7] px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Dashboard user
              </dt>
              <dd className="mt-1 text-sm font-medium text-[#241b15]">
                {user?.email ?? "—"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="grid gap-8 border-b border-neutral-200 p-6 sm:grid-cols-2 sm:p-8">
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-[#241b15]">
              <ImageIcon className="h-4 w-4 text-[#8b5e3c]" />
              Profile media
            </h4>
            <p className="mt-1 text-xs text-neutral-500">
              Images upload to Cloudinary only after you save. This section shows
              a live preview before saving.
            </p>

            {hasUnsavedMedia ? (
              <p className="mt-2 inline-flex items-center rounded-sm border border-[#d4c4b0] bg-[#f8f2ea] px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#6f4a2c]">
                Unsaved media
              </p>
            ) : null}

            <div className="mt-4 space-y-4">
              <div>
                <span className="block text-xs font-medium text-neutral-600">
                  Avatar
                </span>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-[#241b15] transition hover:bg-neutral-50">
                    <Camera className="h-4 w-4 text-[#8b5e3c]" />
                    Choose image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleStageAvatarFile}
                      disabled={saving}
                    />
                  </label>
                  {(displayAvatarSrc || serverArtist.avatar) && !avatarRemovedPending ? (
                    <button
                      type="button"
                      onClick={handleStageRemoveAvatar}
                      disabled={saving}
                      className="rounded-sm border border-neutral-200 px-3 py-2 text-sm text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  ) : null}
                  {avatarRemovedPending ? (
                    <span className="text-xs text-[#8b5e3c]">
                      Marked for removal on save
                    </span>
                  ) : null}
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-neutral-600">
                  Cover image
                </span>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-[#241b15] transition hover:bg-neutral-50">
                    <ImageIcon className="h-4 w-4 text-[#8b5e3c]" />
                    Choose image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleStageCoverFile}
                      disabled={saving}
                    />
                  </label>
                  {(displayCoverSrc || serverArtist.coverImage) &&
                  !coverRemovedPending ? (
                    <button
                      type="button"
                      onClick={handleStageRemoveCover}
                      disabled={saving}
                      className="rounded-sm border border-neutral-200 px-3 py-2 text-sm text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  ) : null}
                  {coverRemovedPending ? (
                    <span className="text-xs text-[#8b5e3c]">
                      Marked for removal on save
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-neutral-100 bg-[#fcfaf7] p-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-[#241b15]">
              <Shield className="h-4 w-4 text-[#8b5e3c]" />
              Verification
            </h4>
            <p className="mt-2 text-xs leading-5 text-neutral-600">
              Verification is sent to the server immediately when you use the
              button below (independent of Save changes).
            </p>

            {status === "verified" ? (
              <p className="mt-4 text-sm font-medium text-emerald-800">
                You are verified. No further action is needed.
              </p>
            ) : (
              <button
                type="button"
                onClick={handleVerificationRequest}
                disabled={verificationBusy}
                className="mt-4 inline-flex items-center gap-2 rounded-sm bg-[#8b5e3c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f4a2c] disabled:opacity-60"
              >
                {verificationBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {status === "rejected"
                  ? "Resubmit verification request"
                  : "Submit verification request"}
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-5 p-6 sm:p-8">
          <h4 className="text-sm font-semibold text-[#241b15]">
            Profile &amp; social links
          </h4>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Stage name
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-2 w-full rounded-sm border border-neutral-200 bg-[#fffdf9] px-3 py-2.5 text-sm text-[#2a2019] outline-none transition focus:border-[#8b5e3c]"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Biography
              </span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="mt-2 w-full rounded-sm border border-neutral-200 bg-[#fffdf9] px-3 py-2.5 text-sm text-[#2a2019] outline-none transition focus:border-[#8b5e3c]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Facebook
              </span>
              <input
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="https://"
                className="mt-2 w-full rounded-sm border border-neutral-200 bg-[#fffdf9] px-3 py-2.5 text-sm text-[#2a2019] outline-none transition focus:border-[#8b5e3c]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Instagram
              </span>
              <input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="https://"
                className="mt-2 w-full rounded-sm border border-neutral-200 bg-[#fffdf9] px-3 py-2.5 text-sm text-[#2a2019] outline-none transition focus:border-[#8b5e3c]"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                YouTube
              </span>
              <input
                value={youtube}
                onChange={(e) => setYoutube(e.target.value)}
                placeholder="https://"
                className="mt-2 w-full rounded-sm border border-neutral-200 bg-[#fffdf9] px-3 py-2.5 text-sm text-[#2a2019] outline-none transition focus:border-[#8b5e3c]"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDiscardChanges}
                disabled={saving}
                className="rounded-sm border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#3a2d23] transition hover:border-[#8b5e3c]/50 hover:bg-[#fffdf9] disabled:opacity-50"
              >
                Cancel changes
              </button>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-sm bg-[#241b15] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save changes
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default ArtistProfileEditPage;
