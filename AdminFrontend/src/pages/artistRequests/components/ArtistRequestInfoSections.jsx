import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  FileImage,
  Link2,
  Maximize2,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
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
  const [isAvatarPreviewOpen, setIsAvatarPreviewOpen] = useState(false);
  const registeredUserId =
    typeof artistRequest.userId === "string"
      ? artistRequest.userId
      : artistRequest.userId?._id;

  return (
    <>
      <div className="space-y-5">
      <Section title="Tổng quan" icon={ UserRound }>
        <Link
          to={ routePaths.artistRequests }
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Quay lại danh sách
        </Link>

        <div className="mt-5 flex min-w-0 items-center gap-4">
          { artistRequest?.avatar ? (
            <button
              type="button"
              onClick={ () => setIsAvatarPreviewOpen(true) }
              className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
              aria-label="Xem ảnh đại diện đầy đủ"
              title="Xem ảnh đại diện đầy đủ"
            >
              <img
                src={ artistRequest.avatar }
                alt={ artistRequest.stageName || "Ảnh đại diện artist" }
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 text-white opacity-0 transition group-hover:bg-slate-950/40 group-hover:opacity-100 group-focus-visible:bg-slate-950/40 group-focus-visible:opacity-100">
                <Maximize2 className="h-4 w-4" aria-hidden="true" />
              </span>
            </button>
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-900 text-base font-semibold text-white">
              AR
            </div>
          ) }

          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900">
              { artistRequest.stageName || "Hồ sơ đăng ký artist" }
            </h1>

            <p className="mt-1 truncate text-sm font-normal text-slate-500">
              { artistRequest.userId?.profile?.fullName || "-" } ·{ " " }
              { artistRequest.userId?.email || "-" }
            </p>

            { registeredUserId ? (
              <Link
                to={ routePaths.userDetail(registeredUserId) }
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 transition hover:text-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
              >
                Xem chi tiết người dùng
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null }
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-medium text-slate-500">Trạng thái</p>

            <div className="mt-2">
              <span
                className={ `inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${getStatusClasses(
                  artistRequest?.status
                )}` }
              >
                { getStatusLabel(artistRequest?.status) }
              </span>
            </div>
          </div>

          <Field
            label="Ngày nộp"
            value={ formatDateTime(artistRequest.createdAt) }
          />

          <Field
            label="Người nộp"
            value={ artistRequest.userId?.profile?.fullName }
          />

          <Field
            label="Ngày duyệt"
            value={ formatDateTime(artistRequest.reviewedAt) }
          />
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Field label="Email" value={ artistRequest.userId?.email } />

          <Field
            label="Trạng thái tài khoản"
            value={ artistRequest.userId?.activeStatus }
          />
        </div>

        <div className="mt-5">
          <Field label="Giới thiệu" value={ artistRequest.bio } />
        </div>

        <div className="mt-5">
          <p className="text-xs font-medium text-slate-500">Thể loại</p>

          <div className="mt-3 flex flex-wrap gap-2">
            { genres.length > 0 ? (
              genres.map((genre) => (
                <span
                  key={ genre }
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm font-medium text-slate-700"
                >
                  { genre }
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-400">-</span>
            ) }
          </div>
        </div>
      </Section>

      <Section title="Giấy tờ tùy thân" icon={ FileImage }>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Họ tên" value={ artistRequest.identityInfo?.fullName } />
          <Field label="Số CCCD" value={ artistRequest.identityInfo?.idNumber } />

          <Field
            label="Ngày sinh"
            value={ formatDate(artistRequest.identityInfo?.dateOfBirth) }
          />
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <PreviewImage
            title="Mặt trước CCCD"
            src={ artistRequest.identityInfo?.frontImage }
          />

          <PreviewImage
            title="Mặt sau CCCD"
            src={ artistRequest.identityInfo?.backImage }
          />
        </div>
      </Section>

      <Section title="Liên kết và portfolio" icon={ Link2 }>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Liên kết mạng xã hội
            </p>

            <div className="mt-3 space-y-2">
              { socialLinks.length > 0 ? (
                socialLinks.map(([key, value]) => (
                  <a
                    key={ key }
                    href={ value }
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <span className="font-medium uppercase tracking-wide text-slate-700">
                      { key }
                    </span>

                    <span className="text-xs text-slate-400">↗</span>
                  </a>
                ))
              ) : (
                <p className="text-sm text-slate-400">-</p>
              ) }
            </div>
          </div>

          <div>
            <Field
              label="Mô tả portfolio"
              value={ artistRequest.portfolio?.description }
            />
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-slate-500">Demo track</p>

            <div className="mt-3">
              <LinkList items={ demoTrackUrls } />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              Liên kết âm nhạc
            </p>

            <div className="mt-3">
              <LinkList items={ musicLinks } />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Cam kết" icon={ ShieldCheck }>
        <div className="space-y-2">
          <ChecklistStatusItem
            label="Đồng ý điều khoản"
            value={ artistRequest.artistDeclaration?.acceptedTerms === true }
          />

          <ChecklistStatusItem
            label="Cam kết bản quyền"
            value={ artistRequest.artistDeclaration?.copyrightCommitment === true }
          />

          <ChecklistStatusItem
            label="Thông tin trung thực"
            value={
              artistRequest.artistDeclaration?.truthfulInformationCommitment === true
            }
          />
        </div>

        <div className="mt-5">
          <Field
            label="Thời gian chấp nhận"
            value={ formatDateTime(artistRequest.artistDeclaration?.acceptedAt) }
          />
        </div>
      </Section>
      </div>

      { isAvatarPreviewOpen && artistRequest.avatar ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Ảnh đại diện đầy đủ"
          onClick={ () => setIsAvatarPreviewOpen(false) }
        >
          <div
            className="relative flex max-h-[90vh] max-w-5xl items-center justify-center"
            onClick={ (event) => event.stopPropagation() }
          >
            <button
              type="button"
              onClick={ () => setIsAvatarPreviewOpen(false) }
              className="absolute -top-12 right-0 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Đóng ảnh đại diện"
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>

            <img
              src={ artistRequest.avatar }
              alt={ artistRequest.stageName || "Ảnh đại diện artist" }
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      ) : null }
    </>
  );
};

export default ArtistRequestInfoSections;
