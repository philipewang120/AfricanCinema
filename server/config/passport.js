import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as GitHubStrategy } from "passport-github2";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import db from "../db.js";

const saltRounds = 10;

passport.use(
  "local",
  new LocalStrategy({ usernameField: "email" }, async (email, password, cb) => {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
      if (result.rows.length === 0) return cb(null, false);

      const user = result.rows[0];
      bcrypt.compare(password, user.password, (err, valid) => {
        if (err) return cb(err);
        return valid ? cb(null, user) : cb(null, false);
      });
    } catch (err) {
      return cb(err);
    }
  })
);

passport.use(
  "google", new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://africancinema.onrender.com/auth/google/callback",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        console.log(profile);
        
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.emails[0].value,
        ]);
        if (result.rows.length === 0) {
          const profile_pic = profile.photos[0]?.value || null;
          const hashedPlaceholder = await bcrypt.hash(`google-oauth-${profile.id}`, saltRounds);
          const newUser = await db.query(
            "INSERT INTO users (email, password, profile_pic) VALUES ($1, $2, $3) RETURNING *",
            [profile.emails[0].value, hashedPlaceholder, profile_pic]
          );
          return cb(null, newUser.rows[0]);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);

passport.use(
  "facebook", new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: "https://africancinema.onrender.com/auth/facebook/callback",
      profileFields: ["id", "displayName", "emails", "photos"]
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        console.log(profile);
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.emails?.[0]?.value,
        ]);
        if (result.rows.length === 0) {
          const profile_pic = profile.photos?.[0]?.value || null;
          const hashedPlaceholder = await bcrypt.hash(`facebook-oauth-${profile.id}`, saltRounds);
          const newUser = await db.query(
            "INSERT INTO users (email, password, profile_pic) VALUES ($1, $2, $3) RETURNING *",
            [profile.emails?.[0]?.value || null, hashedPlaceholder, profile_pic]
          );
          return cb(null, newUser.rows[0]);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);

passport.use(
  "github", new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "https://africancinema.onrender.com/auth/github/callback",
      profileFields: ["id", "displayName", "emails", "photos"],
      scope: ["user:email"],
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return cb(null, false, {
            message: "Your GitHub account has no public email. Try registering with an email address instead.",
          });
        }

        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);

        if (result.rows.length > 0) {
          return cb(null, result.rows[0]);
        }

        const profile_pic = profile.photos?.[0]?.value || null;
        const hashedPlaceholder = await bcrypt.hash(`github-oauth-${profile.id}`, saltRounds);

        const newUser = await db.query(
          "INSERT INTO users (email, password, profile_pic) VALUES ($1, $2, $3) RETURNING *",
          [email, hashedPlaceholder, profile_pic]
        );

        return cb(null, newUser.rows[0]);

      } catch (err) {
        console.error("GitHub strategy error:", err);
        return cb(err);
      }
    }
  )
);

export default passport;
