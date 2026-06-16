import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getToken } from "../api";
import {
  Box, Button, Stack, Typography, Avatar, Tooltip, Toolbar, CircularProgress, Menu, MenuItem, 
} from "@mui/material";
import {
  Movie, Star, TrendingUp, NewReleases, Public, Person, Settings,
  ArrowBack, Add, ChevronLeft, ChevronRight, Refresh,
  Search as SearchIcon, Close as CloseIcon, Logout,
} from "@mui/icons-material";
import "./AfricanPage.css";

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

// Country tab config
const TABS = [
  { key: "all", label: "🌍 All Africa" },
  { key: "NG",  label: "🇳🇬 Nollywood" },
  { key: "CM",  label: "🇨🇲 Cameroon"  },
  { key: "ZA",  label: "🇿🇦 South Africa" },
  { key: "GH",  label: "🇬🇭 Ghana"     },
  { key: "EG",  label: "🇪🇬 Egypt"     },
];

const PERIODS = [
  { key: "month", label: "This Month" },
  { key: "year",  label: "This Year"  },
  { key: "all",   label: "All Time"   },
];

const COUNTRY_NAMES = {
  NG: "Nigeria", CM: "Cameroon", ZA: "South Africa",
  GH: "Ghana", EG: "Egypt", MA: "Morocco", KE: "Kenya",
  TN: "Tunisia", SN: "Senegal",
};

// Toast system
let _afToastId = 0;
let _afSetToasts = null;
function afToast(msg, type = "success") {
  if (!_afSetToasts) return;
  const id = ++_afToastId;
  _afSetToasts(p => [...p, { id, msg, type }]);
  setTimeout(() => _afSetToasts(p => p.filter(t => t.id !== id)), 3000);
}
function AfToastContainer() {
  const [toasts, setToasts] = useState([]);
  _afSetToasts = setToasts;
  return (
    <div className="af-toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`af-toast af-toast-${t.type}`}>
          <div className="af-toast-dot" />{t.msg}
        </div>
      ))}
    </div>
  );
}

// Skeleton loader
function SkeletonRow({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="af-skeleton">
          <div className="af-skeleton-poster" />
          <div className="af-skeleton-info">
            <div className="af-skeleton-line" />
            <div className="af-skeleton-line short" />
          </div>
        </div>
      ))}
    </>
  );
}

// Single movie card
function AfMovieCard({ movie, rank }) {
  const year = movie.release_date?.slice(0, 4);
  const rating = movie.vote_average?.toFixed(1);
  const country = COUNTRY_NAMES[movie.origin_country?.[0]] || movie.origin_country?.[0] || "";

 return (
  <a
    className="af-movie-card"
    href={`https://www.themoviedb.org/movie/${movie.id}`}
    target="_blank"
    rel="noreferrer"
  >
      <div className="af-card-poster-wrap">
        {movie.poster_path ? (
          <img
            className="af-card-poster"
            src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
            alt={movie.title}
            loading="lazy"
          />
        ) : (
          <div className="af-card-poster-fallback">
            <Movie sx={{ fontSize: 28, opacity: 0.3 }} />
          </div>
        )}
        {rank && <div className="af-card-rank">{rank}</div>}
      </div>
      <div className="af-card-info">
        <div className="af-card-title" title={movie.title}>{movie.title}</div>
        <div className="af-card-chips">
          {rating && (
            <span className="af-chip af-chip-rating">
              <Star sx={{ fontSize: 10 }} />{rating}
            </span>
          )}
          {year && <span className="af-chip-year">{year}</span>}
        </div>
      </div>
    </a>
  );
}

