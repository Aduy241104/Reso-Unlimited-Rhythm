import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  Loader2,
  Trash2,
  Save,
  User,
  Globe,
  ImageIcon,
  AlertTriangle,
} from "lucide-react";
import { ARTIST_INPUT_LIMITS } from "../../constants/artistInputLimits";
import {
  getMyArtistProfileService,
  patchMyArtistProfileMediaService,
  patchMyArtistProfileService,
} from "../../services/artistService";
import { routePaths } from "../../routes/routePaths";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  showArtistError,
  showArtistSuccess,
} from "../../utils/artistNotification";
import {
  IMAGE_FILE_ACCEPT,
  getImageFileValidationError,
} from "../../utils/imageFileValidation";
import { artistProfileEditSchema } from "./artistProfileFormSchema";
import {
  getAvatarSrc,
  getCoverSrc,
} from "./artistProfileUtils";

const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;

const fieldInputClassName =
  "w-full rounded-[12px] border border-[#e7e1ff] bg-[#faf9ff] px-4 py-2.5 text-sm text-[#2f2747] outline-none transition placeholder:text-[#a19bb8] focus:border-[#6f5cf1] focus:bg-white focus:shadow-sm disabled:cursor-not-allowed disabled:opacity-60";

const FieldLabel = ({ children, htmlFor, required, countText }) => (
  <div className="mb-1.5 flex items-center justify-between">
    <label
      htmlFor={htmlFor}
      className="block text-xs font-bold uppercase tracking-[0.18em] text-[#7c7891]"
    >
      {children} {required && <span className="text-rose-500">*</span>}
    </label>
    {countText && (
      <span className="text-[11px] font-medium text-[#8c86ab]">
        {countText}
      </span>
    )}
  </div>
);

