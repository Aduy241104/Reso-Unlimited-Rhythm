import { useNavigate } from "react-router-dom";
import CreateTrackForm from "../../components/common/CreateTrackForm";
import { routePaths } from "../../routes/routePaths";

const CreateTrackPage = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate(routePaths.artistMusic)}
        className="text-sm text-neutral-600 hover:text-[#8b5e3c] transition-colors"
      >
        ← Back to My Music
      </button>
      <CreateTrackForm />
    </div>
  );
};

export default CreateTrackPage;
