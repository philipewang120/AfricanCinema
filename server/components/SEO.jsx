
import { Helmet } from "react-helmet-async";

const SITE_NAME = "AfroCiné";
const SITE_URL  = "https://african-cinema.vercel.app";
const DEFAULT_DESC = "Discover the best of African cinema — Nollywood, Francophone Africa, Arab Africa and beyond. Browse top-rated films, classics, and latest releases.";
const DEFAULT_IMAGE = `${SITE_URL}/images/logo.png`;

export default function SEO({
  title,
  description = DEFAULT_DESC,
  image       = DEFAULT_IMAGE,
  url,
  type        = "website",
  noindex     = false,
}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const fullUrl   = url ? `${SITE_URL}${url}` : SITE_URL;

  return (
    <Helmet>
      {/* Core */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={fullUrl} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph — Facebook, WhatsApp, LinkedIn */}
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image"       content={image} />
      <meta property="og:url"         content={fullUrl} />
      <meta property="og:type"        content={type} />
      <meta property="og:site_name"   content={SITE_NAME} />
      <meta property="og:locale"      content="en_US" />

      {/* Twitter / X card */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image"       content={image} />

      {/* AI crawlers */}
      <meta name="robots" content="index, follow, max-image-preview:large" />
    </Helmet>
  );
}