export default function ArtistProfileEditPage() {
  const navigate = useNavigate();
  const [artist, setArtist] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [removeCover, setRemoveCover] = useState(false);
  const [avatarInputKey, setAvatarInputKey] = useState(0);
  const [coverInputKey, setCoverInputKey] = useState(0);
  const [mediaErrors, setMediaErrors] = useState({});

  const {
    register,
    handleSubmit,
    reset,
    watch,
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
      socialTiktok: "",
      socialSpotify: "",
      socialSoundcloud: "",
      socialWebsite: "",
      socialTwitter: "",
      socialOther: "",
    },
  });

  const watchName = watch("name", "");
  const watchBio = watch("bio", "");

  const isBlocked = artist?.activeStatus === "blocked";
  const isVerified = artist?.verificationStatus === "verified";

  const hasStoredAvatar = Boolean(artist?.avatar?.trim());
  const hasStoredCover = Boolean(artist?.coverImage?.trim());

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const data = await getMyArtistProfileService();
        if (!isMounted) return;
        setArtist(data);
      } catch (error) {
        if (!isMounted) return;
        setArtist(null);
        setErrorMessage(
          getApiErrorMessage(error, "Không thể tải thông tin hồ sơ nghệ sĩ.")
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
    if (!artist) return;

    reset({
      name: artist.name ?? "",
      bio: artist.bio ?? "",
      socialFacebook: artist.socialLinks?.facebook ?? "",
      socialInstagram: artist.socialLinks?.instagram ?? "",
      socialYoutube: artist.socialLinks?.youtube ?? "",
      socialTiktok: artist.socialLinks?.tiktok ?? "",
      socialSpotify: artist.socialLinks?.spotify ?? "",
      socialSoundcloud: artist.socialLinks?.soundcloud ?? "",
      socialWebsite: artist.socialLinks?.website ?? "",
      socialTwitter: artist.socialLinks?.twitter ?? "",
      socialOther: artist.socialLinks?.other ?? "",
    });
    setRemoveAvatar(false);
    setRemoveCover(false);
    setAvatarFile(null);
    setCoverFile(null);
    setAvatarPreview(null);
    setCoverPreview(null);
    setMediaErrors({});
    setAvatarInputKey((key) => key + 1);
    setCoverInputKey((key) => key + 1);
  }, [artist, reset]);

  const coverSrc = useMemo(() => getCoverSrc(artist), [artist]);
  const avatarSrc = useMemo(() => getAvatarSrc(artist), [artist]);

  const onSaveAll = handleSubmit(async (values) => {
    if (isBlocked) return;

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
          facebook: (values.socialFacebook || "").trim(),
          instagram: (values.socialInstagram || "").trim(),
          youtube: (values.socialYoutube || "").trim(),
          tiktok: (values.socialTiktok || "").trim(),
          spotify: (values.socialSpotify || "").trim(),
          soundcloud: (values.socialSoundcloud || "").trim(),
          website: (values.socialWebsite || "").trim(),
          twitter: (values.socialTwitter || "").trim(),
          other: (values.socialOther || "").trim(),
        },
      };

      if (removeAvatar && !avatarFile) {
        body.removeAvatar = true;
      }

      if (removeCover && !coverFile) {
        body.removeCover = true;
      }

      const updated = await patchMyArtistProfileService(body);
      setArtist(updated);
      showArtistSuccess("Đã cập nhật hồ sơ nghệ sĩ thành công.");
      navigate(routePaths.artistProfile, { replace: true });
    } catch {
      showArtistError("Không thể lưu thay đổi hồ sơ nghệ sĩ.");
    } finally {
      setIsSaving(false);
    }
  });

  if (isLoading) {
    return (
      <section className="flex min-h-[360px] flex-col items-center justify-center rounded-[24px] border border-[#ebe6ff] bg-white p-10 text-[#6b6682] shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-[#7c6cf2]" aria-hidden />
        <p className="mt-3 text-sm font-medium">Đang tải trang chỉnh sửa hồ sơ...</p>
      </section>
    );
  }

  if (errorMessage || !artist) {
    return (
      <section className="rounded-[24px] border border-rose-200 bg-rose-50 p-6 text-rose-900 shadow-sm">
        <h2 className="text-base font-bold">Không thể tải thông tin hồ sơ</h2>
        <p className="mt-2 text-xs leading-relaxed text-rose-800">{errorMessage}</p>
        <Link
          to={routePaths.artistProfile}
          className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#7c6cf2] hover:underline"
        >
          <ArrowLeft size={14} />
          <span>Quay lại trang hồ sơ</span>
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">

      {/* Top Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={routePaths.artistProfile}
          className="inline-flex items-center gap-2 rounded-xl border border-[#e7e1ff] bg-white px-4 py-2 text-xs font-semibold text-[#2f2747] transition hover:border-[#6f5cf1] hover:bg-[#faf9ff] shadow-sm"
        >
          <ArrowLeft size={14} />
          <span>Quay lại hồ sơ</span>
        </Link>

        <h1 className="text-xl font-bold tracking-tight text-[#2f2747]">
          Chỉnh sửa thông tin nghệ sĩ
        </h1>
      </div>

      {/* Hero Mini Banner */}
      <section className="overflow-hidden rounded-[24px] border border-[#e7e1ff] bg-white shadow-sm">
        <div className="relative h-36 w-full bg-[#1e1b2e] sm:h-44">
          <img
            src={coverPreview || coverSrc}
            alt=""
            className="h-full w-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>

        <div className="relative px-6 pb-6 pt-2 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="-mt-14 sm:-mt-16 h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-white shadow-md sm:h-28 sm:w-28">
              <img
                src={avatarPreview || avatarSrc}
                alt={artist.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="pt-3 sm:pt-4">
              <p className="text-xs uppercase tracking-[0.28em] font-bold text-[#7c6cf2]">
                Đang chỉnh sửa thông tin
              </p>
              <h2 className="mt-0.5 flex items-center gap-2 text-xl font-bold text-[#2f2747] sm:text-2xl">
                <span>{artist.name}</span>
                {isVerified && (
                  <span className="h-5 w-5 rounded-full bg-[#3d91f4] inline-flex items-center justify-center">
                    <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="currentColor">
                      <path fillRule="evenodd" d="M9.92 2.83a.6.6 0 0 1 .08.8L5.28 8.35a.6.6 0 0 1-.87 0l-2-2.3a.6.6 0 1 1 .83-.87l1.5 1.73 4.35-5.02a.6.6 0 0 1 .83-.06Z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </h2>
            </div>
          </div>
        </div>
      </section>

      {/* Blocked Alert Banner */}
      {isBlocked && (
        <div className="rounded-[16px] border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 shadow-sm space-y-1">
          <p className="font-bold text-sm flex items-center gap-1.5 text-rose-700">
            <AlertTriangle size={16} />
            <span>Tài khoản đang bị khóa</span>
          </p>
          <p className="text-rose-800">
            Tài khoản nghệ sĩ của bạn đang bị giới hạn, tạm thời không thể chỉnh sửa thông tin hoặc tải ảnh mới.
          </p>
          {artist.blockedReason ? (
            <p className="pt-2 text-rose-900 font-semibold border-t border-rose-200/80 mt-2">
              Lý do từ Ban quản trị: "{artist.blockedReason}"
            </p>
          ) : null}
        </div>
      )}

      {/* Main Edit Form */}
      <form onSubmit={onSaveAll} className="space-y-6">

        {/* Section 1: Basic Profile Info */}
        <section className="rounded-[24px] border border-[#e7e1ff] bg-white p-6 shadow-sm space-y-5">
          <div className="border-b border-[#efeaff] pb-4">
            <h2 className="text-base font-bold text-[#2f2747] flex items-center gap-2">
              <User size={18} className="text-[#7c6cf2]" />
              <span>Thông tin nghệ sĩ cơ bản</span>
            </h2>
            <p className="mt-0.5 text-xs text-[#7c7891]">
              Cập nhật tên hiển thị chính thức và câu chuyện tiểu sử cá nhân.
            </p>
          </div>

          <div className="space-y-4">
            {/* Display Name */}
            <div>
              <FieldLabel
                htmlFor="edit-artist-name"
                required
                countText={`${watchName?.length || 0}/${ARTIST_INPUT_LIMITS.profileName} ký tự`}
              >
                Tên hiển thị nghệ sĩ
              </FieldLabel>
              <input
                id="edit-artist-name"
                type="text"
                maxLength={ARTIST_INPUT_LIMITS.profileName}
                disabled={isBlocked}
                placeholder="Nhập nghệ danh nghệ sĩ..."
                className={fieldInputClassName}
                {...register("name")}
              />
              {errors.name && (
                <p className="mt-1.5 text-xs font-semibold text-rose-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Biography */}
            <div>
              <FieldLabel
                htmlFor="edit-artist-bio"
                countText={`${watchBio?.length || 0}/${ARTIST_INPUT_LIMITS.profileBio} ký tự`}
              >
                Tiểu sử & Câu chuyện âm nhạc
              </FieldLabel>
              <textarea
                id="edit-artist-bio"
                rows={4}
                maxLength={ARTIST_INPUT_LIMITS.profileBio}
                disabled={isBlocked}
                placeholder="Viết một đoạn giới thiệu ngắn về phong cách âm nhạc, hành trình và câu chuyện của bạn (tối đa 1000 ký tự)..."
                className={`${fieldInputClassName} resize-y min-h-[110px]`}
                {...register("bio")}
              />
              {errors.bio && (
                <p className="mt-1.5 text-xs font-semibold text-rose-600">
                  {errors.bio.message}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Section 2: Image Uploads */}
        <section className="rounded-[24px] border border-[#e7e1ff] bg-white p-6 shadow-sm space-y-6">
          <div className="border-b border-[#efeaff] pb-4">
            <h2 className="text-base font-bold text-[#2f2747] flex items-center gap-2">
              <ImageIcon size={18} className="text-[#7c6cf2]" />
              <span>Hình ảnh nhận diện</span>
            </h2>
            <p className="mt-0.5 text-xs text-[#7c7891]">
              Thay đổi Ảnh đại diện (Avatar) và Ảnh bìa (Cover Image) cá nhân. (Hỗ trợ JPEG, PNG, WebP tối đa 5MB).
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">

            {/* Avatar Upload Box */}
            <div className="rounded-[18px] border border-[#efeaff] bg-[#faf9ff] p-5 space-y-4">
              <FieldLabel htmlFor="edit-artist-avatar-file">
                Ảnh đại diện (Avatar)
              </FieldLabel>

              <div className="flex items-center gap-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-white bg-white shadow-sm">
                  <img
                    src={avatarPreview || (removeAvatar ? getAvatarSrc({}) : avatarSrc)}
                    alt="Preview avatar"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    key={`avatar-${avatarInputKey}`}
                    id="edit-artist-avatar-file"
                    type="file"
                    accept={IMAGE_FILE_ACCEPT}
                    disabled={isBlocked}
                    className="block w-full text-xs text-[#7c7891] file:mr-3 file:rounded-xl file:border file:border-[#e7e1ff] file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#2f2747] hover:file:bg-[#faf9ff]"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      const validationError = getImageFileValidationError(file, {
                        maxSizeBytes: MAX_PROFILE_IMAGE_SIZE,
                        maxSizeLabel: "5 MB",
                      });

                      if (validationError) {
                        setMediaErrors((current) => ({
                          ...current,
                          avatar: validationError,
                        }));
                        e.target.value = "";
                        return;
                      }

                      setMediaErrors((current) => ({ ...current, avatar: "" }));
                      setAvatarFile(file);
                      if (file) {
                        setRemoveAvatar(false);
                        const reader = new FileReader();
                        reader.onloadend = () => setAvatarPreview(reader.result);
                        reader.readAsDataURL(file);
                      } else {
                        setAvatarPreview(null);
                      }
                    }}
                  />

                  {mediaErrors.avatar ? (
                    <p className="text-[11px] font-medium text-rose-600">
                      {mediaErrors.avatar}
                    </p>
                  ) : null}

                  {((hasStoredAvatar || avatarFile) && !removeAvatar) && (
                    <button
                      type="button"
                      disabled={isBlocked}
                      onClick={() => {
                        setAvatarFile(null);
                        setAvatarPreview(null);
                        setRemoveAvatar(true);
                        setMediaErrors((current) => ({ ...current, avatar: "" }));
                        setAvatarInputKey((k) => k + 1);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:underline"
                    >
                      <Trash2 size={13} />
                      <span>Xóa ảnh đại diện</span>
                    </button>
                  )}
                  {removeAvatar && !avatarFile && (
                    <p className="text-[11px] text-rose-600 font-medium">
                      Ảnh đại diện sẽ bị gỡ khi bạn bấm Lưu.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Cover Upload Box */}
            <div className="rounded-[18px] border border-[#efeaff] bg-[#faf9ff] p-5 space-y-4">
              <FieldLabel htmlFor="edit-artist-cover-file">
                Ảnh bìa (Cover Image)
              </FieldLabel>

              <div className="flex items-center gap-4">
                <div className="h-16 w-28 shrink-0 overflow-hidden rounded-xl border-2 border-white bg-white shadow-sm">
                  <img
                    src={coverPreview || (removeCover ? getCoverSrc({}) : coverSrc)}
                    alt="Preview cover"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    key={`cover-${coverInputKey}`}
                    id="edit-artist-cover-file"
                    type="file"
                    accept={IMAGE_FILE_ACCEPT}
                    disabled={isBlocked}
                    className="block w-full text-xs text-[#7c7891] file:mr-3 file:rounded-xl file:border file:border-[#e7e1ff] file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#2f2747] hover:file:bg-[#faf9ff]"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      const validationError = getImageFileValidationError(file, {
                        maxSizeBytes: MAX_PROFILE_IMAGE_SIZE,
                        maxSizeLabel: "5 MB",
                      });

                      if (validationError) {
                        setMediaErrors((current) => ({
                          ...current,
                          cover: validationError,
                        }));
                        e.target.value = "";
                        return;
                      }

                      setMediaErrors((current) => ({ ...current, cover: "" }));
                      setCoverFile(file);
                      if (file) {
                        setRemoveCover(false);
                        const reader = new FileReader();
                        reader.onloadend = () => setCoverPreview(reader.result);
                        reader.readAsDataURL(file);
                      } else {
                        setCoverPreview(null);
                      }
                    }}
                  />

                  {mediaErrors.cover ? (
                    <p className="text-[11px] font-medium text-rose-600">
                      {mediaErrors.cover}
                    </p>
                  ) : null}

                  {((hasStoredCover || coverFile) && !removeCover) && (
                    <button
                      type="button"
                      disabled={isBlocked}
                      onClick={() => {
                        setCoverFile(null);
                        setCoverPreview(null);
                        setRemoveCover(true);
                        setMediaErrors((current) => ({ ...current, cover: "" }));
                        setCoverInputKey((k) => k + 1);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:underline"
                    >
                      <Trash2 size={13} />
                      <span>Xóa ảnh bìa</span>
                    </button>
                  )}
                  {removeCover && !coverFile && (
                    <p className="text-[11px] text-rose-600 font-medium">
                      Ảnh bìa sẽ bị gỡ khi bạn bấm Lưu.
                    </p>
                  )}
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Section 3: Social Media Links */}
        <section className="rounded-[24px] border border-[#e7e1ff] bg-white p-6 shadow-sm space-y-5">
          <div className="border-b border-[#efeaff] pb-4">
            <h2 className="text-base font-bold text-[#2f2747] flex items-center gap-2">
              <Globe size={18} className="text-[#7c6cf2]" />
              <span>Liên kết mạng xã hội</span>
            </h2>
            <p className="mt-0.5 text-xs text-[#7c7891]">
              Nhập đường dẫn URL đầy đủ (tối đa 500 ký tự mỗi đường dẫn).
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <FieldLabel htmlFor="edit-artist-social-fb">Facebook</FieldLabel>
              <input
                id="edit-artist-social-fb"
                type="url"
                inputMode="url"
                maxLength={ARTIST_INPUT_LIMITS.url}
                placeholder="https://facebook.com/..."
                disabled={isBlocked}
                className={fieldInputClassName}
                {...register("socialFacebook")}
              />
              {errors.socialFacebook && (
                <p className="mt-1.5 text-xs font-semibold text-rose-600">
                  {errors.socialFacebook.message}
                </p>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="edit-artist-social-ig">Instagram</FieldLabel>
              <input
                id="edit-artist-social-ig"
                type="url"
                inputMode="url"
                maxLength={ARTIST_INPUT_LIMITS.url}
                placeholder="https://instagram.com/..."
                disabled={isBlocked}
                className={fieldInputClassName}
                {...register("socialInstagram")}
              />
              {errors.socialInstagram && (
                <p className="mt-1.5 text-xs font-semibold text-rose-600">
                  {errors.socialInstagram.message}
                </p>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="edit-artist-social-yt">YouTube</FieldLabel>
              <input
                id="edit-artist-social-yt"
                type="url"
                inputMode="url"
                maxLength={ARTIST_INPUT_LIMITS.url}
                placeholder="https://youtube.com/..."
                disabled={isBlocked}
                className={fieldInputClassName}
                {...register("socialYoutube")}
              />
              {errors.socialYoutube && (
                <p className="mt-1.5 text-xs font-semibold text-rose-600">
                  {errors.socialYoutube.message}
                </p>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="edit-artist-social-tiktok">TikTok</FieldLabel>
              <input
                id="edit-artist-social-tiktok"
                type="url"
                inputMode="url"
                maxLength={ARTIST_INPUT_LIMITS.url}
                placeholder="https://tiktok.com/@..."
                disabled={isBlocked}
                className={fieldInputClassName}
                {...register("socialTiktok")}
              />
              {errors.socialTiktok && (
                <p className="mt-1.5 text-xs font-semibold text-rose-600">
                  {errors.socialTiktok.message}
                </p>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="edit-artist-social-spotify">Spotify</FieldLabel>
              <input
                id="edit-artist-social-spotify"
                type="url"
                inputMode="url"
                maxLength={ARTIST_INPUT_LIMITS.url}
                placeholder="https://open.spotify.com/..."
                disabled={isBlocked}
                className={fieldInputClassName}
                {...register("socialSpotify")}
              />
              {errors.socialSpotify && (
                <p className="mt-1.5 text-xs font-semibold text-rose-600">
                  {errors.socialSpotify.message}
                </p>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="edit-artist-social-soundcloud">SoundCloud</FieldLabel>
              <input
                id="edit-artist-social-soundcloud"
                type="url"
                inputMode="url"
                maxLength={ARTIST_INPUT_LIMITS.url}
                placeholder="https://soundcloud.com/..."
                disabled={isBlocked}
                className={fieldInputClassName}
                {...register("socialSoundcloud")}
              />
              {errors.socialSoundcloud && (
                <p className="mt-1.5 text-xs font-semibold text-rose-600">
                  {errors.socialSoundcloud.message}
                </p>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="edit-artist-social-website">Trang web chính thức</FieldLabel>
              <input
                id="edit-artist-social-website"
                type="url"
                inputMode="url"
                maxLength={ARTIST_INPUT_LIMITS.url}
                placeholder="https://yourwebsite.com"
                disabled={isBlocked}
                className={fieldInputClassName}
                {...register("socialWebsite")}
              />
              {errors.socialWebsite && (
                <p className="mt-1.5 text-xs font-semibold text-rose-600">
                  {errors.socialWebsite.message}
                </p>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="edit-artist-social-twitter">X (Twitter)</FieldLabel>
              <input
                id="edit-artist-social-twitter"
                type="url"
                inputMode="url"
                maxLength={ARTIST_INPUT_LIMITS.url}
                placeholder="https://x.com/..."
                disabled={isBlocked}
                className={fieldInputClassName}
                {...register("socialTwitter")}
              />
              {errors.socialTwitter && (
                <p className="mt-1.5 text-xs font-semibold text-rose-600">
                  {errors.socialTwitter.message}
                </p>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="edit-artist-social-other">Liên kết khác</FieldLabel>
              <input
                id="edit-artist-social-other"
                type="url"
                inputMode="url"
                maxLength={ARTIST_INPUT_LIMITS.url}
                placeholder="https://..."
                disabled={isBlocked}
                className={fieldInputClassName}
                {...register("socialOther")}
              />
              {errors.socialOther && (
                <p className="mt-1.5 text-xs font-semibold text-rose-600">
                  {errors.socialOther.message}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Submit Actions Footer Bar */}
        <div className="flex items-center justify-end gap-3 rounded-[20px] border border-[#e7e1ff] bg-white p-4 shadow-sm">
          <Link
            to={routePaths.artistProfile}
            className="rounded-xl border border-[#e7e1ff] bg-[#faf9ff] px-5 py-2.5 text-xs font-semibold text-[#2f2747] transition hover:bg-slate-100"
          >
            Hủy thay đổi
          </Link>

          <button
            type="submit"
            disabled={isBlocked || isSaving}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#6f5cf1] bg-[#6f5cf1] px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-[#5a48d8] disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                <span>Đang lưu thay đổi...</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>Lưu thay đổi</span>
              </>
            )}
          </button>
        </div>

      </form>
    </section>
  );
}
