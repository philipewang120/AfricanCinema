
import { useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import { Public } from "@mui/icons-material";
import "./Footer.css";
import "../pages/AfricanPage.css";



function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      {/* Ambient line */}
      <div className="footer-glow-line" />

      <div className="footer-inner">

        {/* Brand */}
        <div className="footer-brand">
          <Box
  className="af-logo"
  onClick={() => navigate("/")}
  sx={{ flexShrink: 0, cursor: "pointer" }}
>
  <div className="af-logo-icon">
    <Public sx={{ fontSize: 16 }} />
  </div>
  <span className="af-logo-text-afro">AFRO</span>
  <span className="af-logo-text-cine">CINÉ</span>
</Box>
          <p className="footer-tagline">
            Celebrating African cinema — past, present and future.
          </p>
        </div>

        {/* Links */}
        <nav className="footer-links">
          <a href="/" className="footer-link">Home</a>
          <a href="/submit" className="footer-link">Submit a Film</a>
          <a href="/contact" className="footer-link">Contact</a>
        </nav>

      </div>

      {/* Bottom bar */}
      <div className="footer-bottom">
        <span className="footer-legal">
          © {year} AfroCiné™. All rights reserved.
        </span>
        <span className="footer-legal footer-trademark">
          AfroCiné is a trademark of the AfroCiné project.
          Not affiliated with TMDB or any streaming service.
        </span>
      </div>
    </footer>
  );
}

export default Footer;