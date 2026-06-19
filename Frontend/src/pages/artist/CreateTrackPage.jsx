import { useNavigate } from "react-router-dom";
import CreateTrackForm from "../../components/common/CreateTrackForm";
import { routePaths } from "../../routes/routePaths";

const CreateTrackPage = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate(routePaths.artistMusic)}
        className="text-sm text-neutral-600 transition-colors hover:text-[#8b5e3c]"
      >
        ← Quay lại nhạc của tôi
      </button>
      <CreateTrackForm />
    </div>
  );
};

export default CreateTrackPage;
