import express from "express";
import passport from "../config/passport.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import db from "../db.js";
import { ensureUsername, getUserRole } from "../helpers/authHelpers.js";
import { authLimiter } from "../middleware/rateLimiters.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();
const saltRounds = 10;


router.get("/me", verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, username, email, profile_pic FROM users WHERE id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load user" });
  }
});

router.get("/auth/user", verifyToken, (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Not authenticated" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ user: decoded });
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
});

//google auth routes
router.get("/auth/google", authLimiter,
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect:
      "https://african-cinema.vercel.app/login",
    session: false,
  }),
  async (req, res) => {
    try {
      const username = await ensureUsername(
        req.user.id,
        req.user.email
      );

      const role = await getUserRole(req.user.id);

      const token = jwt.sign(
        {
          id: req.user.id,
          email: req.user.email,
          profile_pic: req.user.profile_pic,
          username,
          role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.redirect(
        `https://african-cinema.vercel.app/home?token=${token}`
      );
    } catch (err) {
      console.error(err);

      res.redirect(
        "https://african-cinema.vercel.app/login"
      );
    }
  }
);


//FACEBOOK 
router.get("/auth/facebook",
  authLimiter,
  passport.authenticate("facebook", { scope: ["email"] })
);

router.get("/auth/facebook/callback",
  authLimiter,
  passport.authenticate("facebook", {
    failureRedirect: "https://african-cinema.vercel.app/login",
    session: false
  }),
  async (req, res) => {
    try {
      const username = await ensureUsername(
        req.user.id,
        req.user.email
      );

      const role = await getUserRole(req.user.id);

      const token = jwt.sign(
        {
          id: req.user.id,
          email: req.user.email,
          profile_pic: req.user.profile_pic,
          username,
          role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.redirect(
        `https://african-cinema.vercel.app/home?token=${token}`
      );
    } catch (err) {
      console.error(err);

      res.redirect(
        "https://african-cinema.vercel.app/login"
      );
    }
  }

);

// GITHUB 
router.get("/auth/github", authLimiter,
  passport.authenticate("github", { scope: ["user:email"] })
);

router.get("/auth/github/callback",
  passport.authenticate("github", {
    failureRedirect: "https://african-cinema.vercel.app/login",
    session: false
  }),
  async (req, res) => {
    try {
      const username = await ensureUsername(
        req.user.id,
        req.user.email
      );

      const role = await getUserRole(req.user.id);

      const token = jwt.sign(
        {
          id: req.user.id,
          email: req.user.email,
          profile_pic: req.user.profile_pic,
          username,
          role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.redirect(
        `https://african-cinema.vercel.app/home?token=${token}`
      );
    } catch (err) {
      console.error(err);

      res.redirect(
        "https://african-cinema.vercel.app/login"
      );
    }
  }
);
// login route
router.post("/login", authLimiter, (req, res, next) => {
  passport.authenticate("local", async (err, user) => {
    if (err) return res.status(500).json({ message: "Server error" });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const username = await ensureUsername(user.id, user.email);
    const role = await getUserRole(user.id);

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        profile_pic: user.profile_pic,
        username,
        role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({ message: "Login successful", token });
  })(req, res, next);
});

//logout route (client just deletes token, no server action needed)
router.post("/api/logout", (req, res) => {
  res.json({ success: true }); // client just deletes the token
});

//register route
router.post("/register", authLimiter, async (req, res) => {
  const { email, password, username: providedUsername } = req.body;

  try {
    const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    if (providedUsername?.trim()) {
      const taken = await db.query("SELECT id FROM users WHERE username = $1", [
        providedUsername.trim(),
      ]);
      if (taken.rows.length > 0) {
        return res.status(400).json({ message: "Username already taken" });
      }
    }

    const hash = await bcrypt.hash(password, saltRounds);
    const result = await db.query(
      "INSERT INTO users (email, password, profile_pic) VALUES ($1, $2, $3) RETURNING *",
      [email, hash, null]
    );

    const user = result.rows[0];
    const username = providedUsername?.trim() || (await ensureUsername(user.id, user.email));

    if (providedUsername?.trim()) {
      await db.query("UPDATE users SET username = $1 WHERE id = $2", [username, user.id]);
    }

    const role = await getUserRole(user.id);
    const token = jwt.sign(
      { id: user.id, email: user.email, profile_pic: user.profile_pic, username, role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({ message: "User registered successfully", token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});









export default router;