// Horizontal scroll section
function ScrollSection({ title, icon, movies, loading, showRank = false, rightContent }) {
  const scrollRef = useRef(null);

  function scroll(dir) {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 360, behavior: "smooth" });
    }
  }

  return (
    <div className="af-section fade-up">
      <div className="af-section-header">
        <div className="af-section-title">
          <span className="af-section-icon">{icon}</span>
          {title}
        </div>
        {rightContent}
      </div>
      <div className="af-scroll-wrap">
        <button className="af-scroll-btn left" onClick={() => scroll(-1)}>
          <ChevronLeft sx={{ fontSize: 20 }} />
        </button>
        <div className="af-scroll-row" ref={scrollRef}>
          {loading
            ? <SkeletonRow count={6} />
            : movies.length === 0
            ? (
              <div style={{ padding: "24px", color: "var(--muted)", fontSize: 14 }}>
                No movies found for this selection
              </div>
            )
            : movies.map((m, i) => (
              <AfMovieCard
                key={m.id}
                movie={m}
                rank={showRank ? i + 1 : null}
              />
            ))
          }
        </div>
        <button className="af-scroll-btn right" onClick={() => scroll(1)}>
          <ChevronRight sx={{ fontSize: 20 }} />
        </button>
      </div>
    </div>
  );
}

