import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getToken } from "../api";
import {
  Box, Button, Stack, Typography, TextField,
  CircularProgress, Avatar, Tabs, Tab,
} from "@mui/material";
import {
  Movie, ArrowBack, CheckCircle, Cancel, Delete,
  People, Public, Pending, Done, Close,
  Edit, Visibility,
} from "@mui/icons-material";
import "./AdminDashboard.css";

function useFonts() {
  useEffect(() => {
    const id = "gfonts-cinemalist";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id; link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap";
    document.head.appendChild(link);
  }, []);
}



function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const COUNTRY_NAMES = {
  NG: "Nigeria", CM: "Cameroon", ZA: "South Africa",
  GH: "Ghana", EG: "Egypt", KE: "Kenya", MA: "Morocco",
  TN: "Tunisia", SN: "Senegal", CI: "Ivory Coast",
};

// ── SUBMISSION CARD ───────────────────────────────────────
function SubmissionCard({ sub, onApprove, onReject, onDelete, processing }) {
  const [notes,      setNotes]      = useState("");
  const [showNotes,  setShowNotes]  = useState(false);
  const [action,     setAction]     = useState(null); // 'approve' | 'reject'

  function handleAction(type) {
    setAction(type);
    setShowNotes(true);
  }

  function handleConfirm() {
    if (action === "approve") onApprove(sub.id, notes);
    else onReject(sub.id, notes);
    setShowNotes(false);
    setNotes("");
    setAction(null);
  }

  return (
    <div className="adm-sub-card fade-up">
      <div className="adm-sub-header">
        {sub.poster_url ? (
          <img src={sub.poster_url} alt={sub.title} className="adm-sub-poster" />
        ) : (
          <div className="adm-sub-poster">
            <Movie sx={{ fontSize: 20, color: "var(--muted)" }} />
          </div>
        )}
        <div className="adm-sub-info">
          <div className="adm-sub-title">{sub.title}</div>
          <div className="adm-sub-meta">
            <span>{COUNTRY_NAMES[sub.origin_country] || sub.origin_country}</span>
            {sub.release_year && <> · <span>{sub.release_year}</span></>}
            {sub.director && <> · Dir. <span>{sub.director}</span></>}
            {sub.runtime && <> · <span>{sub.runtime} min</span></>}
            {sub.original_language && <> · <span>{sub.original_language.toUpperCase()}</span></>}
          </div>
          {sub.genres?.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              {sub.genres.map(g => (
                <span key={g} style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 20,
                  background: "var(--raised)", color: "var(--muted)",
                  border: "1px solid var(--border)"
                }}>{g}</span>
              ))}
            </div>
          )}
          <div style={{ marginTop: 6, fontSize: 11, color: "var(--muted)" }}>
            Submitted {timeAgo(sub.created_at)}
          </div>
        </div>
        <span className={`adm-status-badge badge-${sub.status}`}>{sub.status}</span>
      </div>

      {/* Submitter info */}
      <div className="adm-submitter">
        <Avatar
          src={sub.submitter_pic}
          sx={{ width: 28, height: 28, fontSize: 12, background: "var(--card)", fontFamily: "var(--font-display)" }}
        >
          {!sub.submitter_pic && sub.submitter_username?.charAt(0).toUpperCase()}
        </Avatar>
        <span>Submitted by</span>
        <span className="adm-submitter-name">@{sub.submitter_username}</span>
        <span className="adm-submitter-count">· {sub.submitter_movie_count} movies in list</span>
      </div>

      {/* Synopsis */}
      {sub.synopsis && (
        <div className="adm-synopsis">{sub.synopsis}</div>
      )}

      {/* Streaming links */}
      {sub.streaming_links?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {sub.streaming_links.map((l, i) => (
            <a key={i} href={l.url} target="_blank" rel="noreferrer"
              style={{ fontSize: 12, color: "var(--accent2)", marginRight: 12, textDecoration: "none" }}>
              {l.platform} ↗
            </a>
          ))}
        </div>
      )}

      {/* Trailer */}
      {sub.trailer_url && (
        <div style={{ marginBottom: 12 }}>
          <a href={sub.trailer_url} target="_blank" rel="noreferrer"
            style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>
            🎬 Watch Trailer ↗
          </a>
        </div>
      )}

      {/* Actions — only for pending */}
      {sub.status === "pending" && (
        <>
          <div className="adm-sub-actions">
            <Button
              className="adm-approve-btn"
              startIcon={<CheckCircle sx={{ fontSize: 16 }} />}
              onClick={() => handleAction("approve")}
              disabled={!!processing}
            >
              Approve
            </Button>
            <Button
              className="adm-reject-btn"
              startIcon={<Cancel sx={{ fontSize: 16 }} />}
              onClick={() => handleAction("reject")}
              disabled={!!processing}
            >
              Reject
            </Button>
            <Button
              className="adm-delete-btn"
              startIcon={<Delete sx={{ fontSize: 14 }} />}
              onClick={() => onDelete(sub.id)}
              disabled={!!processing}
            >
              Delete
            </Button>
          </div>

          {showNotes && (
            <div className="adm-notes-wrap">
              <TextField
                className="adm-notes-field"
                label={`Notes for ${action === "approve" ? "approval" : "rejection"} (optional)`}
                fullWidth multiline rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={action === "reject" ? "Explain why this was rejected…" : "Any notes for the submitter…"}
                sx={{ mb: 1.5 }}
              />
              <Stack direction="row" spacing={1}>
                <Button
                  onClick={handleConfirm}
                  disabled={!!processing}
                  sx={{
                    background: action === "approve" ? "var(--accent2)" : "#ff6b6b",
                    color: "var(--ink)", borderRadius: "10px",
                    textTransform: "none", fontFamily: "var(--font-body)",
                    fontWeight: 700, fontSize: 13, padding: "6px 18px",
                    "&:hover": { opacity: 0.85 },
                  }}
                >
                  {processing === sub.id
                    ? <CircularProgress size={14} sx={{ color: "var(--ink)" }} />
                    : `Confirm ${action}`
                  }
                </Button>
                <Button
                  onClick={() => { setShowNotes(false); setNotes(""); setAction(null); }}
                  sx={{
                    background: "var(--raised)", color: "var(--muted)",
                    borderRadius: "10px", textTransform: "none",
                    fontFamily: "var(--font-body)", fontSize: 13,
                    border: "1px solid var(--border)", padding: "6px 14px",
                  }}
                >
                  Cancel
                </Button>
              </Stack>
            </div>
          )}
        </>
      )}

      {/* Show admin notes on reviewed submissions */}
      {sub.status !== "pending" && sub.admin_notes && (
        <div style={{
          fontSize: 12, color: "var(--muted)", padding: "8px 12px",
          background: "var(--raised)", borderRadius: 8, marginTop: 8, fontStyle: "italic"
        }}>
          Admin note: {sub.admin_notes}
        </div>
      )}
    </div>
  );
}

