import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box, Button, IconButton, InputAdornment, TextField, Typography, Divider, 
} from "@mui/material";
import { Lock, Visibility, VisibilityOff, Public, Email, Person, 
  Google, Facebook, GitHub, Movie,} from "@mui/icons-material";
import "./RegisterPage.css";
import "./AfricanPage.css";
import SEO from "../components/SEO";





function RegisterPage() {
  
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "", username: "" });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      localStorage.setItem("token", data.token);
      navigate("/submit");
    } catch (err) {
      setError(err.message ?? "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <SEO title="Create Account" noindex={true} />
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
            Have an account? <Link to="/login">Sign in</Link>
          </Typography>
        </nav>
        <div className="auth-body">
          <div className="auth-card">
            <div className="auth-title">Join us</div>
            <div className="auth-sub">Create an account to submit African films.</div>
            {error && <div className="auth-error">{error}</div>}
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth name="username" label="Username (optional)" margin="normal"
                value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={{ color: "var(--muted)", fontSize: 18 }} /></InputAdornment> }}
                sx={{ "& .MuiInputBase-input": { color: "#e0e0e8" } }}
              />
              <TextField
                fullWidth name="email" label="Email" type="email" margin="normal" required
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ color: "var(--muted)", fontSize: 18 }} /></InputAdornment> }}
                sx={{ "& .MuiInputBase-input": { color: "#e0e0e8" } }}
              />
              <TextField
                fullWidth name="password" label="Password" required
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
                {loading ? "Creating account…" : "Create account"}
              </Button>
            </Box>

                        <Divider className="login-divider">OR REGISTER WITH</Divider>

            {/* OAuth */}
            <Button
              className="login-oauth-btn"
              variant="outlined"
              startIcon={<Google sx={{ fontSize: 18 }} />}
              href={`${import.meta.env.VITE_API_URL}/auth/google`}
            >
              Register with Google
            </Button>

            <Button
              className="login-oauth-btn"
              variant="outlined"
              startIcon={<Facebook sx={{ fontSize: 18 }} />}
              href={`${import.meta.env.VITE_API_URL}/auth/facebook`}
            >
              Register with Facebook
            </Button>

            <Button
              className="login-oauth-btn"
              variant="outlined"
              startIcon={<GitHub sx={{ fontSize: 18 }} />}
              href={`${import.meta.env.VITE_API_URL}/auth/github`}
            >
              Register with GitHub
            </Button>
            <div className="auth-footer">
              Already registered? <Link to="/login">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default RegisterPage;
