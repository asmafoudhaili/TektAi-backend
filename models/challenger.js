import mongoose from "mongoose";
const Schema = mongoose.Schema;
import User from "./user.js";

const challengerSchema = new Schema(
  {
    gender: {
      type: String,
      enum: ["male", "female","not specified"],
      required: true,
    },


    country: {
        type: String,
        required: false,
      },

    address: {
      type: String,
      required: false,
    },


    status: {
        type: String,
        required: true,
      }

     
  },
  {
    discriminatorKey: "role",
  }
);


const challenger = User.discriminator("challenger", challengerSchema);
export default challenger;

