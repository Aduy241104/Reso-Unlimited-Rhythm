import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../contexts/AuthContext";
import { useAuth } from "../hooks/useAuth";
import LoginPage from "../pages/auth/LoginPage";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
import RoleRoute from "./RoleRoute";

const RegisterPage = () => {
  return (
    <section>
      <h1>Register</h1>
      <p>Public route: implement register form here.</p>
      <div className="bg-red-500 text-white p-4">
        Test Tailwind
      </div>
    </section>
  );
};

const HomePage = () => {
  const { user, logout } = useAuth();

  return (
    <section>
      <h1>Home</h1>
      <p>Welcome {user?.name || user?.email || "User"}.</p>
      <button type="button" onClick={logout}>
        Logout
      </button>
    </section>
  );
};

const ProfilePage = () => {
  const { user } = useAuth();

  return (
    <section>
      <h1>Profile</h1>
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </section>
  );
};

const AdminPage = () => (
  <section>
    <h1>Admin</h1>
    <p>Only admin can access this route.</p>
  </section>
);

const ArtistPage = () => (
  <section>
    <h1>Artist</h1>
    <p>Only artist can access this route.</p>
  </section>
);

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />

            <Route element={<RoleRoute allowedRoles={["admin"]} />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={["artist"]} />}>
              <Route path="/artist" element={<ArtistPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppRoutes;
