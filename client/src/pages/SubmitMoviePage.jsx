import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getToken } from "../api";
import {
  Box, Button, Stack, Typography, TextField,
  CircularProgress, MenuItem, Select, InputLabel,
  FormControl, Chip,
} from "@mui/material";
import {
  Public, ArrowBack, Add, Remove, CheckCircle,
  Warning,
} from "@mui/icons-material";
import "./SubmitMoviePage.css";
import "./AfricanPage.css";

function useFonts() {
  useEffect(() => {
    const id = "gfonts-afrocine";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id; link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap";
    document.head.appendChild(link);
  }, []);
}



const AFRICAN_COUNTRIES = [
  { code: "NG", name: "Nigeria" },
  { code: "CM", name: "Cameroon" },
  { code: "ZA", name: "South Africa" },
  { code: "GH", name: "Ghana" },
  { code: "EG", name: "Egypt" },
  { code: "KE", name: "Kenya" },
  { code: "MA", name: "Morocco" },
  { code: "TN", name: "Tunisia" },
  { code: "SN", name: "Senegal" },
  { code: "CI", name: "Ivory Coast" },
  { code: "ET", name: "Ethiopia" },
  { code: "TZ", name: "Tanzania" },
  { code: "UG", name: "Uganda" },
  { code: "AO", name: "Angola" },
  { code: "DZ", name: "Algeria" },
];

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "fr", name: "French" },
  { code: "ar", name: "Arabic" },
  { code: "sw", name: "Swahili" },
  { code: "ha", name: "Hausa" },
  { code: "af", name: "Afrikaans" },
  { code: "am", name: "Amharic" },
  { code: "pt", name: "Portuguese" },
];

const GENRES = [
  "Action", "Comedy", "Drama", "Romance", "Thriller",
  "Horror", "Documentary", "Animation", "Musical", "Historical",
];

const STREAMING_PLATFORMS = [
  "Netflix", "Amazon Prime", "ShowMax", "IrokoTV",
  "YouTube", "Apple TV", "Disney+", "Other",
];

