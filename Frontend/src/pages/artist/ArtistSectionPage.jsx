const ArtistSectionPage = ({ title, description }) => {
  return (
    <section className="rounded-md border border-neutral-200 bg-white p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-[#8b5e3c]">
        Bảng điều khiển nghệ sĩ
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#241b15]">
        {title}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
        {description}
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="rounded-sm border border-neutral-200 bg-[#fcfaf7] p-4"
          >
            <p className="text-sm font-medium text-[#241b15]">
              Mô-đun {item}
            </p>
            <p className="mt-2 text-sm text-neutral-500">
              Khu vực này đã sẵn sàng cho các công cụ và nội dung chuyên sâu dành cho nghệ sĩ.
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ArtistSectionPage;
