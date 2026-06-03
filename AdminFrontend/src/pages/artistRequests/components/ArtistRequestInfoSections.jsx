import { FileImage, Link2, ShieldCheck, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { routePaths } from "../../../routes/routePaths";
import {
  formatDate,
  formatDateTime,
  getStatusClasses,
  getStatusLabel,
} from "../utils";
import {
  ChecklistStatusItem,
  Field,
  LinkList,
  PreviewImage,
  Section,
} from "./ArtistRequestPrimitives";

const ArtistRequestInfoSections = ({
  artistRequest,
  genres,
  socialLinks,
  demoTrackUrls,
  musicLinks,
}) => {
  return (
    <div className="space-y-6">
      <Section title="Tổng quan" icon={UserRound}>
        <Link
          to={routePaths.artistRequests}
          className="text-sm font-semibold text-sky-700 transition hover:text-sky-800"
        >
          Quay lại danh sách
        </Link>

        <div className="mt-5 flex min-w-0 items-center gap-4">
          {artistRequest?.avatar ? (
            <img
              src={artistRequest.avatar}
              alt={artistRequest.stageName}
              className="h-16 w-16 rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-lg font-semibold text-white">
              AR
            </div>
          )}

          <div className="min-w-0">
            <h1 className="truncate text-3xl font-semibold tracking-tight text-slate-950">
              {artistRequest.stageName || "Hồ sơ đăng ký artist"}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {artistRequest.userId?.profile?.fullName || "-"} |{" "}
              {artistRequest.userId?.email || "-"}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-slate-100 px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Trạng thái
            </p>
            <div className="mt-2">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClasses(
                  artistRequest?.status
                )}`}
              >
                {getStatusLabel(artistRequest?.status)}
              </span>
            </div>
          </div>

          <Field label="Ngày nộp" value={formatDateTime(artistRequest.createdAt)} />
          <Field
            label="Người nộp"
            value={artistRequest.userId?.profile?.fullName}
          />
          <Field label="Ngày duyệt" value={formatDateTime(artistRequest.reviewedAt)} />
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Field label="Email" value={artistRequest.userId?.email} />
          <Field
            label="Trạng thái tài khoản"
            value={artistRequest.userId?.activeStatus}
          />
        </div>

        <div className="mt-6">
          <Field label="Giới thiệu" value={artistRequest.bio} />
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Thể loại
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {genres.length > 0 ? (
              genres.map((genre) => (
                <span
                  key={genre}
                  className="rounded-full bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900"
                >
                  {genre}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">-</span>
            )}
          </div>
        </div>
      </Section>

      <Section title="Giấy tờ tùy thân" icon={FileImage}>
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Họ tên" value={artistRequest.identityInfo?.fullName} />
          <Field label="Số CCCD" value={artistRequest.identityInfo?.idNumber} />
          <Field
            label="Ngày sinh"
            value={formatDate(artistRequest.identityInfo?.dateOfBirth)}
          />
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <PreviewImage
            title="Mặt trước CCCD"
            src={artistRequest.identityInfo?.frontImage}
          />
          <PreviewImage
            title="Mặt sau CCCD"
            src={artistRequest.identityInfo?.backImage}
          />
        </div>
      </Section>

      <Section title="Liên kết và portfolio" icon={Link2}>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Liên kết mạng xã hội
            </p>
            <div className="mt-3 space-y-3">
              {socialLinks.length > 0 ? (
                socialLinks.map(([key, value]) => (
                  <a
                    key={key}
                    href={value}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-900 transition hover:bg-sky-50"
                  >
                    <span className="uppercase text-sky-700">{key}</span>
                    <span className="text-slate-500">↗</span>
                  </a>
                ))
              ) : (
                <p className="text-sm text-slate-500">-</p>
              )}
            </div>
          </div>

          <div>
            <Field
              label="Mô tả portfolio"
              value={artistRequest.portfolio?.description}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Demo track
            </p>
            <div className="mt-3">
              <LinkList items={demoTrackUrls} />
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Liên kết âm nhạc
            </p>
            <div className="mt-3">
              <LinkList items={musicLinks} />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Cam kết" icon={ShieldCheck}>
        <div className="space-y-2">
          <ChecklistStatusItem
            label="Đồng ý điều khoản"
            value={artistRequest.artistDeclaration?.acceptedTerms === true}
          />
          <ChecklistStatusItem
            label="Cam kết bản quyền"
            value={artistRequest.artistDeclaration?.copyrightCommitment === true}
          />
          <ChecklistStatusItem
            label="Thông tin trung thực"
            value={
              artistRequest.artistDeclaration?.truthfulInformationCommitment ===
              true
            }
          />
        </div>

        <div className="mt-5">
          <Field
            label="Thời gian chấp nhận"
            value={formatDateTime(artistRequest.artistDeclaration?.acceptedAt)}
          />
        </div>
      </Section>
    </div>
  );
};

export default ArtistRequestInfoSections;
