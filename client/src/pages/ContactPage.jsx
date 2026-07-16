

import { useNavigate } from "react-router-dom";
import { ArrowBack, Public, } from "@mui/icons-material";
import { Button, } from "@mui/material";
import "./ContactPage.css";
import "./AfricanPage.css";
import "./MovieDetailPage.css";
import SEO from "../components/SEO";

function ContactPage() {
  const navigate = useNavigate();

  return (
    <div className="contact-page adm-page">
      <SEO
  title="Contact Us"
  description="Get in touch with the AfroCiné team — report a missing film, suggest a collaboration, or just say hello."
  url="/contact"
/>
      <nav className="md-nav contact-nav">
        <div className="af-logo" onClick={() => navigate("/")} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && navigate("/")}>
          <img
    src="/images/logo.png"
    alt="AfroCiné"
    className="af-logo-img"
  />
  <span className="af-logo-text-afro">AFRO</span>
  <span className="af-logo-text-cine">CINÉ</span>
        </div> 
        <Button
          className="md-back-btn"
          startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
      </nav>

      <div className="md-body contact-body">
        <div className="contact-shell fade-up">
          <section className="contact-card">
            <span className="contact-kicker">Let’s connect</span>
            <h1 className="contact-title">Reach out for collaborations, ideas, or a conversation.</h1>
            <p className="contact-subtitle">
              I’m building a space for African cinema discovery, and I’d love to hear from you.
              Whether you want to talk about film, product, or creative partnerships, this is the place.
            </p>

            <div className="contact-actions">
              <a className="contact-btn contact-btn--primary" href="https://github.com/philipewang120" target="_blank" rel="noreferrer">
                GitHub Profile
              </a>
              <a className="contact-btn contact-btn--secondary" href="mailto:philipewang120@gmail.com">
                Email Me
              </a>
            </div>
          </section>

          <aside className="contact-side-card">
            <div className="contact-meta-list">
              <div className="contact-meta-item">
                <span className="contact-meta-label">GitHub</span>
                <a className="contact-meta-value" href="https://github.com/philipewang120" target="_blank" rel="noreferrer">
                  @philipewang120
                </a>
              </div>
              <div className="contact-meta-item">
                <span className="contact-meta-label">Email</span>
                <a className="contact-meta-value" href="mailto:philipewang120@gmail.com">
                  philipewang120@gmail.com
                </a>
              </div>
              <div className="contact-meta-item">
                <span className="contact-meta-label">Telephone</span>
                <a className="contact-meta-value" href="tel:+237699346898">
                  +237 699346898
                </a>
              </div>
            </div>

            <p className="contact-studio">
              Designed by <strong>Graphic Pig Studios</strong>
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default ContactPage;
