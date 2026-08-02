const FIELD_CONFIG = {
  title: { label: "Tên bài hát", type: "text" },
  versionTitle: { label: "Tên phiên bản", type: "text" },
  description: { label: "Mô tả", type: "multiline" },
  tags: { label: "Thẻ tìm kiếm", type: "tags" },
  genreIds: { label: "Thể loại", type: "genres" },
  audioFiles: { label: "Tệp âm thanh", type: "audio" },
  duration: { label: "Thời lượng", type: "duration" },
  avatar: { label: "Ảnh đại diện", type: "image" },
  coverImage: { label: "Ảnh bìa", type: "images" },
  lyricsStatic: { label: "Lời bài hát", type: "lyrics" },
  lyricsSyncUrl: { label: "Tệp lời đồng bộ", type: "link" },
  copyright: { label: "Thông tin bản quyền", type: "copyright" },
};

const COPYRIGHT_FIELDS = [
  ["copyrightOwner", "Chủ sở hữu bản quyền"],
  ["recordingOwner", "Chủ bản ghi"],
  ["composer", "Nhạc sĩ"],
  ["lyricist", "Tác giả lời"],
  ["producer", "Nhà sản xuất"],
  ["originalTrackTitle", "Tác phẩm gốc"],
  ["originalArtistName", "Nghệ sĩ gốc"],
  ["copyrightStatus", "Trạng thái bản quyền"],
  ["copyrightNote", "Ghi chú bản quyền"],
];

const COPYRIGHT_FLAGS = [
  ["isOriginal", "Bản gốc"],
  ["isCover", "Cover"],
  ["isRemix", "Remix"],
  ["usesSample", "Có dùng sample"],
  ["usesLicensedBeat", "Beat có giấy phép"],
  ["declarationAccepted", "Đã chấp nhận cam kết"],
];

const EmptyValue = () => (
  <span className="text-sm italic text-slate-400">Không có</span>
);

const formatDuration = (seconds) => {
  const normalized = Number(seconds);
  if (!Number.isFinite(normalized) || normalized <= 0) return "00:00";

  const minutes = Math.floor(normalized / 60);
  const remainingSeconds = Math.floor(normalized % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

const formatDateTime = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const TextValue = ({ value, multiline = false }) => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return <EmptyValue />;
  }

  return (
    <p
      className={[
        "break-words text-sm leading-6 text-slate-800",
        multiline ? "max-h-44 overflow-y-auto whitespace-pre-wrap" : "",
      ].join(" ")}
    >
      {String(value)}
    </p>
  );
};

const TagsValue = ({ values = [] }) => {
  if (!Array.isArray(values) || values.length === 0) return <EmptyValue />;

  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value, index) => (
        <span
          key={`${String(value)}-${index}`}
          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
        >
          {String(value)}
        </span>
      ))}
    </div>
  );
};

const GenresValue = ({ values = [] }) => {
  if (!Array.isArray(values) || values.length === 0) return <EmptyValue />;

  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((genre, index) => {
        const id =
          typeof genre === "object" && genre !== null
            ? genre.id || genre._id
            : genre;
        const name =
          typeof genre === "object" && genre !== null
            ? genre.name || id
            : genre;

        return (
          <span
            key={`${String(id || name)}-${index}`}
            className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700"
          >
            {String(name || "Không xác định")}
          </span>
        );
      })}
    </div>
  );
};

const ImageValue = ({ url, alt }) => {
  if (!url) return <EmptyValue />;

  return (
    <a href={url} target="_blank" rel="noreferrer" className="inline-block">
      <img
        src={url}
        alt={alt}
        className="h-28 w-28 rounded-xl border border-slate-200 object-cover shadow-sm"
      />
    </a>
  );
};

const ImagesValue = ({ values = [], alt }) => {
  if (!Array.isArray(values) || values.length === 0) return <EmptyValue />;

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((url, index) => (
        <ImageValue key={`${url}-${index}`} url={url} alt={`${alt} ${index + 1}`} />
      ))}
    </div>
  );
};

const AudioValue = ({ values = [] }) => {
  if (!Array.isArray(values) || values.length === 0) return <EmptyValue />;

  return (
    <div className="space-y-3">
      {values.map((file, index) => (
        <div
          key={`${file?.url || "audio"}-${index}`}
          className="rounded-xl border border-slate-200 bg-white p-3"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-800">
              {file?.label || `Tệp ${index + 1}`}
            </span>
            <span className="text-slate-500">
              {[file?.format, file?.bitrate ? `${file.bitrate} kbps` : ""]
                .filter(Boolean)
                .join(" • ") || "Chưa có thông số"}
            </span>
          </div>
          {file?.url ? (
            <>
              <audio controls preload="none" src={file.url} className="h-9 w-full" />
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block break-all text-xs font-medium text-blue-600 hover:underline"
              >
                Mở tệp âm thanh
              </a>
            </>
          ) : (
            <EmptyValue />
          )}
        </div>
      ))}
    </div>
  );
};

const LinkValue = ({ value }) => {
  if (!value) return <EmptyValue />;

  return (
    <a
      href={value}
      target="_blank"
      rel="noreferrer"
      className="break-all text-sm font-medium text-blue-600 hover:underline"
    >
      Mở tệp lời đồng bộ
    </a>
  );
};

