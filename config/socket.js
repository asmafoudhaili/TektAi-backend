import { Server } from "socket.io";
import Chat from "../models/chat.js";
import notification_message from "../models/notification_message.js";
import User from "../models/user.js";
import Notification from "../models/notification.js";
import { sendInvitationEmail } from "../controllers/team.js";

const users = [
  {
    userId: "",
    socketId: "",
  },
];

export default async function initSocketCommunication(io) {
  io.on("connection", (socket) => {
    console.log("Client Connected.");

    socket.on("register", (data) => {
      console.log(data);
      console.log(users);
      const indexUser = users.findIndex((object) => {
        return object.userId === data;
      });
      if (indexUser === -1) {
        users.push({
          userId: data,
          socketId: socket.id,
        });
      } else {
        users[indexUser] = {
          userId: data,
          socketId: socket.id,
        };
      }
      console.log("users", users);
    });

    socket.on("send_message", async (data) => {
      console.log("send_message data", data);
      let receiver = "";
      users.map(async (elt, index) => {
        if (elt.userId === data.userId) {
          receiver = elt.socketId;
          return receiver;
        }
      });
      console.log("receiver", receiver)

      /*if (!receiver) {
            console.log("Receiver not found.");
            socket.emit("error", "Receiver not found.");
            return;
        }*/

      const sender = users.find((elt) => elt.socketId === socket.id)?.userId
      console.log("sender : ", sender);

      if (!sender) {
        console.log("User not registered.");
        socket.emit("error", "User not registered.");
        return;
      }

      try {
        const chat = new Chat({
          receiver: data.userId,
          sender: sender,
          message: data.message,
        });

        let receiverSocketId = "";
        users.forEach((user) => {
          if (user.userId === data.userId) {
            receiverSocketId = user.socketId;
          }
        });

        const sender1 = users.find((elt) => elt.socketId === socket.id)?.userId;
        const newNotification = new notification_message({
          sender: sender1,
          receiver: data.userId,
          message: data.message,
        });
        await newNotification.save();


        const savedChat = await chat.save().then(c => c.populate(['sender', 'receiver'])).then(c => c)
        //console.log("savedChat", savedChat)
        //savedChat.populate("sender", (error) => {
        //console.log("saved chat", savedChat);
        //});
        //console.log("Message saved successfully.");
        socket.emit("receive_message", savedChat);
        socket.to(receiver).emit("receive_message", savedChat);

      } catch (error) {
        console.log("Error while saving message:", error);
        socket.emit("error", "Error while saving message");
        return;
      }
    });

    socket.on("receive_message", function (data) { });

    socket.on("invitationSent", async (data) => {
      try {
        console.log("data notif", data);

        const invitedUsers = await User.find({
          email: {$in: data.emails}
        })
        console.log("invitedUsersIds", invitedUsers);
        const invitedUsersSocket = []
        users.forEach(user =>{
          console.log("user", user);
          const invitedUser = invitedUsers.find(invitedUser=> {
            console.log("invitedUser", invitedUser);
            console.log("invitedUser._id.toString() == user.userId", invitedUser._id.toString() == user.userId);
            return invitedUser._id.toString() == user.userId
          })
          if(invitedUser) invitedUsersSocket.push({socketId: user.socketId, userId: user.userId});
        })
      console.log('invitedUsersSocket', invitedUsersSocket)


        // Émettre un événement Socket.io pour informer l'utilisateur
        invitedUsersSocket.forEach(async user => {
          const newNotification = new Notification({
            sender: data.userId, // ou l'ID de l'utilisateur concerné
            receiver: user.userId,
            content: 'You have received an invitation socket.', // Contenu de la notification
            type: 'invitation', // Type de notification
            team: data.teamId, // ID de l'équipe concernée
          });
          const createdNotif = await newNotification.save();
          const notif = await Notification.findById(createdNotif._id).populate("sender", "firstname imageUser")
          .populate("team", "teamname")
          .exec()
          socket.to(user.socketId).emit('invitationReceived', notif);
          await sendInvitationEmail(data.emails, data.teamId, data.challengeId);
        });

        // Envoyer une réponse réussie
        //res.status(200).json({ success: true, message: 'Invitation emails sent successfully' });
      } catch (error) {
        console.error('Error sending invitation emails:', error);
      }
    });
    socket.on("disconnect", function (data) {
      console.log("Client Disconnected.");
      socket.broadcast.emit("user_leave", data);
    });
  });
}