import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Loader2, Pencil, Shield } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { routePaths } from "../../routes/routePaths";
import { getArtistProfileService } from "../../services/artistProfileService";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  verificationBadgeClass,
  verificationLabel,
} from "./artistProfileConstants";

const SocialRow = ({ label, url }) => {
  if (!url?.trim()) {
    return (
      <div className="flex items-center justify-between rounded-sm border border-neutral-100 bg-[#fcfaf7] px-4 py-3">
        <span className="text-sm font-medium text-neutral-600">{label}</span>
        <span className="text-sm text-neutral-400">—</span>
      </div>
    );
  }

  const href = url.startsWith("http") ? url : `https://${url}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between rounded-sm border border-neutral-200 bg-white px-4 py-3 text-sm transition hover:border-[#8b5e3c]/40 hover:bg-[#fffdf9]"
    >
      <span className="font-medium text-[#241b15]">{label}</span>
      <span className="inline-flex items-center gap-1 text-[#8b5e3c]">
        Open
        <ExternalLink className="h-3.5 w-3.5" />
      </span>
    </a>
  );
};

const ArtistProfileViewPage = () => {
  const { user } = useAuth();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getArtistProfileService();
      setBundle(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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

  if (!bundle?.artist) {
    return (
      <section className="rounded-md border border-neutral-200 bg-white p-6">
        <p className="text-sm text-neutral-600">
          {error || "We could not load your artist profile."}
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

  const { artist, account } = bundle;
  const status = artist.verificationStatus;
  const social = artist.socialLinks ?? {};

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to={routePaths.artistRoot}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#8b5e3c] transition hover:text-[#6f4a2c]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to overview
          </Link>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#241b15]">
            Artist profile
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            View your public artist page as it is shown on the platform. Use Edit
            to change details, media, or verification.
          </p>
        </div>

        <Link
          to={routePaths.artistProfileEdit}
          className="inline-flex items-center gap-2 rounded-sm bg-[#241b15] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
        >
          <Pencil className="h-4 w-4" />
          Edit profile
        </Link>
      </div>

      <div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm">
        <div className="relative h-40 bg-[#2a2019] sm:h-48">
          {artist.coverImage ? (
            <img
              src={artist.coverImage}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-white/50">
              No cover image
            </div>
          )}

          <div className="absolute -bottom-10 left-6 flex items-end gap-4 sm:left-8">
            <div className="relative h-24 w-24 overflow-hidden rounded-md border-4 border-white bg-[#f6f0e8] shadow-md sm:h-28 sm:w-28">
              {artist.avatar ? (
                <img
                  src={artist.avatar}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-neutral-500">
                  No avatar
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
                {artist.name}
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

          {artist.bio ? (
            <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-700">
              {artist.bio}
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
                {artist.stats?.followers?.toLocaleString?.() ?? 0}
              </dd>
            </div>
            <div className="rounded-sm border border-neutral-100 bg-[#fcfaf7] px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Total streams
              </dt>
              <dd className="mt-1 text-lg font-semibold text-[#241b15]">
                {artist.stats?.totalStreams?.toLocaleString?.() ?? 0}
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

        <div className="p-6 sm:p-8">
          <h4 className="text-sm font-semibold text-[#241b15]">Social links</h4>
          <p className="mt-1 text-xs text-neutral-500">
            Links shown on your public artist profile.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <SocialRow label="Facebook" url={social.facebook} />
            <SocialRow label="Instagram" url={social.instagram} />
            <SocialRow label="YouTube" url={social.youtube} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ArtistProfileViewPage;
