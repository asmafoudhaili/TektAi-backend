import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firstname: {
    type: String,
    required: true,
  },
  lastname: {
    type: String,
    required: false, // Make lastname optional
  },
  securityQuestions: [
    {
      type: String,
      required: true
    }
  ],
  phone: {
    type: Number,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  codeForget: {
    type: String,
    default: "",
  },
  imageUser: {
    type: String,
    required: false, // Make imageUser optional
  },
  createdAt: {
    type: Date,
    default: Date.now // La date par défaut est la date actuelle lors de la création du profil
  },
  role: {
    type: String,
    enum: ["admin", "challenger", "company", "superAdmin"],
  },
  block: {
    type: Boolean,
    default: false, 
  },
  
  history: [
    {
      action: {
        type: String,
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }
  ],
  likedChallenges: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
   required: false, 

   }]
});

const User = mongoose.model("User", userSchema);

export default User;
