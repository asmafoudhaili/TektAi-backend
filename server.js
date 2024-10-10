import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import http from "http";
import userRoute from "./routes/user.js";
import chatRoutes from "./routes/chat.js";
import initSocketCommunication from "./config/socket.js";
import { Server } from "socket.io";
import challengeRoute from "./routes/challenge.js";
import teamRoute from "./routes/team.js";
import notificationRoute from "./routes/notification.js";


const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
initSocketCommunication(io);


const port = 9091;

mongoose
  .connect("mongodb://localhost:27017/tektai")
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.log(error));

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/chatest", (req, res) => {
  const filePath = path.join(process.cwd(), "views", "chat.ejs");
  res.sendFile(filePath);
});

// Routes utilisateur
app.use("/user", userRoute);
app.use("/chat", chatRoutes);

// Routes challenge
app.use('/challenge', challengeRoute);
// Routes team 
app.use('/team', teamRoute) ; 
//Routes notification 
app.use ('/notif', notificationRoute);

// Gestion des erreurs
app.use((req, res, next) => {
  res.status(404).json({ message: 'Not Found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal Server Error' });
});


// Gestion des connexions WebSocket avec Socket.io
io.on("connection", (socket) => {
  console.log("A user connected");

  // Ajoutez d'autres gestionnaires d'événements ici pour gérer les messages, les déconnexions, etc.
});

// Exportez l'instance du serveur Socket.io
export { server, io };

// Démarrage du serveur
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});