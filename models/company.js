import mongoose from "mongoose";
const Schema = mongoose.Schema;
import User from "../models/user.js";

const companySchema = new Schema(
  {
    field: {
      type: String,
      required: false,
    },

    country: {
      type: String,
      required: false,
    },
    address: {
      type: String,
      required: false,
    },
    need: {
      type: String,
      default: false,
      required : false,
    },

    description: {
      type: String,
      required: false,
    }, 
    challenger:   {
      type: mongoose.Schema.Types.ObjectId, 
      ref: "challenger", 
      default: null },
  },
 
  {
    discriminatorKey: "role",
  }
);

const Company = User.discriminator("Company", companySchema);
export default Company;