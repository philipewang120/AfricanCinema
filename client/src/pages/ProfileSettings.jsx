import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getToken, saveToken } from "../api";
import "./ProfileSettings.css";
import "./AfricanPage.css";
import {
  Box, Button, TextField, Typography, Stack,
  Switch, FormControlLabel, Avatar, CircularProgress,
} from "@mui/material";
import {
  Public, ArrowBack, CameraAlt, Save, Lock, LockOpen, Person,
} from "@mui/icons-material";





function usernameRules(val) {
  return [
    { label: "At least 3 characters",              valid: val.length >= 3 },
    { label: "No more than 30 characters",          valid: val.length <= 30 && val.length > 0 },
    { label: "Letters, numbers, underscores only",  valid: /^[a-zA-Z0-9_]*$/.test(val) && val.length > 0 },
  ];
}

function ProfileSettings() {
  
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Read current user from token
  const token = getToken();
  let currentUser = null;
  if (token) {
    try { currentUser = JSON.parse(atob(token.split(".")[1])); } catch (_) {}
  }

  const [username,    setUsername]    = useState(currentUser?.username ?? "");
  const [bio,         setBio]         = useState("");
  const [isPublic,    setIsPublic]    = useState(false);
  const [profilePic,  setProfilePic]  = useState(currentUser?.profile_pic ?? "");
  const [avatarFile,  setAvatarFile]  = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(currentUser?.profile_pic ?? "");
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [uploadingPic,setUploadingPic]= useState(false);
  const [success,     setSuccess]     = useState("");
  const [error,       setError]       = useState("");

  const rules = usernameRules(username);
  const allRulesPass = rules.every(r => r.valid);
  const bioLength = bio.length;

  // Load current profile data
  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    if (!currentUser?.username) { setLoading(false); return; }

    apiFetch(`/profile/${currentUser.username}`)
      .then(r => r?.json())
      .then(data => {
        if (data) {
          setUsername(data.username ?? "");
          setBio(data.bio ?? "");
          setIsPublic(data.is_public ?? false);
          setProfilePic(data.profile_pic ?? "");
          setAvatarPreview(data.profile_pic ?? "");
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError("");
  }

  async function uploadAvatar() {
    if (!avatarFile) return null;
    setUploadingPic(true);
    try {
      const formData = new FormData();
      formData.append("avatar", avatarFile);

      const res = await fetch(`${import.meta.env.VITE_API_URL}/profile/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData, // No Content-Type header — browser sets it with boundary
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Save new token with updated profile pic
      saveToken(data.token);
      return data.profile_pic;
    } catch (err) {
      setError(err.message ?? "Failed to upload photo.");
      return null;
    } finally {
      setUploadingPic(false);
    }
  }

  async function handleSave() {
    if (!allRulesPass) {
      setError("Please fix the username issues before saving.");
      return;
    }
    if (bioLength > 150) {
      setError("Bio must be 150 characters or less.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // Upload avatar first if changed
      let newProfilePic = profilePic;
      if (avatarFile) {
        const uploaded = await uploadAvatar();
        if (!uploaded) { setSaving(false); return; }
        newProfilePic = uploaded;
      }

      // Update profile info
      const res = await apiFetch("/profile/edit", {
        method: "PUT",
        body: JSON.stringify({ username, bio, profile_pic: newProfilePic }),
      });

      const data = await res?.json();
      if (!res?.ok) throw new Error(data?.message ?? "Failed to save");

      // Save fresh token
      if (data.token) saveToken(data.token);

      setSuccess("Profile updated successfully!");
      setAvatarFile(null);

      // Navigate to their profile after short delay
      setTimeout(() => navigate(`/`), 1200);

    } catch (err) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePrivacyToggle() {
    try {
      const res = await apiFetch("/profile/privacy", { method: "PUT" });
      const data = await res?.json();
      if (data) setIsPublic(data.is_public);
    } catch (err) {
      setError("Failed to update privacy setting.");
    }
  }

  if (loading) return (
    <div className="set-page adm-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <CircularProgress sx={{ color: "var(--electric)" }} />
    </div>
  );

  const initial = username?.charAt(0).toUpperCase();

  return (
    <div className="set-page adm-page">
      <nav className="adm-nav set-nav">
        <Box
          className="af-logo"
          onClick={() => navigate("/")}
          sx={{ flexShrink: 0, cursor: "pointer" }}
        >
           <img
    src="/images/logo.png"
    alt="AfroCiné"
    className="af-logo-img"
  />
  <span className="af-logo-text-afro">AFRO</span>
  <span className="af-logo-text-cine">CINÉ</span>
        </Box>
        <Button
          className="adm-back-btn set-back-btn"
          startIcon={<ArrowBack sx={{ fontSize: 15 }} />}
          onClick={() => navigate(`/`)}
        >
          Back to home
        </Button>
      </nav>

      <div className="adm-body set-body">
        <div className="set-hero-card fade-up">
          <div>
            <Typography className="set-page-title">Settings</Typography>
            <Typography className="set-page-sub">Manage your profile photo, bio, and privacy preferences.</Typography>
          </div>
          <div className="set-hero-badge">Your profile</div>
        </div>

        {success && <div className="set-success fade-up">✓ {success}</div>}
        {error && <div className="set-error fade-up">✕ {error}</div>}

        <div className="set-card fade-up">
          <div className="set-card-title">
            <CameraAlt sx={{ fontSize: 16 }} /> PROFILE PHOTO
          </div>
          <div className="set-avatar-wrap">
            <div className="set-avatar-btn" onClick={() => fileInputRef.current?.click()}>
              <Avatar
                src={avatarPreview}
                sx={{ width: 80, height: 80, fontSize: 32, fontFamily: "var(--font-display)", background: "var(--raised)", border: "1px solid var(--border)" }}
              >
                {!avatarPreview && initial}
              </Avatar>
              <div className="set-avatar-overlay">
                {uploadingPic
                  ? <CircularProgress size={20} sx={{ color: "#fff" }} />
                  : <CameraAlt sx={{ fontSize: 20, color: "#fff" }} />
                }
              </div>
            </div>
            <div className="set-avatar-hint">
              <strong>Click to upload a new photo</strong><br />
              JPG, PNG or WebP · Max 5MB<br />
              Will be cropped to a square
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={handleAvatarChange}
          />
          {avatarFile && (
            <Typography sx={{ fontSize: 12, color: "var(--accent2)", mt: 1 }}>
              ✓ New photo selected — save to apply
            </Typography>
          )}
        </div>

        <div className="set-card fade-up">
          <div className="set-card-title">
            <Person sx={{ fontSize: 16 }} /> PROFILE INFO
          </div>
          <Stack spacing={2.5}>
            <Box>
              <TextField
                className="set-field"
                label="Username"
                fullWidth
                value={username}
                onChange={e => { setUsername(e.target.value); setError(""); }}
                inputProps={{ maxLength: 30 }}
              />
              <div className="set-username-rules">
                {rules.map((r, i) => (
                  <div key={i} className={`set-rule${r.valid ? " valid" : ""}`}>
                    <div className="set-rule-dot" />
                    {r.label}
                  </div>
                ))}
              </div>
            </Box>

            <Box>
              <TextField
                className="set-field"
                label="Bio"
                fullWidth
                multiline
                rows={3}
                value={bio}
                onChange={e => { setBio(e.target.value); setError(""); }}
                inputProps={{ maxLength: 150 }}
                placeholder="Tell people a little about yourself…"
              />
              <div className={`set-char-count${bioLength > 130 ? " warn" : ""}`}>
                {bioLength}/150
              </div>
            </Box>
          </Stack>
        </div>

        <div className="set-card fade-up">
          <div className="set-card-title">
            <Lock sx={{ fontSize: 16 }} /> PRIVACY
          </div>
          <div className="set-privacy-row">
            <div className="set-privacy-info">
              <div className="set-privacy-label">
                {isPublic ? "Public Profile" : "Private Profile"}
              </div>
              <div className="set-privacy-desc">
                {isPublic
                  ? "Anyone can see your movies, stats and activity"
                  : "Only your followers can see your content"}
              </div>
            </div>
            <Switch
              checked={isPublic}
              onChange={handlePrivacyToggle}
              sx={{
                "& .MuiSwitch-thumb": { background: isPublic ? "var(--accent2)" : "var(--muted)" },
                "& .MuiSwitch-track": { background: "var(--raised) !important" },
                "& .Mui-checked + .MuiSwitch-track": { background: "var(--accent2) !important", opacity: "0.4 !important" },
              }}
            />
          </div>
        </div>

        <Button
          className="set-save-btn fade-up"
          onClick={handleSave}
          disabled={saving || !allRulesPass}
          startIcon={saving ? <CircularProgress size={16} sx={{ color: "var(--ink)" }} /> : <Save sx={{ fontSize: 18 }} />}
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

export default ProfileSettings;