// Navbar search bar — searches African movies, dropdown links out to TMDB
function AfSearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(e) {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    setOpen(true);
    setSearching(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/african/search?q=${encodeURIComponent(value)}`
        );
        const data = await res.json();
        setResults(data.movies || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }

  function clear() {
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="af-search-wrap" ref={wrapRef}>
      <SearchIcon className="af-search-icon" sx={{ fontSize: 18 }} />
      <input
        className="af-search-input"
        placeholder="Search African movies..."
        value={query}
        onChange={handleChange}
        onFocus={() => query.trim() && setOpen(true)}
      />
      {query && (
        <button className="af-search-clear" onClick={clear} aria-label="Clear search">
          <CloseIcon sx={{ fontSize: 16 }} />
        </button>
      )}

      {open && (
        <div className="af-search-results">
          {searching ? (
            <div className="af-search-loading">
              <CircularProgress size={20} />
            </div>
          ) : results.length === 0 ? (
            <div className="af-search-empty">No movies found</div>
          ) : (
           results.map((m) => (
  <a
    key={m.id}
    className="af-search-result"
    href={`https://www.themoviedb.org/movie/${m.id}`}
    target="_blank"
    rel="noreferrer"
    onClick={clear}
  >
                {m.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w92${m.poster_path}`}
                    alt={m.title}
                  />
                ) : (
                  <div className="af-search-result-fallback">
                    <Movie sx={{ fontSize: 16, opacity: 0.4 }} />
                  </div>
                )}
                <div className="af-search-result-info">
                  <div className="af-search-result-title">{m.title}</div>
                  <div className="af-search-result-year">
                    {m.release_date?.slice(0, 4) || ""}
                  </div>
                </div>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────
function AfricanPage() {
  useFonts();
  const navigate = useNavigate();

  const [activeTab,    setActiveTab]    = useState("all");
  const [period,       setPeriod]       = useState("year");
  const [featured,     setFeatured]     = useState(null);
  const [topRated,     setTopRated]     = useState([]);
  const [latest,       setLatest]       = useState([]);
  const [loadingTop,   setLoadingTop]   = useState(true);
  const [loadingLatest,setLoadingLatest]= useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [latestPage,   setLatestPage]   = useState(1);
  const [hasMoreLatest,setHasMoreLatest]= useState(true);
//auth role
  const [role, setRole] = useState(null);

  // Logged-in user info for navbar
  const [currentUser, setCurrentUser] = useState(null);
  const [email,       setEmail]       = useState("");
  const [username, setUsername]= useState("")
  const [profilePic,  setProfilePic]  = useState("");
  const [initial,     setInitial]     = useState("U");
  const [menuAnchor, setMenuAnchor] = useState(null);
  const menuOpen = Boolean(menuAnchor);


  const [isLoggedIn, setIsLoggedIn] = useState(false);

useEffect(() => {
  // Handle OAuth redirect — token arrives via URL query param
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get("token");
  if (urlToken) {
    localStorage.setItem("token", urlToken);
    // Clean the URL so the token isn't sitting in browser history/address bar
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  const token = localStorage.getItem("token");
  if (!token) {
    setIsLoggedIn(false);
    return;
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem("token");
      setIsLoggedIn(false);
      return;
    }

    setIsLoggedIn(true);
    setRole(payload.role ?? null);   

  } catch {
    setIsLoggedIn(false);
    return;
  }
  
  // Load current user for navbar
  (async () => {
    try {
      const res = await apiFetch("/me");
      if (!res.ok) throw new Error();
      const d = await res.json();
      setCurrentUser(d);
      setProfilePic(d?.profile_pic ?? "");
      const displayName = d?.username || (d?.email ? d.email.split("@")[0] : "user");
      setEmail(displayName);
      setInitial(displayName.charAt(0).toUpperCase());
    } catch {
      setEmail("user");
      setInitial("U");
    }
  })();
}, []);

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  function handleMenuOpen(e) {
  setMenuAnchor(e.currentTarget);
}
  function handleMenuClose() {
  setMenuAnchor(null);
}

  // Load featured once
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/african/featured`)
      .then(r => r.json())
      .then(data => setFeatured(data))
      .catch(() => setFeatured(null));
  }, []);

  // Load top rated when tab or period changes
  useEffect(() => {
    loadTopRated();
  }, [activeTab, period]);

  // Load latest when tab changes
  useEffect(() => {
    setLatestPage(1);
    setHasMoreLatest(true);
    loadLatest(1, false);
  }, [activeTab]);

  async function loadTopRated() {
    setLoadingTop(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/african/top-rated?country=${activeTab}&period=${period}`
      );
      const data = await res.json();
      setTopRated(data.movies || []);
    } catch { setTopRated([]); }
    finally { setLoadingTop(false); }
  }

  async function loadLatest(page = 1, append = false) {
    if (page === 1) setLoadingLatest(true);
    else setLoadingMore(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/african/latest?country=${activeTab}&page=${page}`
      );
      const data = await res.json();
      const movies = data.movies || [];
      if (append) {
        setLatest(prev => [...prev, ...movies]);
      } else {
        setLatest(movies);
      }
      setHasMoreLatest(page < (data.total_pages || 1));
    } catch {
      if (!append) setLatest([]);
    }
    finally {
      setLoadingLatest(false);
      setLoadingMore(false);
    }
  }

  function handleLoadMore() {
    const next = latestPage + 1;
    setLatestPage(next);
    loadLatest(next, true);
  }

  const featuredCountry = featured?.origin_country?.[0];

  return (
    <>
      <AfToastContainer />

      <div className="af-page">

        {/* ── NAV ── */}
<nav className="af-nav">
  <Toolbar
    sx={{
      px: { xs: 2, md: 4 },
      minHeight: "68px !important",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 2,
    }}
  >
    {/* LEFT — Logo */}
    <Box
      className="af-logo"
      onClick={() => navigate("/")}
      sx={{ flexShrink: 0, cursor: "pointer" }}
    >
      <div className="af-logo-icon">
        <Public sx={{ fontSize: 18 }} />
      </div>
      AFRICAN CINEMA
    </Box>

    {/* CENTER — Search + Submit */}
    <Box
      sx={{
        flex: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 2,
        px: 4,
      }}
    >
      <AfSearchBar />

      <Button
        onClick={() => navigate("/submit")}
        sx={{
          background: "rgba(93,232,197,0.08)",
          border: "1px solid rgba(93,232,197,0.2)",
          borderRadius: "10px",
          color: "var(--accent2)",
          fontFamily: "var(--font-body)",
          fontWeight: 600,
          fontSize: 12,
          textTransform: "none",
          padding: "5px 14px",
          whiteSpace: "nowrap",
          transition: "all 0.2s",
          "&:hover": {
            background: "rgba(93,232,197,0.15)",
            borderColor: "rgba(93,232,197,0.4)",
          },
        }}
      >
        + Submit a Film
      </Button>
    </Box>

    {/* RIGHT — auth-aware */}
<Box
  className="af-nav-actions"
  sx={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}
>

  
  {isLoggedIn ? (
    <>
    {/* Admin button — only visible to admins */}
    {role === "admin" && (
      <Button
        onClick={() => navigate("/admin")}
        sx={{
          background: "rgba(255,100,100,0.08)",
          border: "1px solid rgba(255,100,100,0.2)",
          borderRadius: "10px",
          color: "#ff6b6b",
          fontFamily: "var(--font-body)",
          fontWeight: 600,
          fontSize: 12,
          textTransform: "none",
          padding: "5px 14px",
          transition: "all 0.2s",
          "&:hover": {
            background: "rgba(255,100,100,0.15)",
            borderColor: "rgba(255,100,100,0.4)",
          },
        }}
      >
        Admin
      </Button>
    )}
   <div className="af-profile-trigger" onClick={handleMenuOpen}>
  {profilePic ? (
    <Avatar src={profilePic} sx={{ width: 38, height: 38 }} />
  ) : (
    <div className="nav-avatar-initials">{initial}</div>
  )}
  <Typography className="af-hello-text">
    Hello, {email}!
  </Typography>
</div>

<Menu
  anchorEl={menuAnchor}
  open={menuOpen}
  onClose={handleMenuClose}
  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
  transformOrigin={{ vertical: "top", horizontal: "right" }}
  slotProps={{
    paper: {
      sx: {
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        mt: 1,
        minWidth: 180,
        boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
      },
    },
  }}
>
  <MenuItem
    onClick={() => { handleMenuClose(); navigate(`/profile/${currentUser?.username}`); }}
    sx={{
      fontFamily: "var(--font-body)", fontSize: 14, color: "#e0e0e8",
      gap: 1.2, py: 1.2, px: 2,
      "&:hover": { background: "rgba(255,255,255,0.05)" },
    }}
  >
    <Person sx={{ fontSize: 18, color: "var(--accent2)" }} /> Profile
  </MenuItem>

  <MenuItem
    onClick={() => { handleMenuClose(); navigate("/settings"); }}
    sx={{
      fontFamily: "var(--font-body)", fontSize: 14, color: "#e0e0e8",
      gap: 1.2, py: 1.2, px: 2,
      "&:hover": { background: "rgba(255,255,255,0.05)" },
    }}
  >
    <Settings sx={{ fontSize: 18, color: "var(--accent2)" }} /> Settings
  </MenuItem>
</Menu>

      <Tooltip title="Log out">
        <Button
          className="logout-btn"
          size="small"
          startIcon={<Logout sx={{ fontSize: 16 }} />}
          onClick={handleLogout}
        >
          Log out
        </Button>
      </Tooltip>
    </>
  ) : (
    <>
      <Button
        onClick={() => navigate("/login")}
        sx={{
          background: "none",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          color: "#e0e0e8",
          fontFamily: "var(--font-body)",
          fontWeight: 500,
          fontSize: 13,
          textTransform: "none",
          padding: "5px 16px",
          transition: "all 0.2s",
          "&:hover": {
            background: "rgba(255,255,255,0.05)",
            borderColor: "rgba(255,255,255,0.18)",
          },
        }}
      >
        Log in
      </Button>

      <Button
        onClick={() => navigate("/register")}
        sx={{
          background: "var(--accent)",
          borderRadius: "10px",
          color: "var(--ink)",
          fontFamily: "var(--font-body)",
          fontWeight: 700,
          fontSize: 13,
          textTransform: "none",
          padding: "5px 16px",
          transition: "all 0.2s",
          "&:hover": { background: "#f0d050" },
        }}
      >
        Register
      </Button>
    </>
  )}
</Box>
  </Toolbar>
</nav>

        {/* ── HERO ── */}
        <div className="af-hero">
          {featured?.backdrop_path ? (
            <div
              className="af-hero-bg"
              style={{ backgroundImage: `url(https://image.tmdb.org/t/p/original${featured.backdrop_path})` }}
            />
          ) : (
            <div className="af-hero-fallback">
              <Public sx={{ fontSize: 80, color: "rgba(232,197,71,0.1)" }} />
            </div>
          )}
          <div className="af-hero-content">
            <div className="af-hero-eyebrow">FEATURED FILM</div>
            {featured ? (
              <>
                <Typography className="af-hero-title">{featured.title}</Typography>
                <div className="af-hero-meta">
                  {featured.vote_average && (
                    <span className="af-hero-chip af-hero-chip-rating">
                      ⭐ {featured.vote_average?.toFixed(1)} TMDB
                    </span>
                  )}
                  {featuredCountry && (
                    <span className="af-hero-chip af-hero-chip-country">
                      {COUNTRY_NAMES[featuredCountry] || featuredCountry}
                    </span>
                  )}
                  {featured.release_date && (
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                      {featured.release_date.slice(0, 4)}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <Typography className="af-hero-title">AFRICAN CINEMA</Typography>
                <Typography sx={{ fontSize: 15, color: "rgba(255,255,255,0.5)", mb: 2 }}>
                  Discover the best of African film
                </Typography>
              </>
            )}
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="af-body">

          {/* Country tabs */}
          <div className="af-tabs fade-up">
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`af-tab${activeTab === tab.key ? " active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Top Rated */}
          <ScrollSection
            title="TOP RATED"
            icon={<TrendingUp sx={{ fontSize: 20 }} />}
            movies={topRated}
            loading={loadingTop}
            showRank={true}
            rightContent={
              <div className="af-period-toggle">
                {PERIODS.map(p => (
                  <button
                    key={p.key}
                    className={`af-period-btn${period === p.key ? " active" : ""}`}
                    onClick={() => setPeriod(p.key)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            }
          />

          {/* Latest Releases */}
          <div className="af-section fade-up">
            <div className="af-section-header">
              <div className="af-section-title">
                <NewReleases className="af-section-icon" sx={{ fontSize: 20 }} />
                LATEST RELEASES
                <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-body)", fontWeight: 400, letterSpacing: 0 }}>
                  · last 30 days
                </span>
              </div>
              <button
                onClick={() => { setLatestPage(1); loadLatest(1, false); }}
                style={{
                  background: "none", border: "none", color: "var(--muted)",
                  cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)",
                  display: "flex", alignItems: "center", gap: 4, transition: "color 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "#e0e0e8"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--muted)"}
              >
                <Refresh sx={{ fontSize: 16 }} /> Refresh
              </button>
            </div>

            {loadingLatest ? (
              <div className="af-latest-grid">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="af-skeleton">
                    <div className="af-skeleton-poster" />
                    <div className="af-skeleton-info">
                      <div className="af-skeleton-line" />
                      <div className="af-skeleton-line short" />
                    </div>
                  </div>
                ))}
              </div>
            ) : latest.length === 0 ? (
              <div className="af-empty">
                <Typography sx={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: 2, color: "var(--muted)" }}>
                  NO RECENT RELEASES FOUND
                </Typography>
                <Typography sx={{ fontSize: 13, color: "var(--muted)", mt: 1 }}>
                  Try a different country or check back soon
                </Typography>
              </div>
            ) : (
              <>
                <div className="af-latest-grid">
                  {latest.map(m => (
                    <AfMovieCard key={m.id} movie={m} />
                  ))}
                </div>

                {/* Load more */}
                {hasMoreLatest && (
                  <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                    <Button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      sx={{
                        background: "var(--card)", border: "1px solid var(--border)",
                        borderRadius: "12px", color: "#e0e0e8",
                        fontFamily: "var(--font-body)", fontSize: 14,
                        fontWeight: 500, padding: "10px 40px",
                        textTransform: "none", transition: "all 0.2s",
                        "&:hover": { background: "var(--raised)", borderColor: "rgba(255,255,255,0.18)" },
                      }}
                    >
                      {loadingMore ? "Loading…" : "Load more"}
                    </Button>
                  </Box>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </>
  );
}

export default AfricanPage;