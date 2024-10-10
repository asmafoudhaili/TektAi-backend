import Notification from "../models/notification.js";

const createNotification = async (recipient, content, type, teamId) => {
    try {
        // Créer une nouvelle notification
        const notification = new Notification({
            recipient: recipient,
            content: content,
            type: type,
            team: teamId
        });

        // Enregistrer la notification dans la base de données
        const savedNotification = await notification.save();

        return savedNotification;
    } catch (error) {
        console.error('Erreur lors de la création de la notification :', error);
        throw new Error('Erreur interne du serveur');
    }
};


  

const getNotificationsByUser = async (req, res) => {
  try {
    const userId = req.params.userId;

    const notifications_invi = await Notification.find({ receiver: userId }).sort({ createdAt: -1 }).populate("sender", "firstname imageUser")
    .populate("team", "teamname")
    .exec();
    

    res.status(200).json( {success: true, notifications_invi});
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Controller pour marquer une notification comme lue
 const markNotificationAsRead = async (req, res) => {
  try {
    const notificationId = req.params.notificationId;

    // Mettre à jour la notification pour la marquer comme lue
    await Notification.findByIdAndUpdate(notificationId, { read: true });

    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export {markNotificationAsRead,getNotificationsByUser,createNotification}; 