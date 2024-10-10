import mongoose from "mongoose";
const Schema = mongoose.Schema;


const commentSchema = new Schema({
  userId: {
      type: Schema.Types.ObjectId,
      ref: 'challenger',
      required: true
  },
  userName: {
      type: String,
      required: true
  },
  userImage: {
    type: String,
    required: false
},
  content: {
      type: String,
      required: true
  }
}, { timestamps: true });

const challengeSchema = new Schema({
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    evaluationmetric: {
      type: String,
      required: false
    },
    submissionfiledescription: {
      type: String,
      required: false
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'challenger' // Reference to the Challenger schema
    }],
    teams: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'team' // Référence au schéma de l'équipe
    }],
    teamCreated: {
      type: Boolean,
      default: false  // Par défaut, teamCreated est défini sur false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: false,
      select: 'firstname' // Limiter les informations renvoyées à seulement le prénom du créateur
    },  
    problematic:{
      type: String,
      required: true
    },
    imgChallenge: {
      type: String,
      required: false, 
    },

    rankingMode: {
      type: String,
      enum: ['Automate', 'Expert', 'Both'], 
      default: 'Both',
      required: true
  },
  
  ispublic: {
    type: Boolean,
    default: true  // Valeur par défaut si non fournie par le front-end
  },
  isprivate: {
      type: Boolean,
      default: false  
  },
  solo: {
      type: Boolean,
      default: true  
  },
  maxParticipants: {
      type: Number,
      default: 10  
  },
  team: {
      type: Boolean,
      default: false  
  },
  maxTeams: {
      type: Number,
      default: 5 
  },
  maxTeamMembers: {
      type: Number,
      default: 5  
  },
    presentation: {
      type: Boolean,
      default: true
  },
  output: {
      type: Boolean,
      default: true
  },
  codeSource: {
      type: Boolean,
      default: true
  },
  dataset: {
      type: Boolean,
      default: false
  },
  rapport: {
      type: Boolean,
      default: false
  },
  demo: {
      type: Boolean,
      default: false
  },
  monetaryPrize: {
    type: Number,
    required: false,
  },
  isMonetaryAmount: {
    type: Boolean,
    default: false,
  },
  otherGiftDetails: {
    gift:  {type : String}
  },
  isUnmonetaryAmount: {
    type: Boolean,
    default: false,
  },
  internship: {
    type: Boolean,
    default: false,
  },
  internshipDetails: {
    period: { type: String },
    post: { type: String },
    place: { type: String },
    salary: { type: String },
  },
  jobOffer: {
    type: Boolean,
    default: false,
  },
  jobOfferDetails: {
    period: { type: String },
    post: { type: String },
    place: { type: String },
    salary: { type: String },
  },
  freelanceOpportunity: {
    type: Boolean,
    default: false,
  },
  freelanceDetails: {
    details: { type: String },
    salary: { type: String },
  },
  // sodexoPassMulti: {
  //   type: Boolean,
  //   default: false,
  // },
  // sodexoPassMultiValue: {
  //   type: String,
  //   default: '', // Valeur par défaut pour éviter les problèmes de cast
  //   required: false,
  // },
  
  otherGift: {
    type: Boolean,
    default: false,
  },

    solutions: [{
      participant: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'challenger' // Référence au schéma du participant
      },
      file: [{
          type: String, // Chemin vers le fichier PDF ou stockage du fichier PDF dans la base de données
          required: false
      }],
      score:{
        type:Number,
        required:false
      }
  }],
  comments: [commentSchema]
  });
  

const Challenge = mongoose.model("Challenge", challengeSchema);

export default Challenge;