import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation, } from "react-router-dom";
import {
  Box, Button, IconButton, InputAdornment, TextField, Typography, Divider,
} from "@mui/material";
import { Lock, Visibility, VisibilityOff, Public, Email,
  Google, Facebook, GitHub, Movie,} from "@mui/icons-material";
import "./LoginPage.css";
import "./AfricanPage.css"; 
import SEO from "../components/SEO";





function LoginPage() {
 
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });
  const location = useLocation();
  const message = location.state?.message;
  const from = location.state?.from || "/";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      localStorage.setItem("token", data.token);
      navigate(from, { replace: true }); ;
    } catch (err) {
      setError(err.message ?? "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <SEO title="Sign In" noindex={true} />
      
      <div className="auth-page">
        <nav className="auth-nav">
          <div className="af-logo" onClick={() => navigate("/")}>
 <img
    src="/images/logo.png"
    alt="AfroCiné"
    className="af-logo-img"
  />
  <span className="af-logo-text-afro">AFRO</span>
  <span className="af-logo-text-cine">CINÉ</span>
</div>


          <Typography sx={{ fontSize: 13, color: "var(--muted)" }}>
            New here? <Link to="/register">Register</Link>
          </Typography>
        </nav>

               {/* Show redirect message if present */}
      {message && (
        <div className="login-redirect-banner">
          <span className="login-redirect-icon">🎬</span>
          <div>
            <div className="login-redirect-msg">{message}</div>
            <div className="login-redirect-sub">
              Don't have an account?{" "}
              <span
                className="login-redirect-link"
                onClick={() => navigate("/register", { state: { from, message } })}
              >
                Register here
              </span>
            </div>
          </div>
        </div>
      )}
        <div className="auth-body">
          <div className="auth-card">
            <div className="auth-title">Sign in</div>
            <div className="auth-sub">Submit films and track your contributions.</div>
            {error && <div className="auth-error">{error}</div>}
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth name="email" label="Email" type="email" margin="normal"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ color: "var(--muted)", fontSize: 18 }} /></InputAdornment> }}
                sx={{ "& .MuiInputBase-input": { color: "#e0e0e8" } }}
              />
              <TextField
                fullWidth name="password" label="Password"
                type={showPassword ? "text" : "password"} margin="normal"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Lock sx={{ color: "var(--muted)", fontSize: 18 }} /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: "var(--muted)" }}>
                        {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ "& .MuiInputBase-input": { color: "#e0e0e8" } }}
              />
              <Button type="submit" className="auth-submit" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </Box>

            <Divider className="login-divider">OR CONTINUE WITH</Divider>

            {/* OAuth */}
            <Button
              className="login-oauth-btn"
              variant="outlined"
              startIcon={<Google sx={{ fontSize: 18 }} />}
              href={`${import.meta.env.VITE_API_URL}/auth/google`}
            >
              Continue with Google
            </Button>

            <Button
              className="login-oauth-btn"
              variant="outlined"
              startIcon={<Facebook sx={{ fontSize: 18 }} />}
              href={`${import.meta.env.VITE_API_URL}/auth/facebook`}
            >
              Continue with Facebook
            </Button>

            <Button
              className="login-oauth-btn"
              variant="outlined"
              startIcon={<GitHub sx={{ fontSize: 18 }} />}
              href={`${import.meta.env.VITE_API_URL}/auth/github`}
            >
              Continue with GitHub
            </Button>
            <div className="auth-footer">
              No account? <Link to="/register">Create one free</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default LoginPage;
