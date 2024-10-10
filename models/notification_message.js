import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }, // Indicates whether the notification has been read by the receiver
});

const notification_message = mongoose.model('notification_message', notificationSchema);

export default notification_message;