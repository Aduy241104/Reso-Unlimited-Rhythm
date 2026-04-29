import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../contexts/AuthContext";
import { useAuth } from "../hooks/useAuth";
import MainLayout from "../layout/mainLayout/MainLayout";
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
import RoleRoute from "./RoleRoute";
import HomePage from "../pages/home/HomePage";

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
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/profile" element={<ProfilePage />} />

              <Route element={<RoleRoute allowedRoles={["admin"]} />}>
                <Route path="/admin" element={<AdminPage />} />
              </Route>

              <Route element={<RoleRoute allowedRoles={["artist"]} />}>
                <Route path="/artist" element={<ArtistPage />} />
              </Route>
            </Route>
          </Route>

          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppRoutes;
