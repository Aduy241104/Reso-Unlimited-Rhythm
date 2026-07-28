import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import AlbumCard from "../../components/libary/AlbumCard";
import { getFollowedAlbums } from "../../services/libaryService";
import { getApiErrorMessage } from "../../utils/apiError";
import {
    DEFAULT_FOLLOWED_ALBUMS_PARAMS,
    LIBARY_ALBUM_TEXT,
} from "../../utils/libaryDetail";

const LoadingState = () => {
    return (
        <section className="rounded-[24px] bg-[#181818] px-6 py-14 text-center shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#1ed760]/10 text-[#1ed760]">
                <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-white">{LIBARY_ALBUM_TEXT.loadingTitle}</h2>
        </section>
    );
};

const EmptyState = () => {
    return (
        <section className="rounded-[24px] bg-[#181818] px-6 py-14 text-center shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] bg-[linear-gradient(145deg,#282828_0%,#3e3e3e_100%)] text-3xl font-semibold text-white">
                A
            </div>
            <h2 className="mt-6 text-2xl font-bold text-white">{LIBARY_ALBUM_TEXT.emptyTitle}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/60">
                {LIBARY_ALBUM_TEXT.emptyDescription}
            </p>
        </section>
    );
};

const ErrorState = ({ message, onRetry }) => {
    return (
        <section className="rounded-[24px] border border-red-400/10 bg-red-400/[0.05] px-6 py-14 text-center shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
            <h2 className="text-2xl font-bold text-white">{LIBARY_ALBUM_TEXT.errorTitle}</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-red-100/80">
                {message}
            </p>
            <button
                type="button"
                onClick={onRetry}
                className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:scale-[1.02] hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212]"
            >
                {LIBARY_ALBUM_TEXT.retryLabel}
            </button>
        </section>
    );
};

const requestFollowedAlbums = async () => {
    const payload = await getFollowedAlbums(DEFAULT_FOLLOWED_ALBUMS_PARAMS);

    return Array.isArray(payload?.albums) ? payload.albums : [];
};

const LibaryAlbumPage = () => {
    const [albums, setAlbums] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const loadFollowedAlbums = async () => {
        setIsLoading(true);
        setErrorMessage("");

        try {
            const nextAlbums = await requestFollowedAlbums();
            setAlbums(nextAlbums);
        } catch (error) {
            setAlbums([]);
            setErrorMessage(
                getApiErrorMessage(error, LIBARY_ALBUM_TEXT.errorTitle)
            );
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadFollowedAlbums();
    }, []);


    return (
        <section className="space-y-8 sm:space-y-10">
            <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#1ed760]">
                    Thư viện của bạn
                </p>
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                    Album đã theo dõi
                </h1>
            </div>

            {isLoading ? (
                <LoadingState />
            ) : errorMessage ? (
                <ErrorState message={errorMessage} onRetry={loadFollowedAlbums} />
            ) : albums.length === 0 ? (
                <EmptyState />
            ) : (
                <section className="flex flex-col gap-3">
                    {albums.map((album) => (
                        <AlbumCard
                            key={album.albumId}
                            album={album}
                        />
                    ))}
                </section>
            )}
        </section>
    );
};

export default LibaryAlbumPage;
