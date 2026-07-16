import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./MovieDetailPage.css";
import "./AfricanPage.css";
import { Typography, Button, Chip, CircularProgress, Box, } from "@mui/material";
import { ArrowBack, Star, Public, PlayArrow, Movie as MovieIcon } from "@mui/icons-material";
import SEO from "../components/SEO";
import { Helmet } from "react-helmet-async";



function resolveImageUrl(path, isFullUrl, size = "w342") {
  if (!path) return null;
  if (isFullUrl) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
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
  
  const { tmdbId } = useParams();
  const navigate = useNavigate();

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
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
            <div className="md-logo-icon"><MovieIcon sx={{ fontSize: 16 }} /></div>
            <span className="md-logo-text-afro">AFRO</span>
            <span className="md-logo-text-cine">CINÉ</span>
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
    <SEO
      title={movie.title}
      description={
       movie.synopsis
          ? movie.synopsis.slice(0, 155) + "…"
          : `Watch ${movie.title} — African cinema on AfroCiné`
      }
      image={
        movie.backdrop_path
    ? resolveImageUrl(
        movie.backdrop_path,
        movie.backdrop_is_full_url,
        "w1280"
      )
          : undefined
      }
      url={`/movie/${tmdbId}`}
      type="video.movie"
    />
    <Helmet>
      <title>{movie.title} — AfroCiné</title>
  <meta name="description" content={movie.synopsis?.slice(0, 155)} />

  {/* Open Graph — WhatsApp, Twitter, Facebook previews */}
  <meta property="og:title" content={`${movie.title} — AfroCiné`} />
  <meta property="og:description" content={movie.synopsis?.slice(0, 155)} />
  <meta property="og:image" content={
    movie.poster_is_full_url
      ? movie.poster_path
      : `https://image.tmdb.org/t/p/w500${movie.poster_path}`
  } />
  <meta property="og:url" content={`https://african-cinema.vercel.app/movie/${movie.id}`} />
  <meta property="og:type" content="video.movie" />
  <meta property="og:site_name" content="AfroCiné" />

  {/* Twitter card */}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={`${movie.title} — AfroCiné`} />
  <meta name="twitter:image" content={
    movie.poster_is_full_url
      ? movie.poster_path
      : `https://image.tmdb.org/t/p/w500${movie.poster_path}`
  } />
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Movie",
          name: movie.title,
          description: movie.synopsis,
         image: movie.poster_path
  ? resolveImageUrl(
      movie.poster_path,
      movie.poster_is_full_url,
      "w500"
    )
  : undefined,
          datePublished: movie.release_date,
          director: movie.director
            ? {
                "@type": "Person",
                name: movie.director,
              }
            : undefined,
          actor: movie.cast?.slice(0, 5).map((c) => ({
            "@type": "Person",
            name: typeof c === "string" ? c : c.name,
          })),
          genre: movie.genres,
          aggregateRating:
            movie.vote_count > 0
              ? {
                  "@type": "AggregateRating",
                  ratingValue: Number(movie.vote_average).toFixed(1),
                  ratingCount: movie.vote_count,
                  bestRating: "10",
                  worstRating: "0",
                }
              : undefined,
          url: `https://african-cinema.vercel.app/movie/${tmdbId}`,
        })}
      </script>
    </Helmet>

      {/* NAV */}
      <nav className="md-nav">
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
            style={{
              backgroundImage: `url(${resolveImageUrl(
                movie.backdrop_path,
                movie.backdrop_is_full_url,
                "original"
              )})`
            }}
          />
        ) : (
          <div className="md-hero-fallback" />
        )}

        <div className="md-hero-content">
          <div className="md-poster-wrap">
            {movie.poster_path ? (
              <img
                src={resolveImageUrl(movie.poster_path, movie.poster_is_full_url, "w342")}
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

            {(movie.trailerKey || (movie.is_community && movie.trailer_url)) && (
              <Button
                className="md-trailer-btn"
                startIcon={<PlayArrow />}
                onClick={() => {
                  if (movie.trailerKey) {
                    setTrailerOpen(true);
                  } else {
                    window.open(movie.trailer_url, "_blank");
                  }
                }}
              >
                Watch Trailer
              </Button>
            )}
            {movie.is_community && (
              <div className="md-community-badge">
                🎬 Community Submission
              </div>
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