const CopyrightValue = ({ value }) => {
  if (!value || typeof value !== "object") return <EmptyValue />;

  const documents = Array.isArray(value.licenseDocumentUrls)
    ? value.licenseDocumentUrls
    : [];

  return (
    <div className="space-y-3 text-xs">
      <dl className="space-y-2">
        {COPYRIGHT_FIELDS.map(([key, label]) => (
          <div key={key} className="grid gap-1 sm:grid-cols-[135px_1fr]">
            <dt className="font-medium text-slate-500">{label}</dt>
            <dd className="break-words text-slate-800">
              {value[key] === null ||
              value[key] === undefined ||
              String(value[key]).trim() === ""
                ? "—"
                : String(value[key])}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap gap-1.5">
        {COPYRIGHT_FLAGS.map(([key, label]) => (
          <span
            key={key}
            className={[
              "rounded-md border px-2 py-1 font-medium",
              value[key]
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-50 text-slate-400",
            ].join(" ")}
          >
            {label}: {value[key] ? "Có" : "Không"}
          </span>
        ))}
      </div>

      {documents.length > 0 ? (
        <div className="space-y-1">
          <p className="font-medium text-slate-500">Chứng từ đính kèm</p>
          {documents.map((url, index) => (
            <a
              key={`${url}-${index}`}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block break-all font-medium text-blue-600 hover:underline"
            >
              Tài liệu #{index + 1}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const FieldValue = ({ type, value, label }) => {
  switch (type) {
    case "multiline":
      return <TextValue value={value} multiline />;
    case "lyrics":
      return <TextValue value={value} multiline />;
    case "tags":
      return <TagsValue values={value} />;
    case "genres":
      return <GenresValue values={value} />;
    case "audio":
      return <AudioValue values={value} />;
    case "duration":
      return <TextValue value={formatDuration(value)} />;
    case "image":
      return <ImageValue url={value} alt={label} />;
    case "images":
      return <ImagesValue values={value} alt={label} />;
    case "link":
      return <LinkValue value={value} />;
    case "copyright":
      return <CopyrightValue value={value} />;
    default:
      return <TextValue value={value} />;
  }
};

const getVersionFieldValue = (version, field) => {
  if (field === "genreIds") {
    return version?.genres || version?.genreIds || [];
  }

  return version?.[field];
};

const TrackEditReviewComparison = ({ track }) => {
  const updateStatus = track?.pendingUpdate?.status;
  const isPending = track?.reviewSource === "pending_update";
  const isRejected = updateStatus === "rejected";

  if (
    (!isPending && !isRejected) ||
    !track?.liveVersion ||
    !track?.pendingUpdate?.data
  ) {
    return null;
  }

  const changedFields = Array.isArray(track.pendingUpdate.changedFields)
    ? track.pendingUpdate.changedFields.filter((field) => FIELD_CONFIG[field])
    : [];
  const submittedAt = formatDateTime(track.pendingUpdate.submittedAt);

  return (
    <section
      className={[
        "overflow-hidden rounded-2xl border bg-white shadow-sm",
        isRejected ? "border-rose-200" : "border-sky-200",
      ].join(" ")}
    >
      <div
        className={[
          "border-b px-5 py-4 sm:px-6",
          isRejected
            ? "border-rose-100 bg-rose-50"
            : "border-sky-100 bg-sky-50",
        ].join(" ")}
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <p
              className={[
                "text-[10px] font-bold uppercase tracking-[0.2em]",
                isRejected ? "text-rose-700" : "text-sky-700",
              ].join(" ")}
            >
              {isRejected
                ? "Yêu cầu chỉnh sửa gần nhất đã bị từ chối"
                : "Yêu cầu chỉnh sửa đang chờ duyệt"}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              So sánh phiên bản đang phát hành và bản artist gửi
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {isRejected
                ? "Bản đang phát hành không bị thay đổi sau quyết định từ chối."
                : "Chỉ các trường được thay đổi mới xuất hiện bên dưới."}
            </p>
            {isRejected && track.pendingUpdate.rejectReason ? (
              <p className="mt-3 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-rose-700">
                <strong>Lý do:</strong> {track.pendingUpdate.rejectReason}
              </p>
            ) : null}
          </div>
          <div className="shrink-0 text-left sm:text-right">
            <span
              className={[
                "inline-flex rounded-full border bg-white px-3 py-1 text-xs font-semibold",
                isRejected
                  ? "border-rose-200 text-rose-700"
                  : "border-sky-200 text-sky-700",
              ].join(" ")}
            >
              {changedFields.length} trường thay đổi
            </span>
            {submittedAt ? (
              <p className="mt-2 text-xs text-slate-500">Gửi lúc {submittedAt}</p>
            ) : null}
          </div>
        </div>
      </div>

      {changedFields.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-slate-500">
          Request không có danh sách trường thay đổi để đối chiếu.
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {changedFields.map((field) => {
            const config = FIELD_CONFIG[field];
            const liveValue = getVersionFieldValue(track.liveVersion, field);
            const pendingValue = getVersionFieldValue(track.pendingUpdate.data, field);

            return (
              <article key={field} className="px-5 py-5 sm:px-6">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-950">{config.label}</h3>
                  <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                    Có thay đổi
                  </span>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Đang phát hành
                    </p>
                    <FieldValue
                      type={config.type}
                      value={liveValue}
                      label={`${config.label} hiện tại`}
                    />
                  </div>
                  <div
                    className={[
                      "min-w-0 rounded-xl border p-4",
                      isRejected
                        ? "border-rose-200 bg-rose-50/60"
                        : "border-sky-200 bg-sky-50/60",
                    ].join(" ")}
                  >
                    <p
                      className={[
                        "mb-3 text-[10px] font-bold uppercase tracking-[0.18em]",
                        isRejected ? "text-rose-700" : "text-sky-700",
                      ].join(" ")}
                    >
                      {isRejected ? "Bản artist gửi đã bị từ chối" : "Bản artist gửi"}
                    </p>
                    <FieldValue
                      type={config.type}
                      value={pendingValue}
                      label={`${config.label} đề nghị`}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default TrackEditReviewComparison;
