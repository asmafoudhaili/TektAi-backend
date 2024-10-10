//auth.js

import jwt from "jsonwebtoken";
import createError from "http-errors";
import User from '../models/user.js';

export function signAccessToken(userId) {
  return new Promise((resolve, reject) => {
    const payload = { _id: userId };
    const secret = "verySecretValue";
    const options = {
      audience: userId,
    };
    jwt.sign(payload, secret, options, (err, token) => {
      if (err) {
        console.log(err.message);
        reject(createError.InternalServerError());
        return;
      }
      resolve(token); 
    });
  });
}

export async function auth(req, res, next) {
  try {
    const token = req.headers.authorization;
    console.log("Authorization Header:", token);

    if (!token || !token.startsWith("Bearer ")) {
      console.log("Token missing or invalid format");
      throw createError.Unauthorized('Token missing or invalid format');
    }

    const tokenValue = token.split(" ")[1];
    console.log("Token Value:", tokenValue);

    const decodedToken = jwt.verify(tokenValue, "verySecretValue");
    console.log("Decoded Token:", decodedToken);

    const userId = decodedToken._id;
    console.log("User ID:", userId);

    // Récupérer l'utilisateur à partir de la base de données
    const user = await User.findById(userId);
    console.log("User:", user);

    // Vérifier si l'utilisateur existe
    if (!user) {
      console.log("User not found");
      throw createError.Unauthorized('User not found');
    }

    // Ajouter les informations d'authentification à l'objet req.auth
    req.auth = {
      userId: userId,
      role: user.role
    };
    console.log("User role:", user.role);
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ error: error.message });
  }
}







export function verifyAccessToken(req, res, next) {
  if (!req.headers["authorization"]) return next(createError.Unauthorized());
  const authHeader = req.headers["authorization"];
  const bearerToken = authHeader.split(" ");
  const token = bearerToken[1];
  jwt.verify(token, "verySecretValue", (err, payload) => {
    if (err) {
      const message =
        err.name === "JsonWebTokenError" ? "Unauthorized" : err.message;
      return next(createError.Unauthorized(message));
    }
    req.payload = payload;
    next();
  });
}

export async function signRefreshToken(userId) {
  try {
    const payload = {};
    const secret = "verySecretValue";
    const options = {
      expiresIn: "1y",
      audience: userId,
    };
    const token = await jwt.sign(payload, secret, options);
    return token;
  } catch (error) {
    console.error(error.message);
    throw createError.InternalServerError();
  }
}

export function verifyRefreshToken(refreshToken) {
  try {
    const decodedToken = jwt.verify(refreshToken, "verySecretValue");
    const userId = decodedToken.aud;
    return userId;
  } catch (error) {
    console.error(error.message);
    throw createError.Unauthorized();
  }
}

export async function invalidateRefreshToken(userId) {
  try {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      // Handle the case where the user is not found
      console.error('User not found');
      return;
    }

    // Invalidate or blacklist the refresh token
    // For simplicity, you can add a field (e.g., refreshTokenValid) to the user document
    // Set this field to false to indicate that the refresh token is no longer valid

    user.refreshTokenValid = false;

    // Save the updated user document
    await user.save();

    console.log('Refresh token invalidated for user:', userId);
  } catch (error) {
    console.error('Error invalidating refresh token:', error);
    throw error; // Handle the error as needed
  }
}
