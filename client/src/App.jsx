import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { lazy, Suspense } from "react";
import { ProtectedRoute, AdminRoute } from "./components/ProtectedRoute";
import { HelmetProvider } from "react-helmet-async";



// Lazy-loaded components
const RegisterPage     = lazy(() => import("./pages/RegisterPage"));
const LoginPage        = lazy(() => import("./pages/LoginPage"));
const AfricanPage      = lazy(() => import("./pages/AfricanPage"));
const MovieDetailPage  = lazy(() => import("./pages/MovieDetailPage"));
const AdminDashboard   = lazy(() => import("./pages/AdminDashboard"));
const ProfileSettings  = lazy(() => import("./pages/ProfileSettings"));
const ProfilePage      = lazy(() => import("./pages/ProfilePage"));
const SubmitMoviePage  = lazy(() => import("./pages/SubmitMoviePage"));
const ContactPage      = lazy(() => import("./pages/ContactPage"));


function App() {
  return (
    <HelmetProvider>

      <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#06040E" }}>
    <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #7B2FFF, #E8A020)" }} />
  </div>
}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<AfricanPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/profile/:username" element={<ProfilePage />} />
          <Route path="/movie/:tmdbId" element={<MovieDetailPage />} />
          <Route path="/contact" element={<ContactPage />} />

          {/* Protected */}
          <Route path="/submit"
            element={<ProtectedRoute message="Login or register to submit a movie to the African Cinema Community database">
              <SubmitMoviePage />
            </ProtectedRoute>
            }
          />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/settings" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
        </Routes>
      </Suspense>
      
      </ErrorBoundary>
    </BrowserRouter>

    </HelmetProvider>
    
  );
}

export default App;
