import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, Plus, Upload, X } from "lucide-react";
import { createAdminGenreService, uploadAdminGenreImageService } from "../../services/adminGenreService";
import { routePaths } from "../../routes/routePaths";

const CreateGenrePage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", description: "", isActive: true });
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (field) => (event) => {
    const value = field === "isActive" ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCoverChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    setCoverFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setCoverPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const clearCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      let imageUrl = "";
      if (coverFile) {
        imageUrl = await uploadAdminGenreImageService(coverFile);
      }

      await createAdminGenreService({
        name: form.name.trim(),
        description: form.description.trim(),
        isActive: form.isActive,
        image: imageUrl,
      });

      toast.success("Khởi tạo thể loại mới thành công.");
      navigate(routePaths.genres, { replace: true });
    } catch (error) {
      setMessage(error?.response?.data?.message || error?.message || "Không thể khởi tạo thể loại nhạc.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-5xl space-y-6 p-6 bg-[#f8fafc] min-h-screen font-sans text-slate-800 antialiased">
      
      {/* HEADER BAR */}
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between border border-slate-100">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Genre Management</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Thêm thể loại mới</h1>
          <p className="mt-1 text-xs text-slate-400">Đóng gói và khởi tạo phân vùng danh mục âm nhạc mới lên hệ thống.</p>
        </div>
        <Link
          to={routePaths.genres}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 self-start md:self-center"
        >
          <ArrowLeft className="mr-2 h-3.5 w-3.5" /> Quay lại danh sách
        </Link>
      </div>

      {/* FORM CARD */}
      <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-5">
        {message && (
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600 shadow-sm animate-fade-in">
            {message}
          </div>
        )}

        {/* INPUTS ROW */}
        <div className="grid gap-5 md:grid-cols-3">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tên thể loại nhạc mới</label>
            <input
              type="text"
              value={form.name}
              onChange={handleChange("name")}
              placeholder="e.g. Pop, Rock, Lofi, Vinahouse..."
              required
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white transition font-medium"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trạng thái hiển thị</label>
            <label className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-bold transition select-none cursor-pointer h-[42px] ${
              form.isActive 
                ? "bg-emerald-50/60 border-emerald-200 text-emerald-700" 
                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100/70"
            }`}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={handleChange("isActive")}
                disabled={isSubmitting}
                className="h-4 w-4 rounded-md border-slate-300 text-slate-900 focus:ring-0 accent-slate-900 cursor-pointer"
              />
              Kích hoạt hiển thị
            </label>
          </div>
        </div>

        {/* DESCRIPTION */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mô tả chi tiết thể loại</label>
          <textarea
            value={form.description}
            onChange={handleChange("description")}
            rows={4}
            disabled={isSubmitting}
            placeholder="Nhập mô tả khái quát đặc trưng hoặc định hướng phân vùng dòng nhạc này..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white transition resize-none font-medium"
          />
        </div>

        {/* IMAGE UPLOAD COVER BOX */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ảnh bìa danh mục (Cover Image)</label>
          <div className="rounded-2xl bg-slate-50/50 border border-slate-100 p-4">
            {coverPreview ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <img src={coverPreview} alt="Preview" className="h-24 w-24 rounded-xl object-cover border border-slate-200 shadow-sm bg-white" />
                <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Ảnh mẫu đã sẵn sàng</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Tập tin ảnh sẽ được tự động đồng bộ hóa lên máy chủ khi lưu.</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={clearCover} 
                    disabled={isSubmitting} 
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 hover:text-rose-600 transition"
                  >
                    <X className="h-3.5 w-3.5" /> Gỡ bỏ ảnh
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center transition hover:border-slate-400 group">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 group-hover:bg-slate-100 transition border border-slate-100">
                  <Upload className="h-4 w-4 text-slate-500" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-800">Chọn tập tin ảnh bìa</p>
                  <p className="text-[10px] text-slate-400">Hỗ trợ định dạng PNG, JPG hoặc WEBP</p>
                </div>
                <input type="file" accept="image/*" className="sr-only" onChange={handleCoverChange} disabled={isSubmitting} />
              </label>
            )}
          </div>
        </div>

        {/* ACTIONS FOOTER */}
        <div className="flex flex-wrap gap-2.5 pt-4 border-t border-slate-50">
          <button
            type="submit"
            disabled={isSubmitting || !form.name.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang khởi tạo...</>
            ) : (
              <><Plus className="h-3.5 w-3.5" /> Tạo thể loại mới</>
            )}
          </button>
          <Link
            to={routePaths.genres}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Hủy bỏ
          </Link>
        </div>
      </form>
    </section>
  );
};

export default CreateGenrePage;