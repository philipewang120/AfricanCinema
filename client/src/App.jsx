import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import ProtectedRoute from "./components/ProtectedRoute";

import AfricanPage from "./pages/AfricanPage";
import SubmitMoviePage from "./pages/SubmitMoviePage";
import AdminDashboard from "./pages/AdminDashboard";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfileSettings from "./pages/ProfileSettings";
import ProfilePage from "./pages/ProfilePage";

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          {/* Public */}
          <Route path="/"                  element={<AfricanPage />} />
          <Route path="/login"             element={<LoginPage />} />
          <Route path="/register"          element={<RegisterPage />} />
          <Route path="/profile/:username" element={<ProfilePage />} />

          {/* Protected */}
          <Route path="/submit"
                element={<ProtectedRoute message="Login or register to submit a movie to the African Cinema Community database">
      <SubmitMoviePage />
    </ProtectedRoute>
  }
/>
          <Route path="/admin"    element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
