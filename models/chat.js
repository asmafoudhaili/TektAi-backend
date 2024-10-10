import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema({
  sender: { type: mongoose.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Types.ObjectId, ref: "User", required: false },
  message: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

const Chat = mongoose.model("Chat", ChatSchema);
export default Chat;
