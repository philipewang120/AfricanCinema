import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./MovieDetailPage.css";
import { Typography, Button, Chip, CircularProgress } from "@mui/material";
import { ArrowBack, Star, PlayArrow, Movie } from "@mui/icons-material";

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

function MovieDetailPage() {
  useFonts();
  const { tmdbId } = useParams();
  const navigate = useNavigate();

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trailerOpen, setTrailerOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${import.meta.env.VITE_API_URL}/african/movie/${tmdbId}`)
      .then(r => r.json())
      .then(data => setMovie(data?.tmdbId === tmdbId ? data : null))
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
        <div className="md-empty">
          <Typography className="md-empty-title">MOVIE NOT FOUND</Typography>
          <Button className="md-back-cta" onClick={() => navigate("/")}>Back to home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="md-page">

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

        <Button
          className="md-back-btn"
          startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
          onClick={() => navigate(-1)}
        >
          Back
        </Button>

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
                <Movie sx={{ fontSize: 40, opacity: 0.3 }} />
              </div>
            )}
          </div>

          <div className="md-info">
            <Typography className="md-title">{movie.title}</Typography>

            <div className="md-meta-row">
              {movie.vote_average > 0 && (
                <span className="md-chip md-chip-rating">
                  <Star sx={{ fontSize: 14 }} /> {movie.vote_average.toFixed(1)}
                </span>
              )}
              {movie.release_date && (
                <span className="md-meta-text">{movie.release_date.slice(0, 4)}</span>
              )}
              {movie.runtime > 0 && (
                <span className="md-meta-text">{movie.runtime} min</span>
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
        <div className="md-trailer-overlay" onClick={() => setTrailerOpen(false)}>
          <div className="md-trailer-modal" onClick={e => e.stopPropagation()}>
            <button className="md-trailer-close" onClick={() => setTrailerOpen(false)}>✕</button>
            <iframe
              src={`https://www.youtube.com/embed/${movie.trailerKey}?autoplay=1`}
              title="Trailer"
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              frameBorder="0"
            />
          </div>
        </div>
      )}

      {/* BODY */}
      <div className="md-body">

        <div className="md-section fade-up">
          <Typography className="md-section-title">SYNOPSIS</Typography>
          <Typography className="md-synopsis">
            {movie.synopsis || "No synopsis available."}
          </Typography>
        </div>

        {movie.director && (
          <div className="md-section fade-up">
            <Typography className="md-section-title">DIRECTOR</Typography>
            <Typography className="md-director">{movie.director}</Typography>
          </div>
        )}

        {movie.cast.length > 0 && (
          <div className="md-section fade-up">
            <Typography className="md-section-title">CAST</Typography>
            <div className="md-cast-row">
              {movie.cast.map((c, i) => (
                <div key={i} className="md-cast-card">
                  {c.profile_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w185${c.profile_path}`}
                      alt={c.name}
                      className="md-cast-photo"
                    />
                  ) : (
                    <div className="md-cast-photo-fallback">
                      <Movie sx={{ fontSize: 18, opacity: 0.3 }} />
                    </div>
                  )}
                  <div className="md-cast-name">{c.name}</div>
                  <div className="md-cast-character">{c.character}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default MovieDetailPage;