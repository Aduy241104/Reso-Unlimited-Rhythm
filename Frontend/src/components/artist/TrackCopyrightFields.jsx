import { useEffect, useRef, useState } from "react";
import { ARTIST_INPUT_LIMITS } from "../../constants/artistInputLimits";
import {
  getCopyrightValidationErrors,
  isHttpUrl,
  usesThirdPartyRights,
} from "../../utils/trackWorkflow";

const COPYRIGHT_POLICY = {
  title: "Chính sách bản quyền khi tải lên bài nhạc",
  intro: "Bạn phải khai báo trung thực quyền sở hữu hoặc quyền sử dụng đối với toàn bộ nội dung trước khi gửi duyệt.",
};

const LegacyCopyrightPolicyModal = ({ isOpen, accepted, onClose, onAccept }) => {
  const scrollRef = useRef(null);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(Boolean(accepted));

  useEffect(() => {
    if (!isOpen) return undefined;
    const frame = requestAnimationFrame(() => {
      setConfirmChecked(Boolean(accepted));
      const node = scrollRef.current;
      setHasScrolledToEnd(Boolean(node && node.scrollHeight <= node.clientHeight + 8));
    });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, [accepted, isOpen]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-5">
          <h2 className="text-lg font-semibold text-[#241b15]">{COPYRIGHT_POLICY.title}</h2>
          <button type="button" onClick={onClose} className="rounded-full border border-neutral-200 px-3 py-1 text-sm text-neutral-600">Đóng</button>
        </div>
        <div ref={scrollRef} onScroll={(event) => { const node = event.currentTarget; setHasScrolledToEnd(node.scrollTop + node.clientHeight >= node.scrollHeight - 8); }} className="flex-1 space-y-4 overflow-y-auto px-6 py-5 text-sm leading-6 text-neutral-700">
          <p className="rounded-2xl border border-[#eadfce] bg-[#fcfaf7] px-4 py-3">{COPYRIGHT_POLICY.intro}</p>
          <p>Fingerprint sạch hoặc kết quả MusicBrainz chỉ là bước tham khảo tự động; không thay thế giấy tờ chứng minh quyền sở hữu hay quyền sử dụng.</p>
          <p>Nếu bài hát là cover, remix, có sample hoặc sử dụng beat bên thứ ba, bạn phải cung cấp thông tin nguồn và tài liệu phù hợp.</p>
          <p>Bạn chịu trách nhiệm trước pháp luật về khai báo và tài liệu đã cung cấp.</p>
        </div>
        <div className="border-t border-neutral-200 bg-[#fcfaf7] px-6 py-5">
          <label className="flex items-start gap-3 text-sm text-neutral-700"><input type="checkbox" checked={confirmChecked} onChange={(event) => setConfirmChecked(event.target.checked)} className="mt-1 h-4 w-4" /><span>Tôi đã đọc, hiểu và đồng ý với chính sách bản quyền.</span></label>
          <div className="mt-4 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-md border border-neutral-300 px-4 py-2 text-sm">Hủy</button><button type="button" onClick={() => onAccept(confirmChecked)} disabled={!hasScrolledToEnd || !confirmChecked} className="rounded-md bg-[#8b5e3c] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">Chấp nhận chính sách</button></div>
        </div>
      </div>
    </div>
  );
};

const FULL_COPYRIGHT_POLICY = {
  title: "Chính sách bản quyền khi tải lên bài nhạc",
  intro:
    "Vui lòng đọc kỹ trước khi tạo và phát hành bài nhạc trên nền tảng. Trước khi tải lên bài nhạc, nghệ sĩ phải đảm bảo rằng toàn bộ nội dung bao gồm tệp âm thanh, lời bài hát, ảnh bìa và các tài liệu liên quan đều được phép sử dụng hợp pháp và không vi phạm quyền sở hữu trí tuệ của bất kỳ cá nhân hoặc tổ chức nào.",
  sections: [
    {
      heading: "1. Quyền sở hữu và quyền sử dụng",
      body:
        "Bạn xác nhận rằng bạn là chủ sở hữu hợp pháp của bài nhạc, hoặc bạn đã được chủ sở hữu bản quyền cho phép bằng văn bản để tải lên và phân phối tác phẩm trên nền tảng.",
    },
    {
      heading: "2. Nội dung của bên thứ ba",
      body:
        "Nếu bài nhạc của bạn có chứa bản hát lại, bản phối lại, đoạn nhạc mẫu từ tác phẩm khác, phần nhạc nền được cấp phép, hoặc giọng hát, nhạc cụ hay nội dung do bên thứ ba cung cấp, bạn phải có đầy đủ quyền sử dụng và chịu hoàn toàn trách nhiệm về tính hợp pháp của các nội dung đó.",
    },
    {
      heading: "3. Thông tin bản quyền chính xác",
      body:
        "Mọi thông tin về tác giả, người biểu diễn, nhà sản xuất, người sở hữu bản quyền hoặc các bên liên quan được khai báo khi tạo bài nhạc phải chính xác, đầy đủ và trung thực.",
    },
    {
      heading: "4. Trách nhiệm đối với vi phạm bản quyền",
      body:
        "Nền tảng có quyền từ chối phát hành bài nhạc, ẩn hoặc gỡ bỏ bài nhạc khỏi hệ thống, tạm khóa hoặc chấm dứt tài khoản nghệ sĩ nếu phát hiện hoặc nhận được khiếu nại hợp lệ liên quan đến hành vi vi phạm bản quyền.",
    },
    {
      heading: "5. Giải quyết tranh chấp",
      body:
        "Khi có tranh chấp bản quyền, nghệ sĩ có trách nhiệm cung cấp các tài liệu chứng minh quyền sở hữu hoặc quyền sử dụng tác phẩm theo yêu cầu của nền tảng.",
    },
    {
      heading: "6. Cam kết của nghệ sĩ",
      body:
        'Bằng việc nhấn "Chấp nhận chính sách", bạn xác nhận rằng bạn đã đọc và hiểu toàn bộ chính sách bản quyền, bạn sở hữu hoặc có đầy đủ quyền sử dụng đối với bài nhạc được tải lên, và bạn chịu trách nhiệm trước pháp luật về mọi nội dung được phát hành thông qua tài khoản của mình.',
    },
  ],
};

const SCROLL_THRESHOLD = 8;

export const CopyrightPolicyModal = ({ isOpen, accepted, onClose, onAccept }) => {
  const scrollRef = useRef(null);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [progress, setProgress] = useState(0);
  const [confirmChecked, setConfirmChecked] = useState(Boolean(accepted));

  useEffect(() => {
    if (!isOpen) return undefined;

    // Reset the modal's local reading state whenever a new policy session opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasScrolledToEnd(false);
    setProgress(0);
    setConfirmChecked(Boolean(accepted));

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    const frame = requestAnimationFrame(() => {
      const node = scrollRef.current;
      if (node && node.scrollHeight <= node.clientHeight + SCROLL_THRESHOLD) {
        setHasScrolledToEnd(true);
        setProgress(100);
      }
    });

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accepted, isOpen, onClose]);

  const handleScroll = (event) => {
    const node = event.currentTarget;
    const maxScroll = node.scrollHeight - node.clientHeight;
    if (maxScroll <= SCROLL_THRESHOLD) {
      setHasScrolledToEnd(true);
      setProgress(100);
      return;
    }

    setProgress(Math.min(100, Math.max(0, (node.scrollTop / maxScroll) * 100)));
    if (node.scrollTop + node.clientHeight >= node.scrollHeight - SCROLL_THRESHOLD) {
      setHasScrolledToEnd(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/60 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="track-copyright-policy-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[85vh] min-h-0 w-full max-w-2xl flex-col overflow-y-auto overscroll-contain rounded-3xl border border-neutral-200 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-6 py-5">
          <div>
            <h2 id="track-copyright-policy-title" className="text-lg font-semibold text-[#241b15]">
              {FULL_COPYRIGHT_POLICY.title}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              {hasScrolledToEnd ? "Bạn đã đọc đến cuối chính sách." : "Vui lòng đọc toàn bộ chính sách trước khi xác nhận."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-neutral-200 px-3 py-1 text-sm text-neutral-600 transition hover:bg-neutral-50 hover:text-[#241b15]">
            Đóng
          </button>
        </div>

        <div className="h-1 w-full bg-neutral-100">
          <div className="h-full bg-[#8b5e3c] transition-[width] duration-200" style={{ width: `${progress}%` }} />
        </div>

        <div ref={scrollRef} onScroll={handleScroll} className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-6 py-5">
          <p className="rounded-2xl border border-[#eadfce] bg-[#fcfaf7] px-4 py-3 text-sm leading-6 text-neutral-700">
            {FULL_COPYRIGHT_POLICY.intro}
          </p>
          {FULL_COPYRIGHT_POLICY.sections.map((section) => (
            <section key={section.heading} className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#8b5e3c]">{section.heading}</h3>
              <p className="text-sm leading-6 text-neutral-700">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="border-t border-neutral-200 bg-[#fcfaf7] px-6 py-5">
          <label className="flex items-start gap-3 text-sm text-neutral-700">
            <input type="checkbox" checked={confirmChecked} onChange={(event) => setConfirmChecked(event.target.checked)} className="mt-1 h-4 w-4 rounded border-neutral-300 text-[#8b5e3c]" />
            <span>Tôi đã đọc, hiểu và đồng ý với chính sách bản quyền; đồng thời xác nhận rằng tôi sở hữu hoặc có đầy đủ quyền sử dụng đối với bài nhạc này.</span>
          </label>
          <div className="mt-4 flex flex-wrap justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">Hủy</button>
            <button type="button" onClick={() => onAccept(confirmChecked)} disabled={!hasScrolledToEnd || !confirmChecked} className="rounded-md bg-[#8b5e3c] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6d4a2f] disabled:cursor-not-allowed disabled:opacity-50">Chấp nhận chính sách</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Field = ({
  label,
  value,
  onChange,
  error,
  disabled,
  type = "text",
  required = false,
  placeholder = "",
  hint = "",
  lookupUrl = "",
  lookupLabel = "",
}) => (
  <div>
    <label className="block text-sm font-medium text-[#241b15]">{label}{required ? " *" : ""}</label>
    <input type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} disabled={disabled} placeholder={placeholder} maxLength={ARTIST_INPUT_LIMITS.copyrightParty} className={`mt-2 w-full rounded-md border px-3 py-2 text-sm ${error ? "border-red-500" : "border-neutral-200"}`} />
    {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
    {hint || lookupUrl ? (
      <p className="mt-1 text-xs leading-5 text-neutral-500">
        {hint}
        {hint && lookupUrl ? " " : null}
        {lookupUrl ? (
          <a href={lookupUrl} target="_blank" rel="noreferrer" className="font-medium text-[#8b5e3c] underline underline-offset-2">
            {lookupLabel}
          </a>
        ) : null}
      </p>
    ) : null}
  </div>
);

const TrackCopyrightFields = ({ value, onChange, disabled = false, errors = {} }) => {
  const copyright = value || {};
  const primary = ["original", "cover", "remix"].includes(copyright.primaryCopyrightType) ? copyright.primaryCopyrightType : "original";
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [touchedFields, setTouchedFields] = useState({});
  const localErrors = getCopyrightValidationErrors(copyright);
  const hasValue = (field) => {
    const fieldValue = copyright[field];
    if (typeof fieldValue === "boolean") return fieldValue;
    return Array.isArray(fieldValue) ? fieldValue.length > 0 : Boolean(String(fieldValue ?? "").trim());
  };
  const shouldShowLocalError = (field) => Boolean(touchedFields[field] || hasValue(field));
  const displayedErrors = { ...errors };
  Object.keys(copyright).forEach((field) => {
    // Do not keep a server error from a previous request when the current
    // value is now present and passes the local validator.
    if (hasValue(field) && !localErrors[field]) delete displayedErrors[field];
  });
  Object.keys(localErrors).forEach((field) => {
    if (shouldShowLocalError(field)) displayedErrors[field] = localErrors[field];
  });
  const markTouched = (field) => setTouchedFields((current) => ({ ...current, [field]: true }));
  const updateField = (field, nextValue) => {
    markTouched(field);
    onChange({ ...copyright, [field]: nextValue });
  };
  const updatePrimary = (nextType) => {
    markTouched("primaryCopyrightType");
    onChange({ ...copyright, primaryCopyrightType: nextType, isOriginal: nextType === "original", isCover: nextType === "cover", isRemix: nextType === "remix" });
  };
  const licenseText = Array.isArray(copyright.licenseDocumentUrls) ? copyright.licenseDocumentUrls.join("\n") : "";
  const invalidLicenseUrls = Array.isArray(copyright.licenseDocumentUrls) ? copyright.licenseDocumentUrls.filter((url) => !isHttpUrl(url)) : [];
  const handlePolicyAccept = (accepted) => {
    const next = Boolean(accepted);
    markTouched("declarationAccepted");
    markTouched("rightsConfirmed");
    onChange({ ...copyright, declarationAccepted: next, rightsConfirmed: next });
    setIsPolicyModalOpen(false);
  };

  return (
    <>
      <div className="space-y-4 rounded-md border border-neutral-200 bg-[#fcfaf7] p-4">
        <div><p className="text-sm font-medium text-[#241b15]">Bản quyền và quyền sử dụng</p><p className="mt-1 text-xs text-neutral-600">Khai báo đầy đủ trước khi gửi bài nhạc để quản trị viên phê duyệt.</p></div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Chủ sở hữu bản quyền" value={copyright.copyrightOwner} onChange={(value) => updateField("copyrightOwner", value)} error={displayedErrors.copyrightOwner} disabled={disabled} required />
          <Field label="Chủ sở hữu bản ghi âm" value={copyright.recordingOwner} onChange={(value) => updateField("recordingOwner", value)} error={displayedErrors.recordingOwner} disabled={disabled} required />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Nhạc sĩ / Composer" value={copyright.composer} onChange={(value) => updateField("composer", value)} error={displayedErrors.composer} disabled={disabled} required={primary === "original"} />
          <Field label="Người viết lời" value={copyright.lyricist} onChange={(value) => updateField("lyricist", value)} disabled={disabled} />
          <Field label="Nhà sản xuất" value={copyright.producer} onChange={(value) => updateField("producer", value)} disabled={disabled} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="ISRC (không bắt buộc)"
            value={copyright.isrc}
            onChange={(value) => updateField("isrc", value.toUpperCase())}
            error={displayedErrors.isrc}
            disabled={disabled}
            placeholder="VD: AA-6QZ-20-00047"
            hint="Mã của bản ghi âm: 2 chữ - 3 ký tự - 2 số năm - 5 số."
            lookupUrl="https://isrcsearch.ifpi.org/"
            lookupLabel="Tra cứu trên IFPI"
          />
          <Field
            label="ISWC (không bắt buộc)"
            value={copyright.iswc}
            onChange={(value) => updateField("iswc", value.toUpperCase())}
            error={displayedErrors.iswc}
            disabled={disabled}
            placeholder="VD: T-034.524.680-1"
            hint="Mã của tác phẩm: chữ T - 9 chữ số - 1 số kiểm tra."
            lookupUrl="https://iswcnet.cisac.org/"
            lookupLabel="Tra cứu trên ISWC-Net"
          />
        </div>
        <div className="space-y-3 text-sm text-neutral-700">
          <p className="font-medium text-[#241b15]">Loại quyền sử dụng chính *</p>
          <div className="flex flex-wrap gap-4">{[["original", "Tác phẩm gốc"], ["cover", "Bản hát lại"], ["remix", "Bản phối lại"]].map(([type, label]) => <label key={type} className="inline-flex items-center gap-2"><input type="radio" name="primaryCopyrightType" checked={primary === type} onChange={() => updatePrimary(type)} disabled={disabled} className="h-4 w-4" />{label}</label>)}</div>
        </div>
        {primary !== "original" ? <div className="space-y-4 rounded-md border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-medium text-amber-900">Thông tin tác phẩm gốc</p><div className="grid gap-4 md:grid-cols-2"><Field label="Tên tác phẩm gốc" value={copyright.originalTrackTitle} onChange={(value) => updateField("originalTrackTitle", value)} error={displayedErrors.originalTrackTitle} disabled={disabled} required /><Field label="Nghệ sĩ gốc" value={copyright.originalArtistName} onChange={(value) => updateField("originalArtistName", value)} error={displayedErrors.originalArtistName} disabled={disabled} required /></div><div className="grid gap-4 md:grid-cols-3"><Field label="Composer gốc" value={copyright.originalComposer} onChange={(value) => updateField("originalComposer", value)} disabled={disabled} /><Field label="ISRC gốc" value={copyright.originalISRC} onChange={(value) => updateField("originalISRC", value)} error={displayedErrors.originalISRC} disabled={disabled} /><Field label="ISWC gốc" value={copyright.originalISWC} onChange={(value) => updateField("originalISWC", value)} error={displayedErrors.originalISWC} disabled={disabled} /></div></div> : null}
        {copyright.usesThirdPartyBeat || copyright.usesLicensedBeat ? <div className="space-y-4 rounded-md border border-sky-200 bg-sky-50 p-4"><p className="text-sm font-medium text-sky-900">Thông tin third-party beat</p><div className="grid gap-4 md:grid-cols-2"><Field label="Tên beat" value={copyright.beatTitle} onChange={(value) => updateField("beatTitle", value)} error={displayedErrors.beatTitle} disabled={disabled} required /><Field label="Nhà sản xuất beat" value={copyright.beatProducer} onChange={(value) => updateField("beatProducer", value)} error={displayedErrors.beatProducer} disabled={disabled} required /></div><div className="grid gap-4 md:grid-cols-2"><div><label className="block text-sm font-medium text-[#241b15]">Loại giấy phép *</label><select value={copyright.licenseType || ""} onChange={(event) => updateField("licenseType", event.target.value)} disabled={disabled} className={`mt-2 w-full rounded-md border px-3 py-2 text-sm ${displayedErrors.licenseType ? "border-red-500" : "border-neutral-200"}`}><option value="">Chọn loại giấy phép</option><option value="exclusive">Exclusive</option><option value="non_exclusive">Non-exclusive</option><option value="custom">Custom</option><option value="other">Other</option></select>{displayedErrors.licenseType ? <p className="mt-1 text-xs text-red-500">{displayedErrors.licenseType}</p> : null}</div><Field label="Nguồn beat (không bắt buộc)" value={copyright.beatSourceUrl} onChange={(value) => updateField("beatSourceUrl", value)} error={displayedErrors.beatSourceUrl} disabled={disabled} type="url" /></div></div> : null}
        {(primary !== "original" || copyright.usesSample || copyright.usesThirdPartyBeat || usesThirdPartyRights(copyright)) ? <div><label className="block text-sm font-medium text-[#241b15]">Liên kết tham khảo (không thay thế tệp bằng chứng)</label><textarea rows={3} value={licenseText} maxLength={ARTIST_INPUT_LIMITS.copyrightLicenseUrls} onChange={(event) => updateField("licenseDocumentUrls", event.target.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))} disabled={disabled} placeholder="https://..." className={`mt-2 w-full rounded-md border px-3 py-2 text-sm ${invalidLicenseUrls.length ? "border-amber-300" : "border-neutral-200"}`} />{invalidLicenseUrls.length ? <p className="mt-1 text-xs text-amber-700">Mỗi dòng phải là URL http hoặc https.</p> : <p className="mt-1 text-xs text-neutral-500">URL chỉ để đối chiếu; tài liệu phải được tải lên ở mục bên dưới.</p>}</div> : null}
        <div><label className="block text-sm font-medium text-[#241b15]">Ghi chú bản quyền</label><textarea rows={2} value={copyright.copyrightNotes || copyright.copyrightNote || ""} onChange={(event) => onChange({ ...copyright, copyrightNote: event.target.value, copyrightNotes: event.target.value })} maxLength={ARTIST_INPUT_LIMITS.copyrightNote} disabled={disabled} className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm" /></div>
        <div className={`rounded-2xl border p-4 ${displayedErrors.declarationAccepted || displayedErrors.rightsConfirmed ? "border-red-300 bg-red-50" : "border-[#eadfce] bg-white"}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-[#241b15]">Xác nhận chính sách bản quyền</p><p className="mt-1 text-sm text-neutral-600">Đọc chính sách và xác nhận trước khi gửi duyệt.</p></div><button type="button" onClick={() => setIsPolicyModalOpen(true)} disabled={disabled} className="rounded-md border border-[#8b5e3c] px-4 py-2 text-sm font-medium text-[#8b5e3c]">{copyright.declarationAccepted ? "Xem lại chính sách" : "Đọc chính sách bản quyền"}</button></div><label className="mt-4 inline-flex items-start gap-2 text-sm text-neutral-700"><input type="checkbox" checked={Boolean(copyright.declarationAccepted && copyright.rightsConfirmed)} onChange={(event) => { if (event.target.checked) { markTouched("declarationAccepted"); markTouched("rightsConfirmed"); setIsPolicyModalOpen(true); } else { markTouched("declarationAccepted"); markTouched("rightsConfirmed"); onChange({ ...copyright, declarationAccepted: false, rightsConfirmed: false }); } }} disabled={disabled} className="mt-1 h-4 w-4" /><span>Tôi đã đọc, hiểu và đồng ý với chính sách bản quyền; đồng thời xác nhận rằng tôi có đầy đủ quyền sử dụng bài nhạc này.</span></label>{displayedErrors.declarationAccepted ? <p className="mt-2 text-xs text-red-500">{displayedErrors.declarationAccepted}</p> : displayedErrors.rightsConfirmed ? <p className="mt-2 text-xs text-red-500">{displayedErrors.rightsConfirmed}</p> : null}</div>
      </div>
      {isPolicyModalOpen ? (
        <CopyrightPolicyModal
          isOpen
          accepted={Boolean(copyright.declarationAccepted)}
          onClose={() => setIsPolicyModalOpen(false)}
          onAccept={handlePolicyAccept}
        />
      ) : null}
    </>
  );
};

export default TrackCopyrightFields;
