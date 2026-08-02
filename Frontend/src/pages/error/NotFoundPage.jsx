import { SearchX } from "lucide-react";

const NotFoundPage = ({
  title = "Không tìm thấy trang",
}) => (
  <section className="flex min-h-[65vh] items-center justify-center px-4 py-12">
    <div className="flex flex-col items-center text-center">
      <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-[#f5b66f]/25 bg-[#f5b66f]/10 text-[#d97706] shadow-[0_18px_60px_rgba(245,182,111,0.2)] dark:text-[#f5b66f]">
        <div className="absolute inset-3 rounded-full bg-[#f5b66f]/10 blur-md" />
        <SearchX className="relative h-11 w-11" strokeWidth={1.6} aria-hidden />
      </div>
      <h1 className="mt-7 text-2xl font-semibold tracking-tight text-[#27272a] dark:text-white sm:text-3xl">
        {title}
      </h1>
    </div>
  </section>
);

export default NotFoundPage;
