import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CreateTrackForm from "../../components/common/CreateTrackForm";
import { routePaths } from "../../routes/routePaths";

const CreateTrackPage = () => {
  const navigate = useNavigate();

  return (
    <section className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(routePaths.artistMusic)}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#6b6682] transition hover:text-[#3d2d73]"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại quản lý bài hát
      </button>

      <div className="rounded-[30px] border border-[#ece8ff] bg-white p-6 shadow-[0_18px_50px_rgba(32,23,71,0.08)] sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7c6cf2]">
          Tạo bài hát
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#241b45]">
          Tạo bản nháp bài hát mới
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#8d87aa]">
          Tải lên file âm thanh gốc, thêm ảnh đại diện hoặc ảnh bìa, hoàn thiện
          thông tin bản quyền và lưu thành bản nháp trước khi gửi duyệt.
        </p>

        <div className="mt-6">
          <CreateTrackForm />
        </div>
      </div>
    </section>
  );
};

export default CreateTrackPage;
