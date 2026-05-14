import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Loader2, Pencil } from "lucide-react";
import { getMyArtistProfileService } from "../../services/artistService";
import { routePaths } from "../../routes/routePaths";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  activeStatusBadgeClass,
  formatCount,
  formatDate,
  getAvatarSrc,
  getCoverSrc,
  verificationBadgeClass,
} from "./artistProfileUtils";

const InfoCard = ({ label, children }) => (
  <div className="rounded-sm border border-neutral-200 bg-[#fcfaf7] p-4">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
      {label}
    </p>
    <div className="mt-2 text-sm text-[#2f261f]">{children}</div>
  </div>
);

const ArtistProfilePage = () => {
  const [artist, setArtist] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const isBlocked = artist?.activeStatus === "blocked";

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

  const coverSrc = useMemo(() => getCoverSrc(artist), [artist]);
  const avatarSrc = useMemo(() => getAvatarSrc(artist), [artist]);

  const socialEntries = useMemo(() => {
    const links = artist?.socialLinks ?? {};
    return [
      { key: "facebook", label: "Facebook", href: links.facebook },
      { key: "instagram", label: "Instagram", href: links.instagram },
      { key: "youtube", label: "YouTube", href: links.youtube },
    ].filter((item) => item.href && String(item.href).trim());
  }, [artist]);

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
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm">
        <div className="relative h-40 w-full bg-neutral-900 sm:h-48">
          <img
            src={coverSrc}
            alt=""
            className="h-full w-full object-cover opacity-95"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
        </div>

        <div className="relative px-5 pb-6 pt-0 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="-mt-12 h-28 w-28 shrink-0 overflow-hidden rounded-md border-4 border-white bg-white shadow-md sm:h-32 sm:w-32">
                <img
                  src={avatarSrc}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="sm:pb-1">
                <p className="text-xs uppercase tracking-[0.3em] text-[#8b5e3c]">
                  Artist profile
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#241b15] sm:text-3xl">
                  {artist.name}
                </h1>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={[
                      "inline-flex rounded-sm px-2.5 py-1 text-xs font-medium capitalize",
                      verificationBadgeClass[artist.verificationStatus] ??
                        "bg-neutral-100 text-neutral-600",
                    ].join(" ")}
                  >
                    {artist.verificationStatus}
                  </span>
                  <span
                    className={[
                      "inline-flex rounded-sm px-2.5 py-1 text-xs font-medium capitalize",
                      activeStatusBadgeClass[artist.activeStatus] ??
                        "bg-neutral-100 text-neutral-600",
                    ].join(" ")}
                  >
                    {artist.activeStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0 sm:pt-2">
              {isBlocked ? (
                <span
                  className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-sm border border-neutral-200 bg-neutral-100 px-4 py-2.5 text-sm font-medium text-neutral-500"
                  title="Your profile is blocked and cannot be edited."
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                  Edit profile
                </span>
              ) : (
                <Link
                  to={routePaths.artistProfileEdit}
                  className="inline-flex items-center justify-center gap-2 rounded-sm border border-[#8b5e3c] bg-[#8b5e3c] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#744a30]"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                  Edit profile
                </Link>
              )}
            </div>
          </div>

          {isBlocked ? (
            <div className="mt-5 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <p className="font-medium">Profile is blocked</p>
              <p className="mt-1 text-red-800/90">
                You can view your profile, but edits are disabled until your account
                is active again.
              </p>
              {artist.blockedReason ? (
                <p className="mt-3 border-t border-red-200/80 pt-3 text-red-800/90">
                  {artist.blockedReason}
                </p>
              ) : null}
            </div>
          ) : null}

          {artist.bio ? (
            <p className="mt-6 max-w-3xl text-sm leading-7 text-neutral-700">
              {artist.bio}
            </p>
          ) : (
            <p className="mt-6 text-sm text-neutral-500">
              You have not added a biography yet. This is the public story fans
              see on your artist page when it is enabled.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="Followers">
          <span className="text-lg font-semibold text-[#241b15]">
            {formatCount(artist.stats?.followers)}
          </span>
        </InfoCard>
        <InfoCard label="Total streams">
          <span className="text-lg font-semibold text-[#241b15]">
            {formatCount(artist.stats?.totalStreams)}
          </span>
        </InfoCard>
        <InfoCard label="Profile created">
          {formatDate(artist.createdAt)}
        </InfoCard>
        <InfoCard label="Last updated">
          {formatDate(artist.updatedAt)}
        </InfoCard>
      </div>

      <div className="rounded-md border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-[#241b15]">Account</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Details from your Reso Music login, shown for your own reference.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <InfoCard label="Email">{artist.account?.email || "—"}</InfoCard>
          <InfoCard label="Full name (account)">
            {artist.account?.fullName || "—"}
          </InfoCard>
        </div>
      </div>

      <div className="rounded-md border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-[#241b15]">Social links</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Links you have saved on your artist profile.
        </p>
        {socialEntries.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">No social links added.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {socialEntries.map((item) => (
              <li key={item.key}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#8b5e3c] underline-offset-4 hover:underline"
                >
                  {item.label}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default ArtistProfilePage;
