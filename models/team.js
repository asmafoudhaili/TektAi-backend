import mongoose from "mongoose";
const Schema = mongoose.Schema;

const teamSchema = new Schema({
  teamname: {
    type: String,
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' 
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

const team = mongoose.model("team", teamSchema);

export default team;