function SubmitMoviePage() {
  useFonts();
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  const [canSubmit,    setCanSubmit]    = useState(null);
  const [movieCount,   setMovieCount]   = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [submitting,   setSubmitting]   = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [error,        setError]        = useState("");
  const [dupWarning,   setDupWarning]   = useState(null);
  const [mySubmissions,setMySubmissions]= useState([]);
  const [showHistory,  setShowHistory]  = useState(false);

  const [form, setForm] = useState({
    title:             "",
    original_title:    "",
    origin_country:    "",
    original_language: "",
    release_year:      "",
    release_date:      "",
    poster_url:        "",
    backdrop_url:      "",
    synopsis:          "",
    director:          "",
    cast_list:         [],
    genres:            [],
    runtime:           "",
    trailer_url:       "",
    streaming_links:   [],
  });

  const [castInput, setCastInput] = useState("");

  // Auth check + eligibility
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }
    } catch { navigate("/login"); return; }

    checkEligibility();
    loadMySubmissions();
  }, []);

  async function checkEligibility() {
    try {
      const res = await apiFetch("/african/can-submit");
      const data = await res?.json();
      if (data) {
        setCanSubmit(data.canSubmit);
        setMovieCount(data.movieCount);
      }
    } catch { setCanSubmit(false); }
    finally { setLoading(false); }
  }

  async function loadMySubmissions() {
    try {
      const res = await apiFetch("/african/my-submissions");
      const data = await res?.json();
      setMySubmissions(Array.isArray(data) ? data : []);
    } catch { setMySubmissions([]); }
  }

  // Duplicate check when title changes
  useEffect(() => {
    if (form.title.length < 3) { setDupWarning(null); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await apiFetch(
          `/african/check-duplicate?title=${encodeURIComponent(form.title)}&year=${form.release_year}`
        );
        const data = await res?.json();
        if (data?.found) setDupWarning(data);
        else setDupWarning(null);
      } catch { setDupWarning(null); }
    }, 600);
    return () => clearTimeout(debounceRef.current);
  }, [form.title, form.release_year]);

  function handleChange(field, value) {
    setForm(p => ({ ...p, [field]: value }));
    setError("");
  }

  function toggleGenre(genre) {
    setForm(p => ({
      ...p,
      genres: p.genres.includes(genre)
        ? p.genres.filter(g => g !== genre)
        : [...p.genres, genre],
    }));
  }

  function addCast() {
    const name = castInput.trim();
    if (!name || form.cast_list.includes(name)) return;
    setForm(p => ({ ...p, cast_list: [...p.cast_list, name] }));
    setCastInput("");
  }

  function removeCast(name) {
    setForm(p => ({ ...p, cast_list: p.cast_list.filter(c => c !== name) }));
  }

  function addStreamingLink() {
    setForm(p => ({
      ...p,
      streaming_links: [...p.streaming_links, { platform: "", url: "" }],
    }));
  }

  function updateStreamingLink(index, field, value) {
    setForm(p => {
      const links = [...p.streaming_links];
      links[index] = { ...links[index], [field]: value };
      return { ...p, streaming_links: links };
    });
  }

  function removeStreamingLink(index) {
    setForm(p => ({
      ...p,
      streaming_links: p.streaming_links.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit() {
    if (!form.title.trim())       { setError("Title is required."); return; }
    if (!form.origin_country)     { setError("Country of origin is required."); return; }
    if (!form.release_year)       { setError("Release year is required."); return; }
    if (!form.synopsis.trim())    { setError("Synopsis is required."); return; }
    if (form.synopsis.length < 50){ setError("Synopsis must be at least 50 characters."); return; }

    setSubmitting(true);
    setError("");

    try {
      const res = await apiFetch("/african/submit", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          cast_list: form.cast_list.length > 0 ? form.cast_list : null,
          genres:    form.genres.length > 0 ? form.genres : null,
          runtime:   form.runtime ? parseInt(form.runtime) : null,
          streaming_links: form.streaming_links.filter(l => l.platform && l.url),
        }),
      });

      const data = await res?.json();
      if (!res?.ok) throw new Error(data?.message ?? "Submission failed");

      setSubmitted(true);
      loadMySubmissions();

    } catch (err) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectSx = {
    background: "rgba(28,24,56,0.78)", color: "var(--text)",
    fontFamily: "var(--font-body)", fontSize: 14,
    borderRadius: "12px",
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "var(--border)", borderRadius: "12px" },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.16)" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "var(--accent2)" },
    "& .MuiSvgIcon-root": { color: "var(--muted)" },
  };

  const menuPropsSx = {
    PaperProps: {
      sx: {
        background: "linear-gradient(180deg, rgba(19,16,42,0.98), rgba(8,7,20,0.98))",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        mt: 0.75,
        boxShadow: "0 18px 50px rgba(0,0,0,0.42)",
        overflow: "hidden",
        "& .MuiMenuItem-root": {
          fontFamily: "var(--font-body)",
          fontSize: 13,
          color: "var(--text)",
          borderRadius: "10px",
          mx: 0.7,
          my: 0.35,
          px: 1.2,
          py: 0.8,
          "&:hover": { background: "rgba(123,47,255,0.12)" },
          "&.Mui-selected": { background: "rgba(0,212,170,0.12)", color: "var(--accent2)" },
        },
      },
    },
  };

  if (loading) return (
    <div className="sub-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <CircularProgress sx={{ color: "var(--accent)" }} />
    </div>
  );

  return (
    <>
      <div className="sub-page">
        <nav className="sub-nav">
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
            className="sub-back-btn"
            startIcon={<ArrowBack sx={{ fontSize: 15 }} />}
            onClick={() => navigate("/")}
          >
            Back
          </Button>
        </nav>

        <div className="sub-body">
          <div className="sub-hero-card fade-up">
            <div>
              <Typography className="sub-page-title">Submit a Film</Typography>
              <Typography className="sub-page-sub">
                Know an African film that is missing from our library? Submit it for review and help build the archive.
              </Typography>
            </div>
            <div className="sub-hero-badge">Community submissions</div>
          </div>

          {/* Eligibility banner */}
          {canSubmit !== false && (
            <div className="sub-eligible">
              <CheckCircle sx={{ fontSize: 20, flexShrink: 0 }} />
              You're signed in and can submit films for review.
            </div>
          )}

          {/* My submissions history */}
          {mySubmissions.length > 0 && (
            <div className="sub-card fade-up" style={{ marginBottom: 24 }}>
              <div
                className="sub-card-title"
                style={{ cursor: "pointer", marginBottom: showHistory ? 20 : 0 }}
                onClick={() => setShowHistory(s => !s)}
              >
                MY SUBMISSIONS ({mySubmissions.length}) {showHistory ? "▲" : "▼"}
              </div>
              {showHistory && mySubmissions.map(s => (
                <div key={s.id} className="sub-history-item">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#f0f0f5" }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      {s.origin_country} · {s.release_year} ·{" "}
                      {new Date(s.created_at).toLocaleDateString()}
                    </div>
                    {s.admin_notes && (
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, fontStyle: "italic" }}>
                        Note: {s.admin_notes}
                      </div>
                    )}
                  </div>
                  <span className={`sub-status-badge status-${s.status}`}>{s.status}</span>
                </div>
              ))}
            </div>
          )}

          {/* Success state */}
          {submitted ? (
            <div className="sub-success fade-up">
              <CheckCircle sx={{ fontSize: 56, color: "var(--accent2)", mb: 2 }} />
              <Typography sx={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 2, color: "#f0f0f5", mb: 1 }}>
                SUBMISSION RECEIVED
              </Typography>
              <Typography sx={{ fontSize: 14, color: "var(--muted)", mb: 3, maxWidth: 400, mx: "auto" }}>
                Thank you! Our team will review your submission and add it to the African Cinema section if approved.
              </Typography>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  onClick={() => { setSubmitted(false); setForm({ title: "", original_title: "", origin_country: "", original_language: "", release_year: "", release_date: "", poster_url: "", backdrop_url: "", synopsis: "", director: "", cast_list: [], genres: [], runtime: "", trailer_url: "", streaming_links: [] }); }}
                  sx={{ background: "var(--raised)", color: "#e0e0e8", borderRadius: "10px", textTransform: "none", fontFamily: "var(--font-body)", border: "1px solid var(--border)", padding: "8px 20px" }}
                >
                  Submit another
                </Button>
                <Button
                  onClick={() => navigate("/")}
                  sx={{ background: "var(--accent)", color: "var(--ink)", borderRadius: "10px", textTransform: "none", fontFamily: "var(--font-body)", fontWeight: 700, padding: "8px 20px" }}
                >
                  Back to African Cinema
                </Button>
              </Stack>
            </div>
          ) : (
            <Stack spacing={0}>

              {error && <div className="sub-error">{error}</div>}

              {/* Basic info */}
              <div className="sub-card fade-up">
                <div className="sub-card-title">BASIC INFORMATION</div>
                <Stack spacing={2.5}>

                  <TextField
                    className="sub-field" label="Movie Title *" fullWidth
                    value={form.title} onChange={e => handleChange("title", e.target.value)}
                  />

                  {/* Duplicate warning */}
                  {dupWarning && (
                    <div className="sub-dup-warning">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Warning sx={{ fontSize: 16 }} />
                        We found similar {dupWarning.source === "tmdb" ? "results on TMDB" : "entries in our database"}. Is this the same film?
                      </div>
                      {dupWarning.source === "tmdb" && dupWarning.movies?.map(m => (
                        <div key={m.id} className="sub-dup-movie"
                          onClick={() => window.open(`https://www.themoviedb.org/movie/${m.id}`, "_blank")}>
                          {m.poster_path && (
                            <img src={`https://image.tmdb.org/t/p/w92${m.poster_path}`}
                              style={{ width: 32, height: 46, objectFit: "cover", borderRadius: 4 }} alt={m.title} />
                          )}
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{m.title}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)" }}>{m.release_date?.slice(0, 4)} · View on TMDB →</div>
                          </div>
                        </div>
                      ))}
                      {dupWarning.source === "local" && (
                        <div className="sub-dup-movie">
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{dupWarning.movie?.title}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)" }}>{dupWarning.movie?.release_year} · Already in our database</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <TextField
                    className="sub-field" label="Original Title (if different)" fullWidth
                    value={form.original_title} onChange={e => handleChange("original_title", e.target.value)}
                  />

                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                    <FormControl className="sub-field" fullWidth>
                      <InputLabel sx={{ color: "var(--muted) !important", fontFamily: "var(--font-body)" }}>Country of Origin *</InputLabel>
                      <Select
                        value={form.origin_country}
                        onChange={e => handleChange("origin_country", e.target.value)}
                        label="Country of Origin *"
                        sx={selectSx}
                        MenuProps={menuPropsSx}
                      >
                        {AFRICAN_COUNTRIES.map(c => (
                          <MenuItem key={c.code} value={c.code}>{c.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl className="sub-field" fullWidth>
                      <InputLabel sx={{ color: "var(--muted) !important", fontFamily: "var(--font-body)" }}>Language</InputLabel>
                      <Select
                        value={form.original_language}
                        onChange={e => handleChange("original_language", e.target.value)}
                        label="Language"
                        sx={selectSx}
                        MenuProps={menuPropsSx}
                      >
                        {LANGUAGES.map(l => (
                          <MenuItem key={l.code} value={l.code}>{l.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                    <TextField
                      className="sub-field" label="Release Year *" type="number" fullWidth
                      value={form.release_year}
                      onChange={e => handleChange("release_year", e.target.value)}
                      inputProps={{ min: 1900, max: new Date().getFullYear() + 1 }}
                    />
                    <TextField
                      className="sub-field" label="Release Date (optional)" type="date" fullWidth
                      value={form.release_date}
                      onChange={e => handleChange("release_date", e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>

                  <TextField
                    className="sub-field" label="Runtime (minutes)" type="number" fullWidth
                    value={form.runtime} onChange={e => handleChange("runtime", e.target.value)}
                    inputProps={{ min: 1 }}
                  />

                </Stack>
              </div>

              {/* Storyline */}
              <div className="sub-card fade-up" style={{ animationDelay: "0.05s" }}>
                <div className="sub-card-title">STORYLINE & CREDITS</div>
                <Stack spacing={2.5}>

                  <Box>
                    <TextField
                      className="sub-field" label="Synopsis *" multiline rows={5} fullWidth
                      value={form.synopsis} onChange={e => handleChange("synopsis", e.target.value)}
                      placeholder="Describe the film's story, themes and what makes it worth watching…"
                    />
                    <div style={{ textAlign: "right", fontSize: 11, color: form.synopsis.length < 50 ? "#ff6b6b" : "var(--muted)", marginTop: 4 }}>
                      {form.synopsis.length}/50 min
                    </div>
                  </Box>

                  <TextField
                    className="sub-field" label="Director" fullWidth
                    value={form.director} onChange={e => handleChange("director", e.target.value)}
                  />

                  {/* Cast */}
                  <Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <TextField
                        className="sub-field" label="Add cast member" fullWidth
                        value={castInput} onChange={e => setCastInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addCast()}
                      />
                      <Button
                        onClick={addCast}
                        sx={{ background: "var(--raised)", color: "#e0e0e8", borderRadius: "10px", border: "1px solid var(--border)", textTransform: "none", fontFamily: "var(--font-body)", flexShrink: 0, px: 2 }}
                      >
                        <Add sx={{ fontSize: 18 }} />
                      </Button>
                    </Box>
                    {form.cast_list.length > 0 && (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5 }}>
                        {form.cast_list.map(name => (
                            <Chip
    key={name}
    label={name}
    onDelete={() => removeCast(name)}
    className="sub-cast-chip"
  />
                        ))}
                      </Box>
                    )}
                  </Box>

                  {/* Genres */}
                  <Box>
                    <Typography sx={{ fontSize: 13, color: "var(--muted)", mb: 1, fontFamily: "var(--font-body)" }}>Genres</Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {GENRES.map(genre => (
                        <button
                          key={genre}
                          onClick={() => toggleGenre(genre)}
                          className={`sub-genre-btn${form.genres.includes(genre) ? " active" : ""}`}
                        >
                          {genre}
                        </button>
                      ))}
                    </Box>
                  </Box>

                </Stack>
              </div>

              {/* Media */}
              <div className="sub-card fade-up" style={{ animationDelay: "0.1s" }}>
                <div className="sub-card-title">MEDIA & LINKS</div>
                <Stack spacing={2.5}>

                  <Box>
                    <TextField
                      className="sub-field" label="Poster Image URL" fullWidth
                      value={form.poster_url} onChange={e => handleChange("poster_url", e.target.value)}
                      placeholder="https://..."
                    />
                    {form.poster_url && (
                      <img
                        src={form.poster_url} alt="Poster preview"
                        className="sub-poster-preview"
                        onError={e => e.target.style.display = "none"}
                      />
                    )}
                  </Box>

                  <TextField
                    className="sub-field" label="Backdrop Image URL (optional)" fullWidth
                    value={form.backdrop_url} onChange={e => handleChange("backdrop_url", e.target.value)}
                    placeholder="https://..."
                  />

                  <TextField
                    className="sub-field" label="Trailer URL (YouTube, Vimeo…)" fullWidth
                    value={form.trailer_url} onChange={e => handleChange("trailer_url", e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                  />

                  {/* Streaming links */}
                  <Box>
                    <Typography sx={{ fontSize: 13, color: "var(--muted)", mb: 1.5, fontFamily: "var(--font-body)" }}>
                      Streaming / Watch Links
                    </Typography>
                    {form.streaming_links.map((link, i) => (
                      <div key={i} className="sub-streaming-row">
                        <FormControl className="sub-field" sx={{ minWidth: 140, flexShrink: 0 }}>
                          <Select
                            value={link.platform}
                            onChange={e => updateStreamingLink(i, "platform", e.target.value)}
                            displayEmpty
                            sx={{ ...selectSx, height: 44 }}
                            MenuProps={menuPropsSx}
                          >
                            <MenuItem value="" disabled sx={{ color: "var(--muted) !important" }}>Platform</MenuItem>
                            {STREAMING_PLATFORMS.map(p => (
                              <MenuItem key={p} value={p}>{p}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <TextField
                          className="sub-field" placeholder="URL" fullWidth
                          value={link.url} onChange={e => updateStreamingLink(i, "url", e.target.value)}
                          size="small"
                        />
                        <Button className="sub-remove-btn" onClick={() => removeStreamingLink(i)}>
                          <Remove sx={{ fontSize: 18 }} />
                        </Button>
                      </div>
                    ))}
                    <Button className="sub-add-link-btn" onClick={addStreamingLink} startIcon={<Add sx={{ fontSize: 16 }} />}>
                      Add streaming link
                    </Button>
                  </Box>

                </Stack>
              </div>

              {/* Submit */}
              <Button
                className="sub-submit-btn fade-up"
                onClick={handleSubmit}
                disabled={submitting || canSubmit === false}
                startIcon={submitting ? <CircularProgress size={16} sx={{ color: "var(--ink)" }} /> : null}
                style={{ animationDelay: "0.15s" }}
              >
                {submitting ? "Submitting…" : "Submit for Review"}
              </Button>

            </Stack>
          )}
        </div>
      </div>
    </>
  );
}

export default SubmitMoviePage;