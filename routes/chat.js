import express from "express";
const router = express.Router();
import { getMessages,getNotifications,postMessage } from "../controllers/chat.js";
import { auth } from "../middlewares/auth.js";
router.route("/notification").get(auth,getNotifications);
router.route("/:user").get(auth, getMessages);
router.route('/').post( auth, postMessage);

export default router;
