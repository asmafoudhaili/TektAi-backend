import express from "express";
import {downloadFile,getFiles,getScoresForChallenge,addScoreToChallenge,countTimeRemaining,getParticipantsInCompanyChallenges,getChallengeOutputValue,getChallengedemoValue,getChallengerapportValue,getChallengedatasetValue,getChallengecodeSourceValue,getChallengepresentationValue,getChallengesByCompanyId,getChallengeById,addSolutionToChallenge,addCommentToChallenge,getAllCommentsForChallenge,addSolutionToChallengePython,countParticipantsByChallenge,/*countTimeRemaining*/calculateRemainingTime,ChallengesInCompany,getAllTeamsForChallenge,participateChallenge, getAllChallenges, createChallenge, updateChallenge, deleteChallenge, downloadExcelFile } from "../controllers/challenge.js";
import { auth } from "../middlewares/auth.js"; // Importez le middleware auth
import multerConfig from "../middlewares/multerConfig.js"; // Importez la configuration multer pour gérer les fichiers Excel

const router = express.Router();

// Routes
router.get('/downloadFile/:filePath', auth, downloadFile);
router.get('/getFiles/:challengeId', auth, getFiles); 
router.get('/:challengeId/scores',getScoresForChallenge) ; 
router.get('/:challengeId', auth, getChallengeById);
router.get("/", auth, getAllChallenges); 
router.post("/", auth, multerConfig, createChallenge); 
router.put("/:id", auth, updateChallenge); 
router.delete("/:id", auth, deleteChallenge);
router.get('/getcompany/:companyId',auth, getChallengesByCompanyId);
router.get('/company/participants/:companyId', auth, getParticipantsInCompanyChallenges);
router.get('/:challengeId/time-remaining', countTimeRemaining);
router.get('/calculetime/:challengeId', calculateRemainingTime);
// router.get("/download/:challengeId", auth, downloadExcelFile); // Route pour télécharger le fichier Excel
router.post("/:id/participate", auth, participateChallenge); // Route to participate in a challenge
router.get('/team/:challengeId',auth ,getAllTeamsForChallenge);
router.post('/:challengeId/solutions',multerConfig,auth,addSolutionToChallenge);
router.post("/:challengeId/commentaire",auth,addCommentToChallenge);
router.get("/:challengeId/getcommentaires",getAllCommentsForChallenge); 
router.post('/:challengeId/upload-notebook', multerConfig,addSolutionToChallengePython);
router.get('/:companyId/challenges/participants-count', countParticipantsByChallenge); // Route pour compter les participants par challenge pour une société spécifique
router.get('/:companyId/NameChallenge', ChallengesInCompany);
router.post('/score/:challengeId',auth, addScoreToChallenge);
router.get('/output/:challengeId', getChallengeOutputValue);
router.get('/presentation/:challengeId', getChallengepresentationValue);
router.get('/codeSource/:challengeId', getChallengecodeSourceValue);
router.get('/dataset/:challengeId', getChallengedatasetValue);
router.get('/rapport/:challengeId', getChallengerapportValue);
router.get('/demo/:challengeId', getChallengedemoValue);
export default router;
