import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch, getToken } from "../api";
import "./ProfilePage.css";
import "./AfricanPage.css";
import SEO from "../components/SEO";
import { Box, Button, Typography, Avatar, Chip, CircularProgress } from "@mui/material";
import { Movie, ArrowBack, Lock, Star, Public} from "@mui/icons-material";

function useFonts() {
  useEffect(() => {
    const id = "gfonts-afrocine";
    const existingLink = document.getElementById(id);
    if (existingLink) return;

    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

function ProfilePage() {
  useFonts();
  const { username } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);

    apiFetch(`/profile/${username}`)
      .then(async r => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then(data => { if (data) setProfile(data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="prof-page adm-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <CircularProgress sx={{ color: "var(--electric)" }} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="prof-page adm-page">
        <ProfileNav navigate={navigate} />
        <div className="adm-body prof-body">
          <div className="prof-empty-card fade-up">
            <Typography className="prof-empty-title">USER NOT FOUND</Typography>
            <Typography className="prof-empty-sub">This profile doesn't exist.</Typography>
            <Button className="prof-back-cta" onClick={() => navigate("/")}>Back to home</Button>
          </div>
        </div>
      </div>
    );
  }

  const initial = profile?.username?.charAt(0).toUpperCase() ?? "?";
  const isOwner = profile?.isOwner;

  return (
    <div className="prof-page adm-page">
      <SEO
  title={`${profile.username} — AfroCiné Profile`}
  description={profile.bio || `${profile.username}'s film contributions on AfroCiné`}
  url={`/profile/${profile.username}`}
  noindex={!profile.is_public}  // private profiles should not be indexed
/>
      <ProfileNav navigate={navigate} />

      <div className="adm-body prof-body">
        <div className="prof-hero-card fade-up">
          <div className="prof-hero-main">
            <Avatar
              src={profile.profile_pic}
              sx={{ width: 96, height: 96, fontSize: 36, fontFamily: "var(--font-display)", background: "var(--raised)", border: "1px solid var(--border)" }}
            >
              {!profile.profile_pic && initial}
            </Avatar>

            <div className="prof-header-info">
              <Typography className="prof-username">{profile.username}</Typography>
              {profile.bio && <Typography className="prof-bio">{profile.bio}</Typography>}
              {!profile.is_public && (
                <Chip
                  icon={<Lock sx={{ fontSize: 14 }} />}
                  label="Private"
                  size="small"
                  sx={{
                    background: "rgba(255,107,107,0.1)", color: "#ff6b6b",
                    border: "1px solid rgba(255,107,107,0.25)", mt: 1,
                    fontFamily: "var(--font-body)", fontSize: 12,
                  }}
                />
              )}
            </div>
          </div>

          {isOwner && (
            <Button className="prof-edit-btn" onClick={() => navigate("/settings")}>
              Edit profile
            </Button>
          )}
        </div>

        {profile.locked ? (
          <div className="prof-locked-card fade-up">
            <Lock sx={{ fontSize: 32, color: "var(--muted)", mb: 1 }} />
            <Typography className="prof-locked-title">This profile is private</Typography>
            <Typography className="prof-locked-sub">
              Only {profile.username} can see their submissions and stats.
            </Typography>
          </div>
        ) : (
          <>
            <div className="prof-stats-row fade-up">
              <div className="prof-stat-card">
                <Typography className="prof-stat-num">{profile.stats?.totalSubmissions ?? 0}</Typography>
                <Typography className="prof-stat-label">Submissions</Typography>
              </div>
              <div className="prof-stat-card">
                <Typography className="prof-stat-num">{profile.stats?.totalApproved ?? 0}</Typography>
                <Typography className="prof-stat-label">Approved Films</Typography>
              </div>
            </div>

            <div className="prof-section-card fade-up">
              <Typography className="prof-section-title">
                <Star sx={{ fontSize: 18 }} /> APPROVED FILMS
              </Typography>
              {profile.approvedFilms?.length > 0 ? (
                <div className="prof-film-grid">
                  {profile.approvedFilms.map(f => (
                    <div key={f.id} className="prof-film-card">
                      {f.poster_path ? (
                        <img
                          className="prof-film-poster"
                          src={`https://image.tmdb.org/t/p/w342${f.poster_path}`}
                          alt={f.title}
                        />
                      ) : (
                        <div className="prof-film-poster-fallback">
                          <Movie sx={{ fontSize: 24, opacity: 0.3 }} />
                        </div>
                      )}
                      <div className="prof-film-title">{f.title}</div>
                      {f.release_year && <div className="prof-film-year">{f.release_year}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <Typography className="prof-empty-text">No approved films yet.</Typography>
              )}
            </div>

            <div className="prof-section-card fade-up">
              <Typography className="prof-section-title">
                <Movie sx={{ fontSize: 18 }} /> RECENT SUBMISSIONS
              </Typography>
              {profile.submissions?.length > 0 ? (
                <div className="prof-submission-list">
                  {profile.submissions.map(s => (
                    <div key={s.id} className="prof-submission-row">
                      {s.poster_url ? (
                        <img className="prof-submission-poster" src={s.poster_url} alt={s.title} />
                      ) : (
                        <div className="prof-submission-poster-fallback">
                          <Movie sx={{ fontSize: 18, opacity: 0.3 }} />
                        </div>
                      )}
                      <div className="prof-submission-info">
                        <div className="prof-submission-title">{s.title}</div>
                        <Chip
                          label={s.status}
                          size="small"
                          className={`prof-status-chip prof-status-${s.status}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Typography className="prof-empty-text">No submissions yet.</Typography>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ProfileNav({ navigate }) {
  return (
    <nav className="adm-nav prof-nav">
      <Box className="af-logo prof-logo" onClick={() => navigate("/")}
        role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && navigate("/")}>
       <img
    src="/images/logo.png"
    alt="AfroCiné"
    className="af-logo-img"
  />
  <span className="af-logo-text-afro">AFRO</span>
  <span className="af-logo-text-cine">CINÉ</span>
      </Box>
      <Button
        className="adm-back-btn prof-back-btn"
        startIcon={<ArrowBack sx={{ fontSize: 15 }} />}
        onClick={() => navigate("/")}
      >
        Back to home
      </Button>
    </nav>
  );
}

export default ProfilePage;