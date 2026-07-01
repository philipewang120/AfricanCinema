import axios from "axios";

export async function enrichSubmissionViaTMDB(sub) {
    try {
        const res = await axios.get("https://api.themoviedb.org/3/search/movie", {
            params: {
                query: sub.title,
                year: sub.release_year || undefined,
                include_adult: false,
            },
            headers: {
                accept: "application/json",
                Authorization: `Bearer ${process.env.TMDB_BEARER}`,
            },
        });

        const results = res.data.results || [];
        if (results.length === 0) return null;

        // Prefer a result close to the submitted year, fallback to top result
        let match = results[0];
        if (sub.release_year) {
            const closeMatch = results.find(r => {
                const rYear = r.release_date ? parseInt(r.release_date.slice(0, 4)) : null;
                return rYear && Math.abs(rYear - sub.release_year) <= 1;
            });
            if (closeMatch) match = closeMatch;
        }

        // Get full details + credits + videos
        const detailRes = await axios.get(
            `https://api.themoviedb.org/3/movie/${match.id}`,
            {
                params: { append_to_response: "videos,credits" },
                headers: {
                    accept: "application/json",
                    Authorization: `Bearer ${process.env.TMDB_BEARER}`,
                },
            }
        );

        const data = detailRes.data;
        const trailer = data.videos?.results?.find(
            v => v.site === "YouTube" && v.type === "Trailer"
        ) || data.videos?.results?.find(v => v.site === "YouTube");

        return {
            tmdb_id: data.id,
            title: data.title,
            original_title: data.original_title,
            synopsis: data.overview || sub.synopsis,
            release_date: data.release_date?.trim() || sub.release_date,
            release_year: data.release_date?.trim() ? parseInt(data.release_date.slice(0, 4)) : sub.release_year,
            runtime: data.runtime || sub.runtime,
            vote_average: data.vote_average || 0,
            vote_count: data.vote_count || 0,
            poster_path: data.poster_path,
            backdrop_path: data.backdrop_path,
            original_language: data.original_language || sub.original_language,
            genres: data.genres?.map(g => g.name) || sub.genres || [],
            director: data.credits?.crew?.find(c => c.job === "Director")?.name || sub.director,
            cast_list: data.credits?.cast?.slice(0, 10).map(c => c.name) || sub.cast_list || [],
            trailer_key: trailer?.key || null,
        };

    } catch (err) {
        console.error(`TMDB enrichment failed for submission "${sub.title}":`, err.message);
        return null;
    }
}