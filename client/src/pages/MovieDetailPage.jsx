import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./MovieDetailPage.css";
import { Typography, Button, Chip, CircularProgress } from "@mui/material";
import { ArrowBack, Star, PlayArrow, Movie as MovieIcon } from "@mui/icons-material";

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

// Reusable trailer modal — used here and can be imported by AfricanPage for featured film
export function TrailerModal({ trailerKey, onClose }) {
  // Close on Escape key
  useEffect(() => {
    function handleKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (!trailerKey) return null;

  return (
    <div className="md-trailer-overlay" onClick={onClose}>
      <div className="md-trailer-modal" onClick={e => e.stopPropagation()}>
        <button className="md-trailer-close" onClick={onClose} aria-label="Close trailer">✕</button>
        <iframe
          src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0`}
          title="Trailer"
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
          frameBorder="0"
        />
      </div>
    </div>
  );
}

function MovieDetailPage() {
  useFonts();
  const { tmdbId } = useParams();
  const navigate = useNavigate();

  const [movie,       setMovie]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [trailerOpen, setTrailerOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setMovie(null);
    fetch(`${import.meta.env.VITE_API_URL}/african/movie/${tmdbId}`)
      .then(r => r.json())
      .then(data => setMovie(data?.id ? data : null))  // fixed: data.id not data.tmdbId
      .catch(() => setMovie(null))
      .finally(() => setLoading(false));
  }, [tmdbId]);

  if (loading) {
    return (
      <div className="md-loading-wrap">
        <CircularProgress sx={{ color: "var(--accent)" }} />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="md-page">
        <nav className="md-nav">
          <div className="md-logo" onClick={() => navigate("/")}>
            <div className="md-logo-icon"><MovieIcon sx={{ fontSize: 18 }} /></div>
            AFRICAN CINEMA
          </div>
        </nav>
        <div className="md-empty">
          <Typography className="md-empty-title">MOVIE NOT FOUND</Typography>
          <Typography className="md-empty-sub">
            This film isn't in our database yet.
          </Typography>
          <Button className="md-back-cta" onClick={() => navigate("/")}>
            Back to home
          </Button>
        </div>
      </div>
    );
  }

  const releaseYear = movie.release_date?.slice(0, 4);

  return (
    <div className="md-page">

      {/* NAV */}
      <nav className="md-nav">
        <div className="md-logo" onClick={() => navigate("/")}>
          <div className="md-logo-icon"><MovieIcon sx={{ fontSize: 18 }} /></div>
          AFRICAN CINEMA
        </div>
        <Button
          className="md-back-btn"
          startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
      </nav>

      {/* HERO */}
      <div className="md-hero">
        {movie.backdrop_path ? (
          <div
            className="md-hero-bg"
            style={{ backgroundImage: `url(https://image.tmdb.org/t/p/original${movie.backdrop_path})` }}
          />
        ) : (
          <div className="md-hero-fallback" />
        )}

        <div className="md-hero-content">
          <div className="md-poster-wrap">
            {movie.poster_path ? (
              <img
                src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
                alt={movie.title}
                className="md-poster"
              />
            ) : (
              <div className="md-poster-fallback">
                <MovieIcon sx={{ fontSize: 40, opacity: 0.3 }} />
              </div>
            )}
          </div>

          <div className="md-info">
            <Typography className="md-title">{movie.title}</Typography>

            <div className="md-meta-row">
              {movie.vote_average > 0 && (
                <span className="md-chip md-chip-rating">
                  <Star sx={{ fontSize: 14 }} />
                  {parseFloat(movie.vote_average).toFixed(1)}
                </span>
              )}
              {releaseYear && (
                <span className="md-meta-text">{releaseYear}</span>
              )}
              {movie.runtime > 0 && (
                <span className="md-meta-text">{movie.runtime} min</span>
              )}
              {movie.original_language && (
                <span className="md-meta-text md-meta-lang">
                  {movie.original_language.toUpperCase()}
                </span>
              )}
            </div>

            {movie.genres?.length > 0 && (
              <div className="md-genres">
                {movie.genres.map(g => (
                  <Chip key={g} label={g} size="small" className="md-genre-chip" />
                ))}
              </div>
            )}

            {movie.trailerKey && (
              <Button
                className="md-trailer-btn"
                startIcon={<PlayArrow />}
                onClick={() => setTrailerOpen(true)}
              >
                Watch Trailer
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* TRAILER MODAL */}
      {trailerOpen && movie.trailerKey && (
        <TrailerModal
          trailerKey={movie.trailerKey}
          onClose={() => setTrailerOpen(false)}
        />
      )}

      {/* BODY */}
      <div className="md-body">

        {movie.synopsis && (
          <div className="md-section fade-up">
            <Typography className="md-section-title">SYNOPSIS</Typography>
            <Typography className="md-synopsis">{movie.synopsis}</Typography>
          </div>
        )}

        {movie.director && (
          <div className="md-section fade-up">
            <Typography className="md-section-title">DIRECTOR</Typography>
            <Typography className="md-director">{movie.director}</Typography>
          </div>
        )}

        {movie.cast?.length > 0 && (
          <div className="md-section fade-up">
            <Typography className="md-section-title">CAST</Typography>
            <div className="md-cast-row">
              {movie.cast.map((c, i) => {
                // cast is either {name, character, profile_path} from TMDB live,
                // or {name, character: "", profile_path: null} from our DB cast_list
                const name = typeof c === "string" ? c : c.name;
                const character = typeof c === "string" ? "" : c.character;
                const profilePath = typeof c === "string" ? null : c.profile_path;

                return (
                  <div key={i} className="md-cast-card">
                    {profilePath ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w185${profilePath}`}
                        alt={name}
                        className="md-cast-photo"
                      />
                    ) : (
                      <div className="md-cast-photo-fallback">
                        <MovieIcon sx={{ fontSize: 18, opacity: 0.3 }} />
                      </div>
                    )}
                    <div className="md-cast-name">{name}</div>
                    {character && (
                      <div className="md-cast-character">{character}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default MovieDetailPage;