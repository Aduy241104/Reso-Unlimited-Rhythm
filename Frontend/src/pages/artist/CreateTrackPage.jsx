import { useNavigate } from "react-router-dom";
import CreateTrackForm from "../../components/common/CreateTrackForm";
import { routePaths } from "../../routes/routePaths";
import {
  dashboardPanelClass,
  dashboardPageLeadClass,
  dashboardPageTitleClass,
  dashboardSecondaryButtonClass,
  dashboardSectionEyebrowClass,
} from "../../components/artist/dashboardStyles";

const CreateTrackPage = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => navigate(routePaths.artistMusic)}
        className={dashboardSecondaryButtonClass}
      >
        {"<-"} Back to Tracks
      </button>

      <section className={[dashboardPanelClass, "overflow-hidden"].join(" ")}>
        <div className="border-b border-neutral-200/70 px-6 py-5 sm:px-8">
          <p className={dashboardSectionEyebrowClass}>Create track</p>
          <h1 className={[dashboardPageTitleClass, "mt-2 text-2xl"].join(" ")}>
            Create New Track
          </h1>
          <p className={dashboardPageLeadClass}>
            Save a draft first, then finish metadata, artwork, lyrics, and copyright before submission.
          </p>
        </div>

        <div className="p-6 sm:p-8">
          <CreateTrackForm />
        </div>
      </section>
    </div>
  );
};

export default CreateTrackPage;
