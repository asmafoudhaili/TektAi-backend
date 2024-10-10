import express from "express";
import {deleteTeam, createTeam }from "../controllers/team.js";
import { auth } from "../middlewares/auth.js"; // Importez le middleware auth


const router = express.Router();

router.post('/',auth, createTeam);

// router.get('/by-user/:userId', auth, getTeamsByUserId);

//router.post('/send-invitation',auth, sendInvitationEmail);

router.delete('/:userId/:challengeId', auth, deleteTeam);


export default router;
