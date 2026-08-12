import { createElement, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  AudioLines,
  Check,
  CheckCircle2,
  Clock3,
  FileAudio,
  ImagePlus,
  Info,
  LockKeyhole,
  Mic2,
  Save,
  Send,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import podcastService from "../../services/podcastService";
import { CopyrightPolicyModal } from "../../components/artist/TrackCopyrightFields";
import { routePaths } from "../../routes/routePaths";

const empty = {
  title: "",
  description: "",
  audioUrl: "",
  coverImageUrl: "",
  duration: 0,
  copyrightType: "original",
  copyrightSource: "",
  copyrightProofUrl: "",
  copyrightConfirmed: false,
};

const toPodcastPayload = (value = {}) => ({
  title: typeof value.title === "string" ? value.title : "",
  description: typeof value.description === "string" ? value.description : "",
  audioUrl: typeof value.audioUrl === "string" ? value.audioUrl : "",
  coverImageUrl: typeof value.coverImageUrl === "string" ? value.coverImageUrl : "",
  duration: Number.isFinite(Number(value.duration)) ? Math.max(0, Number(value.duration)) : 0,
  copyrightType: ["original", "licensed", "third_party"].includes(value.copyrightType)
    ? value.copyrightType
    : "original",
  copyrightSource: typeof value.copyrightSource === "string" ? value.copyrightSource : "",
  copyrightProofUrl: typeof value.copyrightProofUrl === "string" ? value.copyrightProofUrl : "",
  copyrightConfirmed: value.copyrightConfirmed === true,
});

const getPodcastValidationError = (
  payload,
  { hasAudioFile = false, hasCoverFile = false, allowPendingDuration = false } = {},
) => {
  if (!payload.title.trim()) return "Vui lòng nhập tiêu đề Podcast.";
  if (!payload.description.trim()) return "Vui lòng nhập mô tả Podcast.";
  if (!payload.audioUrl.trim() && !hasAudioFile) return "Vui lòng tải lên file âm thanh.";
  if (!payload.coverImageUrl.trim() && !hasCoverFile) return "Vui lòng chọn ảnh cover Podcast.";
  if (!allowPendingDuration && !(Number(payload.duration) > 0)) {
    return "Không xác định được thời lượng file âm thanh.";
  }
  if (payload.copyrightConfirmed !== true) return "Vui lòng đọc và xác nhận chính sách bản quyền.";
  if (payload.copyrightType === "licensed" && !payload.copyrightSource.trim()) {
    return "Vui lòng nhập nguồn hoặc mô tả giấy phép.";
  }
  if (payload.copyrightType === "licensed" && !payload.copyrightProofUrl.trim()) {
    return "Vui lòng cung cấp URL bằng chứng giấy phép.";
  }
  if (payload.copyrightType === "third_party" && !payload.copyrightSource.trim()) {
    return "Vui lòng nhập nguồn nội dung bên thứ ba.";
  }

  return "";
};

const statusLabels = {
  draft: "Bản nháp",
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
};

const getError = (error) => {
  const details = Array.isArray(error?.errors)
    ? error.errors.map((item) => item?.message || item).filter(Boolean)
    : [];

  return details.length ? details.join(" ") : error?.message || "Không thể lưu Podcast.";
};

const formatDuration = (value) => {
  const seconds = Math.max(0, Math.round(Number(value) || 0));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
};

const SectionCard = ({ Icon, eyebrow, title, description, children, className = "" }) => (
  <section className={`rounded-[24px] border border-[#ebe7fb] bg-white p-4 shadow-[0_12px_36px_rgba(50,34,98,0.06)] sm:p-5 lg:p-6 ${className}`}>
    <div className="flex items-start gap-3 border-b border-[#f0edfa] pb-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#f1edff] text-[#7664df]">
        {createElement(Icon, { className: "h-5 w-5" })}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#988ebd]">{eyebrow}</p>
        <h2 className="mt-1 text-base font-bold text-[#241b45] sm:text-lg">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-[#8d87aa]">{description}</p>
      </div>
    </div>
    <div className="pt-5">{children}</div>
  </section>
);

const FieldLabel = ({ htmlFor, children, required = false }) => (
  <label htmlFor={htmlFor} className="field-label">
    {children}
    {required && <span className="ml-1 text-[#d96b7c]">*</span>}
  </label>
);

const ArtistPodcastFormPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [podcast, setPodcast] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState("");
  const audioInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const autoSubmitStarted = useRef(false);
  const readOnly = ["pending", "approved"].includes(podcast?.approvalStatus);
  const modeLabel = id ? (podcast ? statusLabels[podcast.approvalStatus] : "Chi tiết Podcast") : "Tạo bản nháp";

  useEffect(() => {
    if (id) {
      podcastService
        .getArtist(id)
        .then((item) => {
          setPodcast(item);
          setForm({
            ...empty,
            ...item,
          });
        })
        .catch((reason) => setError(getError(reason)))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const handleAudioChange = (event) => setAudioFile(event.currentTarget.files?.[0] || null);
  const handleCoverChange = (event) => {
    const file = event.currentTarget.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn đúng định dạng ảnh.");
      event.currentTarget.value = "";
      return;
    }

    setError("");
    setCoverFile(file);

    const previewUrl = URL.createObjectURL(file);

    setCoverPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }

      return previewUrl;
    });
  };
  const handlePolicyAccept = (accepted) => {
    update("copyrightConfirmed", Boolean(accepted));
    setIsPolicyModalOpen(false);
  };

  const payloadWithUploads = async () => {
    let next = toPodcastPayload(form);

    if (audioFile || coverFile) {
      const upload = await podcastService.uploadFiles({ audio: audioFile, coverImage: coverFile });
      next = {
        ...next,
        audioUrl: upload.audioUrl || next.audioUrl,
        coverImageUrl: upload.coverImageUrl || next.coverImageUrl,
        duration: upload.duration || next.duration,
      };
    }

    return next;
  };

  const save = async (submit = false) => {
    const preflightError = getPodcastValidationError(toPodcastPayload(form), {
      hasAudioFile: Boolean(audioFile),
      hasCoverFile: Boolean(coverFile),
      allowPendingDuration: Boolean(audioFile),
    });

    if (preflightError) {
      setError(preflightError);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = await payloadWithUploads();
      const payloadError = getPodcastValidationError(payload);

      if (payloadError) {
        throw new Error(payloadError);
      }

      const saved = id ? await podcastService.update(id, payload) : await podcastService.create(payload);
      setPodcast(saved);
      setForm((current) => ({
        ...current,
        ...saved,
      }));
      setAudioFile(null);
      setCoverFile(null);

      if (submit) {
        const submitted = await podcastService.submit(saved.id);
        setPodcast(submitted);
        setForm((current) => ({
          ...current,
          ...submitted,
        }));
      } else if (!id) {
        navigate(routePaths.artistPodcastEdit(saved.id), { replace: true });
      }
    } catch (reason) {
      setError(getError(reason));
    } finally {
      setSaving(false);
    }
  };
  useEffect(() => {
    return () => {
      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [coverPreviewUrl]);
  const saveRef = useRef(save);
  saveRef.current = save;

  const submitOnOpen = Boolean(location.state?.submitOnOpen);
  useEffect(() => {
    if (submitOnOpen && id && podcast && !autoSubmitStarted.current && ["draft", "rejected"].includes(podcast.approvalStatus)) {
      autoSubmitStarted.current = true;
      void saveRef.current(true);
    }
  }, [submitOnOpen, id, podcast]);

  if (loading) return <p className="py-12 text-center text-sm text-[#8d87aa]">Đang tải...</p>;

  const titleValue = typeof form.title === "string" ? form.title : "";
  const descriptionValue = typeof form.description === "string" ? form.description : "";
  const creatorName = podcast?.creator?.name || podcast?.creator?.displayName || "Nghệ sĩ Reso";
  const checklist = [
    { label: "Tiêu đề Podcast", detail: "Đặt tên rõ ràng", done: Boolean(titleValue.trim()) },
    { label: "Mô tả nội dung", detail: "Giới thiệu tập Podcast", done: Boolean(descriptionValue.trim()) },
    { label: "File âm thanh", detail: "Tải lên audio chất lượng tốt", done: Boolean(form.audioUrl || audioFile) },
    { label: "Ảnh cover", detail: "Chọn ảnh đại diện cho tập Podcast", done: Boolean(form.coverImageUrl || coverFile) },
    { label: "Xác nhận bản quyền", detail: "Kiểm tra trước khi gửi duyệt", done: Boolean(form.copyrightConfirmed) },
  ];
  const completedCount = checklist.filter((item) => item.done).length;
  const validationError = getPodcastValidationError(toPodcastPayload(form), {
    hasAudioFile: Boolean(audioFile),
    hasCoverFile: Boolean(coverFile),
    allowPendingDuration: Boolean(audioFile),
  });
  const canSave = !validationError;
  const coverSource = coverFile ? "Ảnh mới đã chọn" : form.coverImageUrl ? "Ảnh cover hiện tại" : "Chưa có ảnh cover";

  return (
    <>
      <section className="mx-auto max-w-[1540px] space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Link to={routePaths.artistPodcasts} className="inline-flex items-center gap-2 text-sm font-semibold text-[#7664df] transition hover:text-[#5946c5]">
              <ArrowLeft className="h-4 w-4" />
              Podcast của tôi
            </Link>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#9186b8]">{id ? "Quản lý nội dung" : "Tạo Podcast"}</p>
              {id && <span className="rounded-full bg-[#f1edff] px-3 py-1 text-[11px] font-bold text-[#6f5dd5]">{modeLabel}</span>}
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#241b45] sm:text-3xl">{form.title || "Tạo bản nháp Podcast mới"}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8d87aa]">Hoàn thiện thông tin bên dưới để tạo một Podcast chỉn chu và sẵn sàng gửi đội ngũ Reso duyệt.</p>
          </div>
          {id && (
            <div className="flex items-center gap-2 rounded-2xl border border-[#ebe7fb] bg-white px-3 py-2 text-xs text-[#8d87aa] shadow-[0_8px_24px_rgba(50,34,98,0.05)]">
              <span className={`h-2 w-2 rounded-full ${podcast?.approvalStatus === "approved" ? "bg-emerald-500" : podcast?.approvalStatus === "pending" ? "bg-amber-400" : "bg-[#8b78ed]"}`} />
              Trạng thái: <strong className="text-[#241b45]">{modeLabel}</strong>
            </div>
          )}
        </div>

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {podcast?.rejectReason && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><strong>Lý do từ chối:</strong> {podcast.rejectReason}</div>}
        {podcast?.isBlocked && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><strong>Podcast đã bị khóa:</strong> {podcast.blockedReason || "Liên hệ quản trị viên để biết thêm."}</div>}
        {readOnly && <div className="flex items-start gap-3 rounded-2xl border border-[#e4defd] bg-[#f8f6ff] p-4 text-sm text-[#675b91]"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#7664df]" /><span>Podcast đang ở trạng thái <strong>{modeLabel.toLowerCase()}</strong>, các trường thông tin tạm thời chỉ được xem.</span></div>}

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
          <div className="space-y-4">
            <SectionCard Icon={Info} eyebrow="01 · Thông tin Podcast" title="Đặt tên cho nội dung của bạn" description="Một tiêu đề rõ ràng giúp người nghe dễ tìm thấy Podcast hơn.">
              <div className="grid gap-5">
                <div>
                  <FieldLabel htmlFor="podcast-title" required>Tiêu đề Podcast</FieldLabel>
                  <input id="podcast-title" disabled={readOnly} value={titleValue} onChange={(event) => update("title", event.target.value)} className="field-input" placeholder="Ví dụ: Chuyện nghề sáng tạo" />
                </div>
              </div>
            </SectionCard>

            <SectionCard Icon={FileAudio} eyebrow="02 · Nội dung" title="Giới thiệu tập Podcast" description="Mô tả ngắn gọn chủ đề, khách mời hoặc điều người nghe sẽ nhận được.">
              <FieldLabel htmlFor="podcast-description" required>Mô tả chi tiết</FieldLabel>
              <textarea id="podcast-description" disabled={readOnly} value={descriptionValue} onChange={(event) => update("description", event.target.value)} rows={7} className="field-input min-h-40 resize-y" placeholder="Podcast này nói về điều gì? Hãy viết vài dòng để người nghe hiểu nội dung trước khi bắt đầu." />
              <div className="mt-2 flex items-center justify-between text-[11px] text-[#aaa3c4]"><span>Gợi ý: viết tự nhiên, dễ đọc và tập trung vào giá trị dành cho người nghe.</span><span>{descriptionValue.length} ký tự</span></div>
            </SectionCard>

            <SectionCard Icon={AudioLines} eyebrow="03 · Âm thanh & hình ảnh" title="Tải lên nội dung Podcast" description="Sử dụng file âm thanh rõ tiếng và một ảnh cover dễ nhận diện trên mọi thiết bị.">
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-[#ece8fb] bg-[#fcfbff] p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#eeeaff] text-[#7664df]"><AudioLines className="h-4 w-4" /></span>
                    <div><p className="text-sm font-bold text-[#241b45]">File âm thanh</p><p className="text-[11px] text-[#9d95bc]">MP3, WAV, M4A hoặc FLAC</p></div>
                  </div>
                  <div className="mt-4">
                    <input
                      ref={audioInputRef}
                      id="podcast-audio"
                      disabled={readOnly}
                      type="file"
                      accept=".mp3,.wav,.m4a,.flac"
                      onChange={handleAudioChange}
                      className="hidden"
                    />

                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => {
                        if (!readOnly) {
                          audioInputRef.current?.click();
                        }
                      }}
                      className={`flex min-h-32 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#cfc6fa] bg-white px-4 text-center transition hover:border-[#8b78ed] hover:bg-[#fbfaff] ${readOnly
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer"
                        }`}
                    >
                      <UploadCloud className="h-6 w-6 text-[#806ee4]" />

                      <span className="mt-2 text-sm font-semibold text-[#564a87]">
                        Chọn file âm thanh
                      </span>

                      <span className="mt-1 text-[11px] text-[#aaa3c4]">
                        MP3, WAV, M4A hoặc FLAC
                      </span>
                    </button>
                  </div>
                  {audioFile && <p className="mt-3 truncate rounded-xl bg-[#f1edff] px-3 py-2 text-xs font-semibold text-[#675b91]">Đã chọn: {audioFile.name}</p>}
                  {form.audioUrl && <audio controls src={form.audioUrl} className="mt-4 w-full" />}
                </div>

                <div className="rounded-2xl border border-[#ece8fb] bg-[#fcfbff] p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#eeeaff] text-[#7664df]"><ImagePlus className="h-4 w-4" /></span>
                    <div><p className="text-sm font-bold text-[#241b45]">Ảnh cover</p><p className="text-[11px] text-[#9d95bc]">Tỷ lệ vuông, tối thiểu 600 × 600px</p></div>
                  </div>
                  <div className="mt-4 flex items-center gap-4 rounded-2xl border border-dashed border-[#cfc6fa] bg-white p-3">
                    <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-[#7864df] via-[#4d3a9d] to-[#241b45] text-white shadow-inner">
                      {coverPreviewUrl || form.coverImageUrl ? (
                        <img
                          src={coverPreviewUrl || form.coverImageUrl}
                          alt="Ảnh cover Podcast"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Mic2 className="h-8 w-8 opacity-80" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[#564a87]">{coverFile?.name || coverSource}</p>
                      <p className="mt-1 text-[11px] leading-5 text-[#aaa3c4]">Ảnh này sẽ xuất hiện trong thẻ Podcast và trang nghe.</p>
                      <input
                        ref={coverInputRef}
                        id="podcast-cover"
                        disabled={readOnly}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        onChange={handleCoverChange}
                        className="hidden"
                      />

                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => {
                          if (!readOnly) {
                            coverInputRef.current?.click();
                          }
                        }}
                        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#ded8f9] px-3 py-2 text-xs font-bold text-[#6957d0] transition hover:bg-[#f4f1ff] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <ImagePlus className="h-3.5 w-3.5" />
                        Chọn ảnh mới
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#e9e4ff] bg-[#f8f6ff] px-4 py-3 text-xs text-[#776d9c]">
                <Clock3 className="h-4 w-4 text-[#7664df]" />
                <span>Thời lượng hiện tại: <strong className="text-[#4e437d]">{form.duration ? formatDuration(form.duration) : "Chưa xác định"}</strong></span>
                <span className="hidden h-4 w-px bg-[#ddd6fa] sm:block" />
                <span>{form.audioUrl || audioFile ? "Audio đã sẵn sàng để lưu" : "Chưa có file audio"}</span>
              </div>
            </SectionCard>

            <SectionCard Icon={ShieldCheck} eyebrow="04 · Bản quyền" title="Xác nhận quyền sử dụng nội dung" description="Thông tin minh bạch giúp Podcast được xét duyệt nhanh và an toàn hơn." className="border-[#f1e7b8] bg-[#fffefa]">
              <div className="grid gap-3 md:grid-cols-3">
                {[["original", "Nội dung gốc", "Tôi sở hữu toàn bộ nội dung"], ["licensed", "Đã được cấp phép", "Tôi có giấy phép sử dụng"], ["third_party", "Bên thứ ba", "Có nội dung thuộc bên khác"]].map(([value, label, detail]) => (
                  <label key={value} className={`cursor-pointer rounded-2xl border p-3 transition ${form.copyrightType === value ? "border-[#c9b554] bg-[#fff8d9]" : "border-[#eee8ce] bg-white hover:border-[#dcd09a]"} ${readOnly ? "pointer-events-none opacity-70" : ""}`}>
                    <span className="flex items-start gap-2">
                      <input disabled={readOnly} type="radio" checked={form.copyrightType === value} onChange={() => update("copyrightType", value)} className="mt-0.5 accent-[#8f7821]" />
                      <span><span className="block text-xs font-bold text-[#574b1c]">{label}</span><span className="mt-1 block text-[11px] leading-4 text-[#9a8d57]">{detail}</span></span>
                    </span>
                  </label>
                ))}
              </div>
              {form.copyrightType !== "original" && <div className="mt-5"><FieldLabel htmlFor="copyright-source" required>Nguồn hoặc mô tả quyền sử dụng</FieldLabel><input id="copyright-source" disabled={readOnly} value={form.copyrightSource} onChange={(event) => update("copyrightSource", event.target.value)} className="field-input border-[#e9e2bf]" placeholder="Ví dụ: Tên tác giả, hợp đồng hoặc nguồn nội dung" /></div>}
              {form.copyrightType === "licensed" && <div className="mt-4"><FieldLabel htmlFor="copyright-proof">URL bằng chứng giấy phép</FieldLabel><input id="copyright-proof" disabled={readOnly} value={form.copyrightProofUrl} onChange={(event) => update("copyrightProofUrl", event.target.value)} className="field-input border-[#e9e2bf]" placeholder="https://..." /></div>}
              {form.copyrightType === "third_party" && <p className="mt-3 rounded-xl bg-[#fff8d9] px-3 py-2 text-xs leading-5 text-[#806f2e]">Hãy ghi rõ phần nội dung bên thứ ba và quyền sử dụng trong ô nguồn ở trên.</p>}
              <div className={`mt-5 rounded-2xl border border-[#eee8ce] bg-white p-3 text-sm leading-6 text-[#63582c] ${readOnly ? "opacity-70" : ""}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="font-bold">Xác nhận chính sách bản quyền</p><p className="mt-1 text-xs text-[#9a8d57]">Đọc và xác nhận chính sách trước khi gửi Podcast đi duyệt.</p></div>
                  <button type="button" disabled={readOnly} onClick={() => setIsPolicyModalOpen(true)} className="shrink-0 rounded-xl border border-[#8b5e3c] px-3 py-2 text-xs font-bold text-[#8b5e3c] transition hover:bg-[#fcfaf7] disabled:cursor-not-allowed disabled:opacity-50">{form.copyrightConfirmed ? "Xem lại chính sách" : "Đọc chính sách bản quyền"}</button>
                </div>
                <label className={`mt-4 flex items-start gap-3 ${readOnly ? "pointer-events-none" : "cursor-pointer"}`}>
                  <input disabled={readOnly} type="checkbox" checked={Boolean(form.copyrightConfirmed)} onChange={(event) => { if (event.target.checked) setIsPolicyModalOpen(true); else update("copyrightConfirmed", false); }} className="mt-1 accent-[#8f7821]" />
                  <span><strong>Tôi xác nhận mình có quyền sử dụng</strong> nội dung âm thanh trong Podcast này và đồng ý với chính sách bản quyền.</span>
                </label>
              </div>
            </SectionCard>

            {!readOnly && <div className="flex flex-wrap justify-end gap-3 rounded-[24px] border border-[#ebe7fb] bg-white p-4 shadow-[0_12px_36px_rgba(50,34,98,0.06)] xl:hidden"><button type="button" disabled={saving || !canSave} onClick={() => save(false)} title={!canSave ? validationError : undefined} className="inline-flex items-center gap-2 rounded-xl border border-[#dcd7f2] px-4 py-3 text-sm font-bold text-[#665b8b] disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Đang lưu..." : "Lưu bản nháp"}</button><button type="button" disabled={saving || !canSave} onClick={() => save(true)} title={!canSave ? validationError : undefined} className="inline-flex items-center gap-2 rounded-xl bg-[#6957d0] px-4 py-3 text-sm font-bold text-white shadow-[0_8px_18px_rgba(105,87,208,0.22)] disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" />Gửi duyệt</button></div>}
          </div>

          <aside className="space-y-4">
            <div className="overflow-hidden rounded-[24px] border border-[#ebe7fb] bg-white shadow-[0_12px_36px_rgba(50,34,98,0.08)]">
              <div className="border-b border-[#f0edfa] px-5 py-4"><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#988ebd]">Xem trước</p><h2 className="mt-1 text-base font-bold text-[#241b45]">Thẻ Podcast</h2></div>
              <div className="p-5">
                <div className="relative aspect-square overflow-hidden rounded-[22px] bg-gradient-to-br from-[#806ee4] via-[#4d3a9d] to-[#241b45] shadow-[0_12px_24px_rgba(53,37,116,0.24)]">
                  {form.coverImageUrl ? <img src={form.coverImageUrl} alt="Xem trước cover Podcast" className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center text-white"><Mic2 className="h-12 w-12 opacity-90" /><span className="mt-4 text-[10px] font-bold uppercase tracking-[0.3em] opacity-75">Podcast mới</span></div>}
                  <span className="absolute left-3 top-3 rounded-full bg-black/20 px-2.5 py-1 text-[10px] font-bold text-white"></span>
                </div>
                <div className="mt-4"><p className="truncate text-base font-bold text-[#241b45]">{form.title || "Podcast mới"}</p><p className="mt-1 truncate text-xs text-[#8d87aa]">{creatorName}</p><div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#766c99]"><span className="rounded-full bg-[#f4f1ff] px-2.5 py-1">Podcast</span><span className="rounded-full bg-[#f4f1ff] px-2.5 py-1">{form.duration ? formatDuration(form.duration) : "--:--"}</span></div></div>
                {form.audioUrl && <audio controls src={form.audioUrl} className="mt-4 w-full" />}
              </div>
            </div>

            <div className="rounded-[24px] border border-[#ebe7fb] bg-white p-5 shadow-[0_12px_36px_rgba(50,34,98,0.06)]">
              <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#988ebd]">Tiến độ</p><h2 className="mt-1 text-base font-bold text-[#241b45]">Checklist hoàn thiện</h2></div><span className="text-sm font-bold text-[#7664df]">{completedCount}/{checklist.length}</span></div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#eeeafb]"><div className="h-full rounded-full bg-[#7967df] transition-all" style={{ width: `${(completedCount / checklist.length) * 100}%` }} /></div>
              <div className="mt-4 space-y-3">{checklist.map((item) => <div key={item.label} className="flex items-start gap-3"><span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${item.done ? "bg-[#7664df] text-white" : "border border-[#d8d2ef] text-transparent"}`}>{item.done ? <Check className="h-3 w-3" /> : <Check className="h-3 w-3" />}</span><div className="min-w-0"><p className={`text-xs font-semibold ${item.done ? "text-[#4e437d]" : "text-[#8d87aa]"}`}>{item.label}</p><p className="mt-0.5 text-[10px] text-[#aaa3c4]">{item.detail}</p></div></div>)}</div>
              {!canSave && !readOnly ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800">Hoàn tất đủ thông tin và xác nhận bản quyền trước khi lưu bản nháp hoặc gửi duyệt.</p> : null}
            </div>

            <div className="rounded-[24px] border border-[#ebe7fb] bg-white p-5 shadow-[0_12px_36px_rgba(50,34,98,0.06)]"><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#988ebd]">Thông tin Podcast</p><div className="mt-4 space-y-3 text-xs"><div className="flex items-center justify-between gap-3"><span className="text-[#9d95bc]">Loại nội dung</span><strong className="truncate text-right text-[#514777]">Podcast</strong></div><div className="flex items-center justify-between gap-3"><span className="text-[#9d95bc]">Bản quyền</span><strong className="text-right text-[#514777]">{form.copyrightType === "original" ? "Nội dung gốc" : "Đã khai báo"}</strong></div><div className="flex items-center justify-between gap-3"><span className="text-[#9d95bc]">Thời lượng</span><strong className="text-right text-[#514777]">{form.duration ? formatDuration(form.duration) : "Chưa xác định"}</strong></div></div></div>

            {!readOnly ? <div className="rounded-[24px] bg-[#2f2650] p-5 text-white shadow-[0_14px_32px_rgba(47,38,80,0.2)]"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10"><Send className="h-4 w-4" /></span><div><p className="text-sm font-bold">Hoàn tất Podcast?</p><p className="mt-1 text-xs leading-5 text-white/65">Hoàn tất checklist và xác nhận bản quyền trước khi lưu hoặc gửi Podcast.</p></div></div><div className="mt-4 grid gap-2"><button type="button" disabled={saving || !canSave} onClick={() => save(false)} title={!canSave ? validationError : undefined} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#3b2f68] transition hover:bg-[#f4f1ff] disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Đang lưu..." : "Lưu bản nháp"}</button><button type="button" disabled={saving || !canSave} onClick={() => save(true)} title={!canSave ? validationError : undefined} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" />Gửi duyệt</button></div></div> : podcast?.approvalStatus === "approved" && !podcast.isBlocked ? <div className="rounded-[24px] border border-[#ebe7fb] bg-white p-5 shadow-[0_12px_36px_rgba(50,34,98,0.06)]"><div className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /><div><p className="text-sm font-bold text-[#241b45]">Podcast đã được duyệt</p><p className="mt-1 text-xs leading-5 text-[#8d87aa]">Hiện đang {podcast.visibility === "public" ? "công khai" : "ẩn"} trên nền tảng.</p></div></div><button type="button" disabled={saving} onClick={async () => { try { const next = await podcastService.setVisibility(podcast.id, podcast.visibility === "public" ? "hidden" : "public"); setPodcast(next); } catch (reason) { setError(getError(reason)); } }} className="mt-4 w-full rounded-xl border border-[#dcd7f2] px-4 py-3 text-sm font-bold text-[#665b8b] transition hover:bg-[#f8f6ff]">{podcast.visibility === "public" ? "Ẩn Podcast" : "Hiện Podcast"}</button></div> : <div className="rounded-[24px] border border-[#ebe7fb] bg-white p-5 shadow-[0_12px_36px_rgba(50,34,98,0.06)]"><div className="flex items-start gap-3"><LockKeyhole className="h-5 w-5 shrink-0 text-[#7664df]" /><p className="text-xs leading-5 text-[#8d87aa]">Podcast đang chờ đội ngũ Reso kiểm tra. Bạn sẽ có thể chỉnh sửa sau khi nhận được phản hồi.</p></div></div>}
          </aside>
        </div>
      </section>
      {isPolicyModalOpen ? (
        <CopyrightPolicyModal
          isOpen
          accepted={Boolean(form.copyrightConfirmed)}
          onClose={() => setIsPolicyModalOpen(false)}
          onAccept={handlePolicyAccept}
        />
      ) : null}
    </>
  );
};

export default ArtistPodcastFormPage;
