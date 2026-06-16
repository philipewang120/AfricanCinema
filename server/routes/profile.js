import express from "express";
import jwt from "jsonwebtoken";
import upload from "../config/cloudinary.js";



import db from "../db.js";

import { verifyToken } from "../middleware/auth.js";

const router = express.Router();



//get user profile by username
router.get("/profile/:username", async (req, res) => {
  try {
    const { username } = req.params;

    const userResult = await db.query(
      "SELECT id, username, email, bio, profile_pic, is_public FROM users WHERE username = $1",
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const profileUser = userResult.rows[0];

    // Optional auth — figure out who's asking, without requiring a token
    let requesterId = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
        requesterId = decoded.id;
      } catch {
        // invalid/expired token -> treat as anonymous
      }
    }

    const isOwner = requesterId === profileUser.id;

    // Privacy gate — if private and not the owner, return a locked shell
    if (!profileUser.is_public && !isOwner) {
      return res.json({
        id:          profileUser.id,
        username:    profileUser.username,
        email:       profileUser.email,
        bio:         profileUser.bio,
        profile_pic: profileUser.profile_pic,
        is_public:   profileUser.is_public,
        isOwner,
        locked:      true,
      });
    }

    // Films this user submitted to African Cinema
    const submissions = await db.query(
      `SELECT id, title, poster_url, status, created_at
       FROM african_submissions
       WHERE submitted_by = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [profileUser.id]
    );

    // Approved films from this user that made it into african_movies
    const approvedFilms = await db.query(
      `SELECT id, title, poster_path, release_year
       FROM african_movies
       WHERE submitted_by = $1
       ORDER BY created_at DESC
       LIMIT 6`,
      [profileUser.id]
    );

    res.json({
      id:          profileUser.id,
      username:    profileUser.username,
      email:       profileUser.email,
      bio:         profileUser.bio,
      profile_pic: profileUser.profile_pic,
      is_public:   profileUser.is_public,
      isOwner,
      locked:      false,
      stats: {
        totalSubmissions: submissions.rows.length,
        totalApproved:    approvedFilms.rows.length,
      },
      submissions:   submissions.rows,
      approvedFilms: approvedFilms.rows,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load profile" });
  }
});


// Upload/update profile picture
router.post("/profile/avatar", verifyToken, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // multer-storage-cloudinary attaches the uploaded URL to req.file.path
    const profilePicUrl = req.file.path;

    const result = await db.query(
      "UPDATE users SET profile_pic = $1 WHERE id = $2 RETURNING id, username, profile_pic",
      [profilePicUrl, req.user.id]
    );

    const updated = result.rows[0];
    const token = jwt.sign(
      { id: updated.id, email: req.user.email, profile_pic: updated.profile_pic, username: updated.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ success: true, token, profile_pic: profilePicUrl });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to upload avatar" });
  }
});
//update profile
router.put("/profile/edit", verifyToken, async (req, res) => {
  const { username, bio, profile_pic } = req.body;

  try {
    // Check username isn't taken by someone else
    if (username) {
      const taken = await db.query(
        "SELECT id FROM users WHERE username = $1 AND id != $2",
        [username, req.user.id]
      );
      if (taken.rows.length > 0) {
        return res.status(400).json({ message: "Username already taken" });
      }
    }

    const result = await db.query(
      `UPDATE users SET
        username   = COALESCE($1, username),
        bio        = COALESCE($2, bio),
        profile_pic= COALESCE($3, profile_pic)
       WHERE id = $4 RETURNING id, username, bio, profile_pic, is_public`,
      [username || null, bio || null, profile_pic || null, req.user.id]
    );

    // Return a fresh token with updated username
    const updated = result.rows[0];
    const token = jwt.sign(
      { id: updated.id, email: req.user.email, profile_pic: updated.profile_pic, username: updated.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ success: true, token, user: updated });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});
//toggle public/private profile

router.put("/profile/privacy", verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      "UPDATE users SET is_public = NOT is_public WHERE id = $1 RETURNING is_public",
      [req.user.id]
    );
    res.json({ is_public: result.rows[0].is_public });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update privacy" });
  }
});

export default router;