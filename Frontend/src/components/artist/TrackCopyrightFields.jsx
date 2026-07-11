import { useEffect, useRef, useState } from "react";
import { isHttpUrl, usesThirdPartyRights } from "../../utils/trackWorkflow";

const COPYRIGHT_POLICY = {
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
        "Nếu bài nhạc của bạn có chứa bản cover, remix, sample từ tác phẩm khác, beat được cấp phép, hoặc giọng hát, nhạc cụ hay nội dung do bên thứ ba cung cấp, bạn phải có đầy đủ quyền sử dụng và chịu hoàn toàn trách nhiệm về tính hợp pháp của các nội dung đó.",
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

const CopyrightPolicyModal = ({ isOpen, accepted, onClose, onAccept }) => {
  const scrollRef = useRef(null);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [progress, setProgress] = useState(0);
  const [confirmChecked, setConfirmChecked] = useState(Boolean(accepted));

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    setHasScrolledToEnd(false);
    setProgress(0);
    setConfirmChecked(Boolean(accepted));

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    const frame = requestAnimationFrame(() => {
      const node = scrollRef.current;
      if (!node) {
        return;
      }

      if (node.scrollHeight <= node.clientHeight + SCROLL_THRESHOLD) {
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

    const currentProgress = Math.min(
      100,
      Math.max(0, (node.scrollTop / maxScroll) * 100)
    );

    setProgress(currentProgress);

    if (node.scrollTop + node.clientHeight >= node.scrollHeight - SCROLL_THRESHOLD) {
      setHasScrolledToEnd(true);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="track-copyright-policy-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-6 py-5">
          <div>
            <h2
              id="track-copyright-policy-title"
              className="text-lg font-semibold text-[#241b15]"
            >
              {COPYRIGHT_POLICY.title}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              {hasScrolledToEnd
                ? "Bạn đã đọc đến cuối chính sách."
                : "Vui lòng đọc toàn bộ chính sách trước khi xác nhận."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-neutral-200 px-3 py-1 text-sm text-neutral-600 transition hover:bg-neutral-50 hover:text-[#241b15]"
          >
            Đóng
          </button>
        </div>

        <div className="h-1 w-full bg-neutral-100">
          <div
            className="h-full bg-[#8b5e3c] transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 space-y-5 overflow-y-auto px-6 py-5"
        >
          <p className="rounded-2xl border border-[#eadfce] bg-[#fcfaf7] px-4 py-3 text-sm leading-6 text-neutral-700">
            {COPYRIGHT_POLICY.intro}
          </p>

          {COPYRIGHT_POLICY.sections.map((section) => (
            <section key={section.heading} className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#8b5e3c]">
                {section.heading}
              </h3>
              <p className="text-sm leading-6 text-neutral-700">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="border-t border-neutral-200 bg-[#fcfaf7] px-6 py-5">
          <label className="flex items-start gap-3 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={confirmChecked}
              onChange={(event) => setConfirmChecked(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-neutral-300 text-[#8b5e3c]"
            />
            <span>
              Tôi đã đọc, hiểu và đồng ý với chính sách bản quyền; đồng thời xác nhận
              rằng tôi sở hữu hoặc có đầy đủ quyền sử dụng đối với bài nhạc này.
            </span>
          </label>

          <div className="mt-4 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => onAccept(confirmChecked)}
              disabled={!hasScrolledToEnd || !confirmChecked}
              className="rounded-md bg-[#8b5e3c] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6d4a2f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Chấp nhận chính sách
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TrackCopyrightFields = ({ value, onChange, disabled = false, errors = {} }) => {
  const copyright = value || {};
  const thirdParty = usesThirdPartyRights(copyright);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

  const updateField = (field, nextValue) => {
    onChange({
      ...copyright,
      [field]: nextValue,
    });
  };

  const updateRightsType = (field) => {
    onChange({
      ...copyright,
      isOriginal: field === "isOriginal",
      isCover: field === "isCover",
      isRemix: field === "isRemix",
      usesSample: field === "usesSample",
      usesLicensedBeat: field === "usesLicensedBeat",
    });
  };

  const licenseText = Array.isArray(copyright.licenseDocumentUrls)
    ? copyright.licenseDocumentUrls.join("\n")
    : "";
  const invalidLicenseUrls = Array.isArray(copyright.licenseDocumentUrls)
    ? copyright.licenseDocumentUrls.filter((url) => !isHttpUrl(url))
    : [];

  const handlePolicyAccept = (nextValue) => {
    updateField("declarationAccepted", Boolean(nextValue));
    setIsPolicyModalOpen(false);
  };

  return (
    <>
      <div className="space-y-4 rounded-md border border-neutral-200 bg-[#fcfaf7] p-4">
        <div>
          <p className="text-sm font-medium text-[#241b15]">
            Bản quyền và quyền sử dụng
          </p>
          <p className="mt-1 text-xs text-neutral-600">
            Bắt buộc trước khi bạn gửi bài nhạc để quản trị viên phê duyệt.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[#241b15]">
              Chủ sở hữu bản quyền *
            </label>
            <input
              type="text"
              value={copyright.copyrightOwner || ""}
              onChange={(event) => updateField("copyrightOwner", event.target.value)}
              disabled={disabled}
              className={`mt-2 w-full rounded-md border px-3 py-2 text-sm ${
                errors.copyrightOwner ? "border-red-500" : "border-neutral-200"
              }`}
            />
            {errors.copyrightOwner ? (
              <p className="mt-1 text-xs text-red-500">{errors.copyrightOwner}</p>
            ) : null}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#241b15]">
              Chủ sở hữu bản ghi âm *
            </label>
            <input
              type="text"
              value={copyright.recordingOwner || ""}
              onChange={(event) => updateField("recordingOwner", event.target.value)}
              disabled={disabled}
              className={`mt-2 w-full rounded-md border px-3 py-2 text-sm ${
                errors.recordingOwner ? "border-red-500" : "border-neutral-200"
              }`}
            />
            {errors.recordingOwner ? (
              <p className="mt-1 text-xs text-red-500">{errors.recordingOwner}</p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["composer", "Nhạc sĩ"],
            ["lyricist", "Người viết lời"],
            ["producer", "Nhà sản xuất"],
          ].map(([field, label]) => (
            <div key={field}>
              <label className="block text-sm font-medium text-[#241b15]">
                {label}
              </label>
              <input
                type="text"
                value={copyright[field] || ""}
                onChange={(event) => updateField(field, event.target.value)}
                disabled={disabled}
                className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-neutral-700">
          {[
            ["isOriginal", "Tác phẩm gốc"],
            ["isCover", "Bản cover"],
            ["isRemix", "Bản remix"],
            ["usesSample", "Có sử dụng sample"],
            ["usesLicensedBeat", "Beat được cấp phép"],
          ].map(([field, label]) => (
            <label key={field} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(copyright[field])}
                onChange={() => updateRightsType(field)}
                disabled={disabled}
                className="h-4 w-4 rounded border-neutral-300 text-[#8b5e3c]"
              />
              {label}
            </label>
          ))}
        </div>

        {thirdParty ? (
          <div className="space-y-4 rounded-md border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">
              Thông tin quyền sử dụng của bên thứ ba
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[#241b15]">
                  Tên bài gốc *
                </label>
                <input
                  type="text"
                  value={copyright.originalTrackTitle || ""}
                  onChange={(event) => updateField("originalTrackTitle", event.target.value)}
                  disabled={disabled}
                  className={`mt-2 w-full rounded-md border px-3 py-2 text-sm ${
                    errors.originalTrackTitle ? "border-red-500" : "border-neutral-200"
                  }`}
                />
                {errors.originalTrackTitle ? (
                  <p className="mt-1 text-xs text-red-500">{errors.originalTrackTitle}</p>
                ) : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#241b15]">
                  Tên nghệ sĩ gốc *
                </label>
                <input
                  type="text"
                  value={copyright.originalArtistName || ""}
                  onChange={(event) => updateField("originalArtistName", event.target.value)}
                  disabled={disabled}
                  className={`mt-2 w-full rounded-md border px-3 py-2 text-sm ${
                    errors.originalArtistName ? "border-red-500" : "border-neutral-200"
                  }`}
                />
                {errors.originalArtistName ? (
                  <p className="mt-1 text-xs text-red-500">{errors.originalArtistName}</p>
                ) : null}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#241b15]">
                URL tài liệu cấp phép * (mỗi dòng một URL)
              </label>
              <textarea
                rows={3}
                value={licenseText}
                onChange={(event) =>
                  updateField(
                    "licenseDocumentUrls",
                    event.target.value
                      .split(/\r?\n/)
                      .map((line) => line.trim())
                      .filter(Boolean)
                  )
                }
                disabled={disabled}
                placeholder="https://..."
                className={`mt-2 w-full rounded-md border px-3 py-2 text-sm ${
                  errors.licenseDocumentUrls
                    ? "border-red-500"
                    : invalidLicenseUrls.length > 0
                      ? "border-amber-300"
                      : "border-neutral-200"
                }`}
              />
              {errors.licenseDocumentUrls ? (
                <p className="mt-1 text-xs text-red-500">{errors.licenseDocumentUrls}</p>
              ) : invalidLicenseUrls.length > 0 ? (
                <p className="mt-1 text-xs text-amber-700">
                  Each line must be a full URL starting with `http://` or `https://`.
                  Values like `aaa` will be ignored when the track is submitted.
                </p>
              ) : (
                <p className="mt-1 text-xs text-neutral-500">
                  Example: `https://drive.google.com/...` or a public Dropbox/Cloudinary link.
                </p>
              )}
            </div>
          </div>
        ) : null}

        <div>
          <label className="block text-sm font-medium text-[#241b15]">
            Ghi chú bản quyền
          </label>
          <textarea
            rows={2}
            value={copyright.copyrightNote || ""}
            onChange={(event) => updateField("copyrightNote", event.target.value)}
            disabled={disabled}
            className="mt-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>

        <div
          className={`rounded-2xl border p-4 ${
            errors.declarationAccepted
              ? "border-red-300 bg-red-50"
              : "border-[#eadfce] bg-white"
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[#241b15]">
                Xác nhận chính sách bản quyền
              </p>
              <p className="mt-1 text-sm text-neutral-600">
                Vui lòng mở chính sách, đọc kỹ nội dung và xác nhận trước khi tiếp tục
                tạo bài nhạc.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPolicyModalOpen(true)}
              disabled={disabled}
              className="rounded-md border border-[#8b5e3c] px-4 py-2 text-sm font-medium text-[#8b5e3c] transition hover:bg-[#8b5e3c] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copyright.declarationAccepted
                ? "Xem lại chính sách"
                : "Đọc chính sách bản quyền"}
            </button>
          </div>

          <label className="mt-4 inline-flex items-start gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={Boolean(copyright.declarationAccepted)}
              onChange={(event) => {
                if (event.target.checked) {
                  setIsPolicyModalOpen(true);
                  return;
                }

                updateField("declarationAccepted", false);
              }}
              disabled={disabled}
              className={`mt-1 h-4 w-4 rounded border-neutral-300 text-[#8b5e3c] ${
                errors.declarationAccepted ? "border-red-500" : ""
              }`}
            />
            <span>
              Tôi đã đọc, hiểu và đồng ý với chính sách bản quyền; đồng thời xác nhận
              rằng tôi sở hữu hoặc có đầy đủ quyền sử dụng đối với bài nhạc này.
            </span>
          </label>
          {errors.declarationAccepted ? (
            <p className="mt-2 text-xs text-red-500">{errors.declarationAccepted}</p>
          ) : null}
        </div>
      </div>

      <CopyrightPolicyModal
        isOpen={isPolicyModalOpen}
        accepted={Boolean(copyright.declarationAccepted)}
        onClose={() => setIsPolicyModalOpen(false)}
        onAccept={handlePolicyAccept}
      />
    </>
  );
};

export default TrackCopyrightFields;
