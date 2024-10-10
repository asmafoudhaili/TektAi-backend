// user.js
import express from "express";
import passport from "passport";
import { auth } from "../middlewares/auth.js";
import multer from "../middlewares/multerConfig.js";
import axios from "axios";
import {CHAT} from "../controllers/chatbot.js";
import {ChatBot} from "../controllers/chatbott.js";
import {
  getUserById,
  getChallengerIdForCompany,
  favoriteChallenges,
  getRole,
  countTotalCompanies,
  countTotalChallengers,
  getUserHistory,
  getOtherUserHistory,
  deleteSpecificHistory,
  removeFavoriteChallenge,
  getFavoriteChallenges,
  getAllCompany,
  getAllChallenger,
  getAllAdmins,
  updateUser,
  deleteUser,
  BlockUser,
  getProfile,
  SendCodeVerif,
  VerifNewUser,
  updateProfile,
  logout,
  VerifyAnswers,
  registerGitHubUser,
  createUser,
  addAdmin,
  login,
  ChangePasswordForgot,
  SendCodeForgot,
  VerifCodeForgot,
  refreshAccessToken,
  registerGoogleUser,
  checkGoogleUserExistence,
  getTeams ,
  getMyChallenges
} from "../controllers/user.js";

const router = express.Router();
router.route("/postman").post(ChatBot);


router.route ("/getProfile").get(auth,getProfile);
router.route("/profile").put(auth,multer,updateProfile);
router.route("/").post(multer,createUser);
router.route("/getChallenger").get(auth,getChallengerIdForCompany)
router.get('/getallcompany',auth, getAllCompany);
router.get('/getallchallenger',auth, getAllChallenger);
router.get('/getalladmin', auth,getAllAdmins);
router.route("/:userId/teams").get(auth, getTeams);
router.put('/:userId',auth, updateUser);
router.delete('/:userId',auth, deleteUser);
router.put('/block/:userId', auth, BlockUser);
router.route("/role").get(auth, getRole);
router.route("/:userId").get(getUserById);
router.route("/:userId/like/:challengeId").post(favoriteChallenges);
router.route("/:userId/unlike/:challengeId").delete(removeFavoriteChallenge);
router.get("/:userId/favoriteChallenges", getFavoriteChallenges);
router.route("/:userId/teams").get(auth, getTeams);
router.route("/:userId/challenges").get(auth, getMyChallenges);
router.route("/login").post(login);
router.post("/addAdmin", auth, addAdmin);
router.route("/forget").post(SendCodeForgot);
router.route("/reset").post(VerifCodeForgot);
router.route("/change").post(ChangePasswordForgot);
router.route("/register-google").post(registerGoogleUser);
router.route("/check-google-existence").get(checkGoogleUserExistence);
router.route("/register-github").post(registerGitHubUser);
router.route("/Answers").post(VerifyAnswers);
router.route("/CodeVerif").post(SendCodeVerif);
router.route("/VerifNewUser").post(VerifNewUser);
router.post("/logout", auth, logout);
router.route("/history").get(auth, getUserHistory);
router.route("/history/:historyId").delete(auth, deleteSpecificHistory);
router.route("/history/:userId").get(auth, getOtherUserHistory);
router.route("/nombreChallengers").get(countTotalChallengers);
router.route("/nombreCompanies").get(countTotalCompanies);
router.route("/refresh-token").post(auth, refreshAccessToken);
router.route("/postman").post(CHAT);

// New route for fetching teams associated with a user

export default router;
