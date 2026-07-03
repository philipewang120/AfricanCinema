import axios from "axios";
import * as cheerio from "cheerio";

const urls = [
    "https://www.okayafrica.com/the-best-african-films-and-tv-to-watch-this-month/",
    "https://www.okayafrica.com/the-best-african-films-and-tv-shows-to-watch-this-month/"
];

const results = [];

async function scrape(url) {
    const { data } = await axios.get(url);

    const $ = cheerio.load(data);

    // Grab the article body
    const text = $("article").text();

    // Split into paragraphs
    const paragraphs = text
        .split(/\n+/)
        .map(p => p.trim())
        .filter(Boolean);

    const seen = new Set();

    for (const p of paragraphs) {
        // Pattern: Title ... directed by Director
        const match = p.match(
            /^(.+?)(?:\.|:|-)?\s+(?:is\s+)?(?:a\s+)?(?:film|movie|series|show)?[\s\S]{0,120}?directed by ([A-Z][A-Za-zÀ-ÿ'. -]+)/i
        );

        if (match) {
            const title = match[1].trim();
            const director = match[2].trim();

            const key = `${title}|${director}`;

            if (!seen.has(key)) {
                seen.add(key);
                results.push({
                    title,
                    director
                });
            }
        }
    }
}

(async () => {
    for (const url of urls) {
        await scrape(url);
    }

    console.log(results);
})();