// ── MAIN DASHBOARD ────────────────────────────────────────
function AdminDashboard() {
  useFonts();
  const navigate = useNavigate();

  const [authorized,   setAuthorized]   = useState(null);
  const [stats,        setStats]        = useState(null);
  const [counts,       setCounts]       = useState({ pending: 0, approved: 0, rejected: 0 });
  const [submissions,  setSubmissions]  = useState([]);
  const [movies,       setMovies]       = useState([]);
  const [activeTab,    setActiveTab]    = useState(0);
  const [subFilter,    setSubFilter]    = useState("pending");
  const [loading,      setLoading]      = useState(true);
  const [processing,   setProcessing]   = useState(null);
  const [page,         setPage]         = useState(0);
  const [total,        setTotal]        = useState(0);

  const token = getToken();

  // Auth + admin check
  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }
      if (!payload.role || !["admin", "superadmin"].includes(payload.role)) {
        setAuthorized(false);
        return;
      }
      setAuthorized(true);
      loadStats();
      loadCounts();
    } catch { navigate("/login"); }
  }, []);

  useEffect(() => {
    if (authorized) {
      if (activeTab === 0) loadSubmissions(subFilter, 0);
      if (activeTab === 1) loadMovies(0);
    }
  }, [authorized, activeTab, subFilter]);

  async function loadStats() {
    try {
      const res = await apiFetch("/admin/stats");
      const data = await res?.json();
      if (data) setStats(data);
    } catch {}
  }

  async function loadCounts() {
    try {
      const res = await apiFetch("/admin/submissions/counts");
      const data = await res?.json();
      if (data) setCounts(data);
    } catch {}
  }

  async function loadSubmissions(status, pageNum) {
    setLoading(true);
    try {
      const res = await apiFetch(`/admin/submissions?status=${status}&page=${pageNum}`);
      const data = await res?.json();
      setSubmissions(data?.submissions || []);
      setTotal(data?.total || 0);
      setPage(pageNum);
    } catch { setSubmissions([]); }
    finally { setLoading(false); }
  }

  async function loadMovies(pageNum) {
    setLoading(true);
    try {
      const res = await apiFetch(`/admin/african-movies?page=${pageNum}`);
      const data = await res?.json();
      setMovies(data?.movies || []);
      setTotal(data?.total || 0);
      setPage(pageNum);
    } catch { setMovies([]); }
    finally { setLoading(false); }
  }

  async function handleApprove(id, notes) {
    setProcessing(id);
    try {
      const res = await apiFetch(`/admin/submissions/${id}/approve`, {
        method: "PUT",
        body: JSON.stringify({ admin_notes: notes }),
      });
      if (res?.ok) {
        setSubmissions(p => p.filter(s => s.id !== id));
        setCounts(p => ({ ...p, pending: p.pending - 1, approved: p.approved + 1 }));
        loadStats();
      }
    } catch {} finally { setProcessing(null); }
  }

  async function handleReject(id, notes) {
    setProcessing(id);
    try {
      const res = await apiFetch(`/admin/submissions/${id}/reject`, {
        method: "PUT",
        body: JSON.stringify({ admin_notes: notes }),
      });
      if (res?.ok) {
        setSubmissions(p => p.filter(s => s.id !== id));
        setCounts(p => ({ ...p, pending: p.pending - 1, rejected: p.rejected + 1 }));
      }
    } catch {} finally { setProcessing(null); }
  }

  async function handleDeleteSubmission(id) {
    if (!window.confirm("Delete this submission permanently?")) return;
    try {
      await apiFetch(`/admin/submissions/${id}`, { method: "DELETE" });
      setSubmissions(p => p.filter(s => s.id !== id));
      setTotal(t => t - 1);
    } catch {}
  }

  async function handleDeleteMovie(id) {
    if (!window.confirm("Remove this movie from the African Cinema database?")) return;
    try {
      await apiFetch(`/admin/african-movies/${id}`, { method: "DELETE" });
      setMovies(p => p.filter(m => m.id !== id));
      setTotal(t => t - 1);
      loadStats();
    } catch {}
  }

  // Forbidden
  if (authorized === false) return (
    <>
      
      <div className="adm-page">
        <div className="adm-forbidden">
          <Cancel sx={{ fontSize: 64, color: "#ff6b6b", opacity: 0.5 }} />
          <Typography sx={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, color: "#f0f0f5" }}>
            ACCESS DENIED
          </Typography>
          <Typography sx={{ fontSize: 14, color: "var(--muted)" }}>
            You don't have permission to view this page.
          </Typography>
          <Button
            onClick={() => navigate("/")}
            sx={{ background: "var(--raised)", color: "#e0e0e8", borderRadius: "10px", textTransform: "none", fontFamily: "var(--font-body)", border: "1px solid var(--border)", mt: 2, px: 3 }}
          >
            Go home
          </Button>
        </div>
      </div>
    </>
  );

  if (authorized === null) return (
    <>
     
      <div className="adm-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <CircularProgress sx={{ color: "var(--accent)" }} />
      </div>
    </>
  );

  const totalPages = Math.ceil(total / 20);

  return (
    <>
      
      <div className="adm-page">

        {/* NAV */}
        <nav className="adm-nav">
          <div className="adm-logo" onClick={() => navigate("/")}>
            <div className="adm-logo-icon"><Public sx={{ fontSize: 18 }} /></div>
            AFRICAN CINEMA
          </div>
          <span className="adm-badge">ADMIN DASHBOARD</span>
          <Button
            className="adm-back-btn"
            startIcon={<ArrowBack sx={{ fontSize: 15 }} />}
            onClick={() => navigate("/")}
          >
            Back to Home
          </Button>
        </nav>

        <div className="adm-body">

          {/* Stats */}
          {stats && (
            <div className="adm-stats fade-up">
              <div className="adm-stat-card">
                <div className="adm-stat-icon" style={{ background: "rgba(93,232,197,0.1)" }}>
                  <Public sx={{ fontSize: 20, color: "var(--accent2)" }} />
                </div>
                <div className="adm-stat-num">{stats.totalMovies}</div>
                <div className="adm-stat-label">African Movies</div>
              </div>
              <div className="adm-stat-card">
                <div className="adm-stat-icon" style={{ background: "rgba(232,197,71,0.1)" }}>
                  <Pending sx={{ fontSize: 20, color: "var(--accent)" }} />
                </div>
                <div className="adm-stat-num" style={{ color: counts.pending > 0 ? "var(--accent)" : "#f0f0f5" }}>
                  {counts.pending}
                </div>
                <div className="adm-stat-label">Pending Review</div>
              </div>
              <div className="adm-stat-card">
                <div className="adm-stat-icon" style={{ background: "rgba(93,232,197,0.1)" }}>
                  <Done sx={{ fontSize: 20, color: "var(--accent2)" }} />
                </div>
                <div className="adm-stat-num">{stats.communityMovies}</div>
                <div className="adm-stat-label">Community Films</div>
              </div>
              <div className="adm-stat-card">
                <div className="adm-stat-icon" style={{ background: "rgba(255,107,107,0.1)" }}>
                  <Cancel sx={{ fontSize: 20, color: "#ff6b6b" }} />
                </div>
                <div className="adm-stat-num">{counts.rejected}</div>
                <div className="adm-stat-label">Rejected</div>
              </div>
              <div className="adm-stat-card">
                <div className="adm-stat-icon" style={{ background: "rgba(232,197,71,0.1)" }}>
                  <People sx={{ fontSize: 20, color: "var(--accent)" }} />
                </div>
                <div className="adm-stat-num">{stats.totalUsers}</div>
                <div className="adm-stat-label">Total Users</div>
              </div>
              <div className="adm-stat-card">
                <div className="adm-stat-icon" style={{ background: "rgba(93,232,197,0.1)" }}>
                  <Movie sx={{ fontSize: 20, color: "var(--accent2)" }} />
                </div>
                <div className="adm-stat-num">{stats.totalSubmissions}</div>
                <div className="adm-stat-label">All Submissions</div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="adm-tabs-wrap fade-up">
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{
                "& .MuiTab-root": {
                  color: "var(--muted)", fontFamily: "var(--font-body)",
                  fontSize: 13, textTransform: "none", fontWeight: 500,
                },
                "& .Mui-selected": { color: "var(--accent) !important" },
                "& .MuiTabs-indicator": { background: "var(--accent)" },
              }}
            >
              <Tab label={`Submissions ${counts.pending > 0 ? `(${counts.pending} pending)` : ""}`} />
              <Tab label="African Movies Database" />
            </Tabs>
          </div>

          {/* ── SUBMISSIONS TAB ── */}
          {activeTab === 0 && (
            <>
              {/* Status filter */}
              <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                {["pending", "approved", "rejected"].map(s => (
                  <button
                    key={s}
                    onClick={() => { setSubFilter(s); loadSubmissions(s, 0); }}
                    style={{
                      background: subFilter === s ? "rgba(232,197,71,0.12)" : "var(--card)",
                      border: `1px solid ${subFilter === s ? "rgba(232,197,71,0.3)" : "var(--border)"}`,
                      color: subFilter === s ? "var(--accent)" : "var(--muted)",
                      borderRadius: "10px", padding: "6px 16px",
                      fontFamily: "var(--font-body)", fontSize: 13, cursor: "pointer",
                      transition: "all 0.2s", textTransform: "capitalize",
                      display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    {s} <span style={{
                      background: "var(--raised)", borderRadius: "20px",
                      padding: "1px 8px", fontSize: 11,
                    }}>{counts[s]}</span>
                  </button>
                ))}
              </div>

              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                  <CircularProgress sx={{ color: "var(--accent)" }} />
                </Box>
              ) : submissions.length === 0 ? (
                <div className="adm-empty">
                  <Typography sx={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 2, color: "var(--muted)" }}>
                    NO {subFilter.toUpperCase()} SUBMISSIONS
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: "var(--muted)", mt: 1 }}>
                    {subFilter === "pending" ? "You're all caught up!" : `No ${subFilter} submissions yet`}
                  </Typography>
                </div>
              ) : (
                <>
                  {submissions.map(sub => (
                    <SubmissionCard
                      key={sub.id}
                      sub={sub}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onDelete={handleDeleteSubmission}
                      processing={processing}
                    />
                  ))}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="adm-pagination">
                      <Button className="adm-page-btn" disabled={page === 0}
                        onClick={() => loadSubmissions(subFilter, page - 1)}>← Prev</Button>
                      <Button className={`adm-page-btn active`}>
                        {page + 1} / {totalPages}
                      </Button>
                      <Button className="adm-page-btn" disabled={page >= totalPages - 1}
                        onClick={() => loadSubmissions(subFilter, page + 1)}>Next →</Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── MOVIES DATABASE TAB ── */}
          {activeTab === 1 && (
            <>
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                  <CircularProgress sx={{ color: "var(--accent)" }} />
                </Box>
              ) : movies.length === 0 ? (
                <div className="adm-empty">
                  <Typography sx={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 2, color: "var(--muted)" }}>
                    NO MOVIES YET
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: "var(--muted)", mt: 1 }}>
                    Approve submissions to add movies here
                  </Typography>
                </div>
              ) : (
                <>
                  <Typography sx={{ fontSize: 13, color: "var(--muted)", mb: 2, fontFamily: "var(--font-body)" }}>
                    {total} movies in database
                  </Typography>
                  {movies.map(m => (
                    <div key={m.id} className="adm-movie-row fade-up">
                      {m.poster_path ? (
                        <img src={`https://image.tmdb.org/t/p/w92${m.poster_path}`}
                          style={{ width: 36, height: 52, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
                          alt={m.title} />
                      ) : (
                        <div style={{ width: 36, height: 52, background: "var(--raised)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Movie sx={{ fontSize: 16, color: "var(--muted)" }} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#f0f0f5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                          {COUNTRY_NAMES[m.origin_country] || m.origin_country} · {m.release_year}
                          {m.tmdb_rating && ` · ⭐ ${m.tmdb_rating}`}
                        </div>
                      </div>
                      <span className={`adm-status-badge badge-${m.source === "community" ? "approved" : "pending"}`}>
                        {m.source}
                      </span>
                      <Button
                        onClick={() => handleDeleteMovie(m.id)}
                        sx={{
                          background: "none", color: "var(--muted)", minWidth: "unset",
                          borderRadius: "8px", padding: "6px",
                          "&:hover": { color: "#ff6b6b", background: "rgba(255,107,107,0.08)" },
                        }}
                      >
                        <Delete sx={{ fontSize: 18 }} />
                      </Button>
                    </div>
                  ))}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="adm-pagination">
                      <Button className="adm-page-btn" disabled={page === 0}
                        onClick={() => loadMovies(page - 1)}>← Prev</Button>
                      <Button className="adm-page-btn active">
                        {page + 1} / {totalPages}
                      </Button>
                      <Button className="adm-page-btn" disabled={page >= totalPages - 1}
                        onClick={() => loadMovies(page + 1)}>Next →</Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

        </div>
      </div>
    </>
  );
}

export default AdminDashboard;