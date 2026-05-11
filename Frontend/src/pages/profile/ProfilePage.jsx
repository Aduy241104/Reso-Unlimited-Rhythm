import { useAuth } from "../../hooks/useAuth";

const ProfilePage = () => {
  const { user } = useAuth();

  return (
    <section>
      <h1>Profile</h1>
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </section>
  );
};

export default ProfilePage;
