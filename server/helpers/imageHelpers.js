

// Detect if a string is a full URL (Cloudinary, S3, etc.) or a TMDB-relative path
// server/helpers/imageHelpers.js
export function isFullUrl(str) {
    if (!str || typeof str !== "string") return false;
    return str.startsWith("http://") || str.startsWith("https://");
}

// Normalize poster: store full URLs in poster_path as-is,
// TMDB paths stay as-is. The frontend will detect which one it has.
export function normalizePosterPath(posterUrl) {
    if (!posterUrl) return null;
    if (isFullUrl(posterUrl)) return posterUrl; // store full URL directly
    return posterUrl; // TMDB-relative path, store as-is
}