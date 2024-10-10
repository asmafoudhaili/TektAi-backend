import User from "../models/user.js";
import Chat from "../models/chat.js";
import notification_message from "../models/notification_message.js";

export async function getMessages(req, res) {
  try {
    const user1Id = req.auth.userId;
    const user2Id = req.params.user;
console.log(user1Id);
console.log(user2Id);

    const [user1, user2] = await Promise.all([
      User.findById(user1Id),
      User.findById(user2Id),
    ]);

    if (!user2) {
      return res.status(404).json({ error: "User not found" });
    }

    const messages = await Chat.find({
      $or: [
        { sender: user1Id, receiver: user2Id },
        { sender: user2Id, receiver: user1Id },
      ],
    })
      .populate("sender", "firstname lastname imageUser")
      .populate("receiver", "firstname lastname imageUser")
      .sort({ date: "asc" })
      .exec();

    console.log("messages", messages)

      res.status(200).json({ messages}); 
    } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }};

  export async function postMessage(req, res) {
    try {
      const { receiverId, message } = req.body;
      const senderId = req.auth.userId;
  
      // Vérifier si le récepteur existe
      const receiver = await User.findById(receiverId);
      if (!receiver) {
        return res.status(404).json({ error: "Receiver not found" });
      }
  
      // Créer un nouveau message
      const newMessage = new Chat({
        sender: senderId,
        receiver: receiverId,
        message: message,
      });
  
      // Sauvegarder le nouveau message dans la base de données
      const savedChat= await newMessage.save()
      
      
      const populatedMessage = await Chat.findById(savedChat._id)
      .populate("sender", "firstname lastname imageUser")
      .populate("receiver", "firstname lastname imageUser")
      .exec();

      const newNotification = new notification_message({
        sender: senderId,
        receiver: receiverId,
        message: message,
      });
      await newNotification.save();
      
      res.status(201).json({ message: "Message sent successfully",  populatedMessage });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
  export async function getNotifications(req, res) {
    try {
      const receiverId = req.auth.userId;
  
      // Fetch unread notifications for the receiver
      const notifications = await notification_message.find({ receiver: receiverId, read: false }).sort({"timestamp": -1}) .populate("sender", "firstname lastname imageUser")
      .populate("receiver", "firstname lastname imageUser")
      .exec();

      const uniqueNotifications = [];
      notifications.forEach((notif)=>{
        const uniqueSender = uniqueNotifications.find((un)=>(un.sender._id).equals(notif.sender._id))
        if(!uniqueSender){
          uniqueNotifications.push(notif)
        }
      })
      console.log(uniqueNotifications)

      // Mark notifications as read
      // await notification_message.updateMany({ receiver: receiverId, read: false }, { read: true });
  
      res.status(200).json({ notifications: uniqueNotifications });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
  

  

 
