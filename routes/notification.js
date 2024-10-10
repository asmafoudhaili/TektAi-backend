import express from "express";
import { auth } from "../middlewares/auth.js"; // Importez le middleware auth
import { createNotification, getNotificationsByUser, markNotificationAsRead } from "../controllers/notification.js";

const router = express.Router(); // Créez une instance de routeur

// Endpoint pour créer une nouvelle notification
router.post('/', auth, createNotification);

// Endpoint pour récupérer toutes les notifications d'un utilisateur
router.get('/:userId', auth, getNotificationsByUser);

// Endpoint pour marquer une notification comme lue
router.patch('/:notificationId', auth, markNotificationAsRead);

export default router;
