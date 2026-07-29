import ContentCard from "../content/ContentCard";
import PillsFilter from "./PillsFilter";
import SectionHeader from "./SectionHeader";
import LoadingState from "../common/LoadingState";

const filterMap = {
  popular: () => true,
  albums: (item) => item.type.toLowerCase().includes("album"),
  singles: (item) => {
    const type = item.type.toLowerCase();
    return type.includes("single") || type.includes("ep");
  },
};

const DiscographySection = ({
  items = [],
  activeFilter,
  onFilterChange,
  isLoading = false,
}) => {
  const filteredItems = items.filter(filterMap[activeFilter] || filterMap.popular);

  return (
    <section className="space-y-5">
      <SectionHeader
        eyebrow="Danh mục"
        title="Danh sách phát hành"
        description="Khám phá các bản phát hành của nghệ sĩ theo bố cục gọn gàng và dễ theo dõi."
      />

      <PillsFilter
        value={ activeFilter }
        onChange={ onFilterChange }
        items={[
          { label: "Nổi bật", value: "popular" },
          { label: "Album", value: "albums" },
          { label: "Single & EP", value: "singles" },
        ]}
      />

      { isLoading ? (
        <LoadingState message="Đang tải danh sách phát hành..." className="min-h-[14rem]" />
      ) : filteredItems.length > 0 ? (
        <div className="flex gap-5 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          { filteredItems.map((item) => (
            <div
              key={ item.id }
              className="w-[14rem] min-w-[14rem] sm:w-[15rem] sm:min-w-[15rem] lg:w-[16rem] lg:min-w-[16rem]"
            >
              <ContentCard
                image={ item.image }
                title={ item.title }
                subtitle={ `${item.year} - ${item.type}` }
                href={ item.href }
                playButtonAriaLabel={ false }
              />
            </div>
          )) }
        </div>
      ) : (
        <div className="border border-dashed border-white/10 bg-white/[0.02] px-4 py-7 text-sm text-white/48">
          Chưa có bản phát hành phù hợp với bộ lọc này.
        </div>
      ) }
    </section>
  );
};

export default DiscographySection;
