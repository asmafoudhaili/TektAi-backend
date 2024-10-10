// controllers/user.js
import bcrypt from "bcryptjs";
import User from "../models/user.js";
import { auth, invalidateRefreshToken } from '../middlewares/auth.js';
import { signAccessToken, signRefreshToken , verifyRefreshToken} from "../middlewares/auth.js";
import challenger from "../models/challenger.js";
import Company from "../models/company.js";
import Team from "../models/team.js"; 
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { validationResult } from "express-validator";
import mongoose from "mongoose";
import Challenge from "../models/challenge.js";
import Team from "../models/team.js";

let utilisateur;

try {
  // Vérifiez si le modèle User existe déjà
  utilisateur = mongoose.model('User');
} catch (error) {
  // Si le modèle n'existe pas, compilez-le
  const userSchema = new mongoose.Schema({
    // Vos autres champs de modèle...
    createdAt: {
      type: Date,
      default: Date.now // La date par défaut est la date actuelle lors de la création du profil
    }
  });

  // Compilez le modèle User
  utilisateur = mongoose.model('User', userSchema);
}

export async function createUser(req, res) {
  // Validation des données de la requête
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Récupération des données de la requête
    const {
      firstname,
      lastname,
      phone,
      email,
      password,
      role,
      field,
      country,
      address,
      need,
      description,
      status,
      gender,
      securityQuestions,
      challengerId,
      likedChallenges
    } = req.body;

    // Hachage du mot de passe avec bcrypt
    const hashPass = await bcrypt.hash(password, 10);

    let user;

    if (role === "challenger") {
      console.log("Creating challenger account...");
      // Création du compte "challenger"
      user = await challenger.create({
        firstname,
        lastname,
        phone,
        email,
        password: hashPass,
        role,
        address,
        country,
        gender,
        status,
        securityQuestions,
        likedChallenges
      });

      // Génération des tokens pour le challenger et envoi de la réponse
      const accessToken = await signAccessToken(user.id);
      console.log("Access Token:", accessToken);
      const refreshToken = await signRefreshToken(user.id);
      console.log("Refresh Token:", refreshToken);
      return res.status(201).json({ user, accessToken, refreshToken });
    } else if (role === "company") {
      console.log("Creating company account...");
      // Création du compte "company"
      user = await Company.create({
        firstname,
        phone,
        email,
        password: hashPass,
        role,
        address,
        country,
        need,
        description,
        field,
        challenger: challengerId,
        securityQuestions,
        likedChallenges
      });
    }

    // Vérification de la création de l'utilisateur
    if (!user) {
      console.log("User creation failed");
      return res.status(500).json({ message: "User creation failed" });
    }

    // Génération des tokens et envoi de la réponse
    const accessToken = await signAccessToken(user.id);
    console.log("Access Token:", accessToken);
    const refreshToken = await signRefreshToken(user.id);
    console.log("Refresh Token:", refreshToken);
    return res.status(201).json({ user, accessToken, refreshToken });
  } catch (error) {
    console.log("Error creating user:", error);
    return res.status(500).json({ message: "Error creating user", error });
  }
}

export async function getUserById(req, res) {
  try {
    const userId = req.params.userId; // Accéder à la propriété userId de req.params
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export const getTeams = async (req, res) => {
  const { userId } = req.params;
  console.log('userId', userId);
  try {
    // Vérifier si l'utilisateur est un challenger
    const user = await User.findById(req.auth.userId);
    if (!user || user.role !== 'challenger') {
      return res.status(403).json({ message: 'Forbidden: Only Challengers can view teams' });
    }

    // Récupérer les équipes associées à l'userId spécifié
    let teams = await Team.find({ createdBy: userId })
      .populate({
        path: 'createdBy',
        select: 'firstname lastname imageUser'
      });

    // Transformer les équipes avant de les envoyer au frontend
    const transformedTeams = teams.map(team => {
      const createdByFullName = team.createdBy ? `${team.createdBy.firstname} ${team.createdBy.lastname}` : null;
      const transformedTeam = {
        _id: team._id,
        teamname: team.teamname,
        createdByFullName: createdByFullName,
        imageUser: team.createdBy ? team.createdBy.imageUser : null,
      };
      return transformedTeam;
    });

    res.json(transformedTeams);
  } catch (error) {
    console.error('Error getting teams:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};



export async function favoriteChallenges (req,res) {

  const { userId, challengeId } = req.params;

  try {
    const user = await User.findById(userId);
    const challenge = await Challenge.findById(challengeId);

    if (!user || !challenge) {
      return res.status(404).send('Utilisateur ou défi non trouvé');
    }

    user.likedChallenges.push(challenge);
    await user.save();

    res.status(200).send('Défi aimé avec succès');
  } catch (error) {
    console.error(error);
    res.status(500).send('Erreur lors de la tentative de like du défi');
  }
};

export async function removeFavoriteChallenge(req, res) {
  const { userId, challengeId } = req.params;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send('Utilisateur non trouvé');
    }

    // Retirez le challenge de la liste des défi favoris de l'utilisateur
    user.likedChallenges.pull(challengeId);
    await user.save();

    res.status(200).send('unlike challenge');
  } catch (error) {
    console.error(error);
    res.status(500).send('Erreur lors de la tentative de suppression du défi favori');
  }
}
export async function getFavoriteChallenges(req, res) {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId).populate({
      path: 'likedChallenges',
      select: 'title imgChallenge'
    });

    if (!user) {
      return res.status(404).send('Utilisateur non trouvé');
    }

    const favoriteChallenges = user.likedChallenges;
    res.status(200).json(favoriteChallenges);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erreur lors de la récupération des défis favoris de l\'utilisateur');
  }
}


export async function getMyChallenges(req, res) {
  const { userId } = req.params;

  try {
    // Find challenges created by the specified user
    const challenges = await Challenge.find({ createdBy: userId });

    // Return the challenges
    res.status(200).json(challenges);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching user challenges');
  }
}

// Fonction pour ajouter un nouvel administrateur
export async function addAdmin(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { firstname, lastname, phone, email, password } = req.body;

    const connect = req.auth.userId;
    console.log(connect);

    const Super = await User.findById(connect);
    const test = Super.role == "superAdmin";

    if (!test) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Hacher le mot de passe avec bcrypt
    const hashPass = await bcrypt.hash(password, 10);

    // Créer un nouvel administrateur
    const admin = await User.create({
      firstname,
      lastname,
      phone,
      email,
      password: hashPass,
      role: "admin",
    });

    // Générer des tokens
    const accessToken = await signAccessToken(admin.id);
    const refreshToken = await signRefreshToken(admin.id);

    // Envoyer les tokens dans la réponse
    await sendWelcomeEmail(admin);

    return res.status(201).json({ admin, accessToken, refreshToken });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error adding admin", error });
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        message: "No user found",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({
        message: "Password does not match",
      });
    }

    // Ajoutez un console.log pour afficher le rôle
    console.log("User role:", user.role);
    console.log("User id:", user.id);


    const accessToken = await signAccessToken(user.id);
    const refreshToken = await signRefreshToken(user.id); // Ajout du jeton de rafraîchissement

    res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken, // Ajout du jeton de rafraîchissement dans la réponse
      role: user.role, // Ajout du rôle dans la réponse
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Error logging in",
      error,
    });
  }
}

export async function getChallengerIdForCompany(req, res) {
  try {
    console.log('ID de l\'entreprise:',  req.auth.userId); // Ajoutez ce console log pour voir l'ID de l'entreprise dans la console

    const company = await Company.findById( req.auth.userId).populate('challenger');
    console.log('Entreprise trouvée:', company); // Ajoutez ce console log pour voir l'entreprise dans la console

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    const challenger = company.challenger;
    console.log('Challenger associé:', challenger); // Ajoutez ce console log pour voir le challenger dans la console

    if (!challenger) {
      return res.status(404).json({ error: 'Challenger non trouvé pour cette entreprise' });
    }

    // Générez un access token et un refresh token pour le challenger en utilisant l'ID du challenger
    const accessToken = await signAccessToken(challenger._id.toString()); // Utilisez l'ID du challenger récupéré comme chaîne
    const refreshToken = await signRefreshToken(challenger._id.toString()); // Utilisez l'ID du challenger récupéré comme chaîne

    console.log('Access Token pour le challenger:', accessToken); // Ajout du console log pour afficher l'access token
    console.log('Refresh Token pour le challenger:', refreshToken); // Ajout du console log pour afficher le refresh token

    return res.status(200).json({ challenger, accessToken, refreshToken });
  } catch (error) {
    console.error('Erreur lors de la récupération du challenger et de la génération des tokens :', error);
    return res.status(500).json({ error: 'Erreur serveur lors de la récupération du challenger et de la génération des tokens' });
  }
}



// Fonction pour gérer le switch de profil et la génération du token du challenger
export async function   switchProfileAndGenerateToken(req, res) {
  const {companyId} = req.body; // Récupérez l'ID du company depuis le corps de la requête

  try {
    // Vérifiez que companyId est défini
    if (!companyId) {
      return res.status(400).json({ error: 'ID du company manquant dans la requête' });
    }
  
    // Ici, vous devriez récupérer l'ID du challenger associé à l'entreprise
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }
    const challengerId = company.challenger;

    // Génération des tokens JWT pour le challenger
    const accessToken = await signAccessToken(challengerId);
    const refreshToken = await signRefreshToken(challengerId);

    return res.status(200).json({ accessToken, refreshToken }); // Retourne les tokens JWT du challenger
  } catch (err) {
    console.error('Erreur lors du switch de profil et de la génération du token du challenger :', err);
    return res.status(500).json({ error: 'Erreur serveur lors du switch de profil et de la génération du token du challenger' });
  }
}


export async function registerGoogleUser(req, res) {
  try {
    console.log("Request Body:", req.body);  // Ajoutez cette ligne pour imprimer le corps de la requête

    const { firstname, email } = req.body;

    // Vérifier si l'e-mail est présent dans le corps de la requête
    if (!email) {
      return res.status(400).json({ message: 'Email is required in the request body' });
    }

    // Vérifier si l'utilisateur avec l'e-mail donné existe déjà
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      // L'utilisateur existe déjà, générer des tokens et renvoyer la réponse de connexion réussie
      const accessToken = await signAccessToken(existingUser.id);
      const refreshToken = await signRefreshToken(existingUser.id);

      return res.status(200).json({ user: existingUser, accessToken, refreshToken });
    }

    // Si l'utilisateur n'existe pas, créer un nouvel utilisateur
    const user = new User({
      firstname,
      email: email.toLowerCase(),
      role: 'challenger',
    });

    // Manually save the user without validation
    await user.save({ validateBeforeSave: false });

    // Générer des tokens pour le nouvel utilisateur
    const accessToken = await signAccessToken(user.id);
    const refreshToken = await signRefreshToken(user.id);

    // Renvoyer la réponse avec les tokens
    return res.status(201).json({ user, accessToken, refreshToken });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error registering Google user', error });
  }
}

export async function checkGoogleUserExistence(req, res) {
  try {
    const { email } = req.query;

    // Vérifiez si l'utilisateur avec l'e-mail donné existe déjà
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    return res.status(200).json({ exists: !!existingUser });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error checking Google user existence', error });
  }
}

export async function registerGitHubUser(req, res) {
  try {
    console.log('Request Body:', req.body);

    const { githubId, username, email } = req.body;

    // Check if the email is present in the request body
    if (!email) {
      return res.status(400).json({ message: 'Email is required in the request body' });
    }

    // Check if the user with the given email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      // User already exists, generate tokens and return successful login response
      const accessToken = await signAccessToken(existingUser.id);
      const refreshToken = await signRefreshToken(existingUser.id);

      return res.status(200).json({ user: existingUser, accessToken, refreshToken });
    }

    // If the user does not exist, create a new user
    const user = new User({
      githubId,
      username,
      email: email.toLowerCase(),
      role: 'challenger',
    });

    // Manually save the user without validation
    await user.save({ validateBeforeSave: false });

    // Generate tokens for the new user
    const accessToken = await signAccessToken(user.id);
    const refreshToken = await signRefreshToken(user.id);

    // Return the response with tokens
    return res.status(201).json({ user, accessToken, refreshToken });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error registering GitHub user', error });
  }
}

// Fonction pour rafraîchir le jeton d'accès
export async function refreshAccessToken(req, res) {
  try {
    // Récupérer le jeton de rafraîchissement depuis le corps de la requête
    const { refreshToken } = req.body;

    // Vérifier le jeton de rafraîchissement
    const userId = await verifyRefreshToken(refreshToken);

    // Générer un nouveau jeton d'accès
    const accessToken = await signAccessToken(userId);

    // Répondre avec le nouveau jeton d'accès
    return res.status(200).json({ accessToken });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error refreshing access token", error });
  }
}

export async function logout(req, res) {
  try {
    const userId = req.auth.userId;

    // Invalidate the refresh token
    await invalidateRefreshToken(userId);

    return res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Error during logout:', error);
    return res.status(500).json({ message: 'Error logging out', error });
  }
}


// Fonction pour obtenir tous les utilisateurs avec un rôle de "company"
export async function getAllCompany(req, res) {
  try {
    const { role } = req.auth; // Récupérer le rôle de l'utilisateur connecté

    if (role !== 'superAdmin' && role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized action' });
    }

    const users = await User.find({ role: 'company' });

    return res.status(200).json({ users });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error fetching company users', error });
  }
}

// Fonction pour obtenir tous les utilisateurs avec un rôle de "challenger"
export async function getAllChallenger(req, res) {
  try {
    const { role } = req.auth; 
    console.log(role); 

 
    if (role !== 'superAdmin' && role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized action' });
    }

    const users = await User.find({ role: 'challenger' });

    return res.status(200).json({ users });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error fetching challenger users', error });
  }
}
// Fonction pour obtenir tous les administrateurs si l'utilisateur est superAdmin
export async function getAllAdmins(req, res) {
  try {
    const { role } = req.auth; 

    if (role !== 'superAdmin') {
      return res.status(403).json({ message: 'Unauthorized action' });
    }

    const users = await User.find({ role: 'admin' });

    return res.status(200).json({ users });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error fetching admins', error });
  }
}



export async function updateUser(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.params.userId; // Assurez-vous que le paramètre correspond à votre route
  const updateData = req.body;

  try {
    const user = await User.findById(req.auth.userId); // Récupérer l'utilisateur connecté

    // Vérifier si l'utilisateur n'est pas admin et que seul le superAdmin peut effectuer la mise à jour
    if (user.role !== 'superAdmin') {
      return res.status(401).json({ message: "Unauthorized action" });
    }

    // Vérifier si l'ID de l'utilisateur à mettre à jour est valide
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    user.history.push({ 
      action: `You updated user: ${updatedUser.firstname} ${updatedUser.lastname} (ID: ${userId})`, 
      timestamp: new Date() 
    });
    await user.save();
    console.log("User updated successfully:", updatedUser);
    return res.json({ user: updatedUser });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error updating user", error });
  }
}

// Fonction pour supprimer un utilisateur par le superAdmin
export async function deleteUser(req, res) {
  try {
    const { role, userId: currentUserId } = req.auth; // Récupérer le rôle et l'ID de l'utilisateur connecté (superAdmin)
    const { userId } = req.params; // Récupérer l'ID de l'utilisateur à supprimer

    if (role !== 'superAdmin') {
      return res.status(403).json({ message: 'Unauthorized action' });
    }

    // Vérifier si l'ID de l'utilisateur à supprimer est valide
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Ajouter l'action de suppression à l'historique de l'utilisateur qui effectue la suppression
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' });
    }
    currentUser.history.push({ 
      action: `You have deleted the user: ${deletedUser.firstname} ${deletedUser.lastname} (ID: ${userId})`, 
      timestamp: new Date() 
    });
        await currentUser.save();

    return res.status(200).json({ message: 'User deleted successfully', user: deletedUser });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error deleting user', error });
  }
}


export async function BlockUser(req, res) {
  const { userId } = req.params;
  const { role, userId: currentUserId } = req.auth; 

  try {
    if (role !== 'superAdmin') {
      return res.status(403).send({ message: 'Unauthorized action' });
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send({ message: 'Invalid user ID' });
    }

    const banned = { block: true };
    const unbanned = { block: false };

    const us = await User.findById(userId);

    if (!us) {
      return res.status(404).send({ message: 'User not found' });
    }
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' });
    }
    currentUser.history.push({ 
      action: `You have blocked the user: ${us.firstname} ${us.lastname} (ID: ${userId})`, 
      timestamp: new Date() 
    });
        await currentUser.save();
    if (!us.block) {
      await us.updateOne(banned, { new: true });
      return res.status(200).send({ message: 'User blocked successfully' });
    } else {
      await us.updateOne(unbanned, { new: true });
      return res.status(200).send({ message: 'User unblocked successfully' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: 'Internal Server Error' });
  }
}


export function updateProfile(req, res) {
  const updateData = req.body;

  if (!mongoose.Types.ObjectId.isValid(req.auth.userId)) {
    return res.status(400).json({ error: 'Invalid userId' });
  }

  if (req.file && req.file.filename) {
    const imagePath = req.file.filename;
    updateData.imageUser = imagePath;
  }

  User.findById(req.auth.userId)
    .then((user) => {
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.role === 'challenger') {
        challenger
          .findOneAndUpdate({ _id: req.auth.userId }, updateData, { new: true })
          .then((updatedChallenged) => {
            res.status(200).json(updatedChallenged);
          })
          .catch((err) => {
            res.status(500).json({ error: err });
          });
      } else if (user.role === 'company') {
        Company.findOneAndUpdate({ _id: req.auth.userId }, updateData, { new: true })
          .then((updatedCompany) => {
            res.status(200).json(updatedCompany);
          })
          .catch((err) => {
            res.status(500).json({ error: err });
          });
      }
    })
    .catch((err) => {
      res.status(500).json({ error: err });
    });
}






////////////////////////////////////////////////////////
let transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true pour TLS
  auth: {
    user: "tektaicontact@gmail.com",
    pass: "fvuzgaepgwbfidnz",
  },
});

async function sendWelcomeEmail(user) {

  
    // Définir les options d'e-mail
    let mailOptions = {
      from: "TEKTAI",
      to: user.email,
      subject: "Welcome to Our Application!",
      text: `Dear , ${user.firstname}!`,
      html: `<!doctype html>
  <html lang="en-US">
  <head>
      <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
      <title>Welcome Email Template</title>
      <meta name="description" content="Welcome Email Template.">
      <style type="text/css">
          a:hover {text-decoration: underline !important;}
      </style>
  </head>
  <body marginheight="0" topmargin="0" marginwidth="0" style="margin: 0px; background-color: #ffffff;" leftmargin="0">
      <!--100% body table-->
      <table cellspacing="0" border="0" cellpadding="0" width="100%" bgcolor="#ffffff"
          style="@import url(https://fonts.googleapis.com/css?family=Rubik:300,400,500,700|Open+Sans:300,400,600,700); font-family: 'Open Sans', sans-serif;">
          <tr>
              <td>
                  <table style="background-color: #ffffff; max-width:670px;  margin:0 auto;" width="100%" border="0"
                      align="center" cellpadding="0" cellspacing="0">
                      <tr>
                          <td style="height:80px;">&nbsp;</td>
                      </tr>
                      <tr>
                          <td style="text-align:center;">
                              <h1 style="color:#2a4d69; font-weight:500; margin:0;font-size:32px;font-family:'Rubik',sans-serif;">Welcome to Our Platform</h1>
                              <span style="display:inline-block; vertical-align:middle; margin:29px 0 26px; border-bottom:1px solid #cecece; width:100px;"></span>
                              <p style="color:#455056; font-size:15px;line-height:24px; margin:0;">
                                  Thank you for joining our platform. We are excited to have you as a member of our community.
                              </p>
                              <a href="#" style="background:#0dcaf0;text-decoration:none !important; font-weight:500; margin-top:35px; color:#fff;text-transform:uppercase; font-size:14px;padding:10px 24px;display:inline-block;border-radius:50px;">Get Started</a>
                          </td>
                      </tr>
                      <tr>
                          <td style="height:40px;">&nbsp;</td>
                      </tr>
                      <tr>
                          <td style="text-align:center;">
                              <p style="font-size:14px; color:#a0aec0; line-height:18px; margin:0 0 0;">&copy; <strong>www.tektai.com</strong></p>
                          </td>
                      </tr>
                      <tr>
                          <td style="height:80px;">&nbsp;</td>
                      </tr>
                  </table>
              </td>
          </tr>
      </table>
      <!--/100% body table-->
  </body>
  </html>
  `,
    };
  
    // Envoyer l'e-mail
    let info = await transporter.sendMail(mailOptions);
  
    console.log("Message sent: %s", info.messageId);
  }

  let codeExpected = ""; // Déclaration d'une variable globale pour stocker le code attendu

  export async function SendCodeVerif(req, res, next) {
    const email = req.body.email.toLowerCase(); // Convertir l'email en minuscules
  
    // Générer un code de réinitialisation aléatoire
    const RandomXCode = Math.floor(1000 + Math.random() * 9000);
    console.log(RandomXCode);
    codeExpected = RandomXCode.toString();

    // Préparer les options de l'email
    const mailOptions = {
      from: 'TEKTAI',
      to: email,
      text: 'Verif Email?',
      subject: 'Verif Email',
      html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
       <head>
        <meta charset="UTF-8">
        <meta content="width=device-width, initial-scale=1" name="viewport">
        <meta name="x-apple-disable-message-reformatting">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta content="telephone=no" name="format-detection">
        <title>New Message</title><!--[if (mso 16)]>
          <style type="text/css">
          a {text-decoration: none;}
          </style>
          <![endif]--><!--[if gte mso 9]><style>sup { font-size: 100% !important; }</style><![endif]--><!--[if gte mso 9]>
      <xml>
          <o:OfficeDocumentSettings>
          <o:AllowPNG></o:AllowPNG>
          <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
      </xml>
      <![endif]--><!--[if !mso]><!-- -->
        <link href="https://fonts.googleapis.com/css2?family=Orbitron&display=swap" rel="stylesheet"><!--<![endif]-->
        <style type="text/css">
      #outlook a {
        padding:0;
      }
      .es-button {
        mso-style-priority:100!important;
        text-decoration:none!important;
      }
      a[x-apple-data-detectors] {
        color:inherit!important;
        text-decoration:none!important;
        font-size:inherit!important;
        font-family:inherit!important;
        font-weight:inherit!important;
        line-height:inherit!important;
      }
      .es-desk-hidden {
        display:none;
        float:left;
        overflow:hidden;
        width:0;
        max-height:0;
        line-height:0;
        mso-hide:all;
      }
      .es-button-border:hover a.es-button, .es-button-border:hover button.es-button {
        background:#58dfec!important;
      }
      .es-button-border:hover {
        border-color:#26C6DA #26C6DA #26C6DA #26C6DA!important;
        background:#58dfec!important;
        border-style:solid solid solid solid!important;
      }
      @media only screen and (max-width:600px) {p, ul li, ol li, a { line-height:150%!important } h1, h2, h3, h1 a, h2 a, h3 a { line-height:120% } h1 { font-size:30px!important; text-align:center } h2 { font-size:24px!important; text-align:left } h3 { font-size:20px!important; text-align:left } .es-header-body h1 a, .es-content-body h1 a, .es-footer-body h1 a { font-size:30px!important; text-align:center } .es-header-body h2 a, .es-content-body h2 a, .es-footer-body h2 a { font-size:24px!important; text-align:left } .es-header-body h3 a, .es-content-body h3 a, .es-footer-body h3 a { font-size:20px!important; text-align:left } .es-menu td a { font-size:14px!important } .es-header-body p, .es-header-body ul li, .es-header-body ol li, .es-header-body a { font-size:14px!important } .es-content-body p, .es-content-body ul li, .es-content-body ol li, .es-content-body a { font-size:14px!important } .es-footer-body p, .es-footer-body ul li, .es-footer-body ol li, .es-footer-body a { font-size:14px!important } .es-infoblock p, .es-infoblock ul li, .es-infoblock ol li, .es-infoblock a { font-size:12px!important } *[class="gmail-fix"] { display:none!important } .es-m-txt-c, .es-m-txt-c h1, .es-m-txt-c h2, .es-m-txt-c h3 { text-align:center!important } .es-m-txt-r, .es-m-txt-r h1, .es-m-txt-r h2, .es-m-txt-r h3 { text-align:right!important } .es-m-txt-l, .es-m-txt-l h1, .es-m-txt-l h2, .es-m-txt-l h3 { text-align:left!important } .es-m-txt-r img, .es-m-txt-c img, .es-m-txt-l img { display:inline!important } .es-button-border { display:inline-block!important } a.es-button, button.es-button { font-size:18px!important; display:inline-block!important } .es-adaptive table, .es-left, .es-right { width:100%!important } .es-content table, .es-header table, .es-footer table, .es-content, .es-footer, .es-header { width:100%!important; max-width:600px!important } .es-adapt-td { display:block!important; width:100%!important } .adapt-img { width:100%!important; height:auto!important } .es-m-p0 { padding:0px!important } .es-m-p0r { padding-right:0px!important } .es-m-p0l { padding-left:0px!important } .es-m-p0t { padding-top:0px!important } .es-m-p0b { padding-bottom:0!important } .es-m-p20b { padding-bottom:20px!important } .es-mobile-hidden, .es-hidden { display:none!important } tr.es-desk-hidden, td.es-desk-hidden, table.es-desk-hidden { width:auto!important; overflow:visible!important; float:none!important; max-height:inherit!important; line-height:inherit!important } tr.es-desk-hidden { display:table-row!important } table.es-desk-hidden { display:table!important } td.es-desk-menu-hidden { display:table-cell!important } .es-menu td { width:1%!important } table.es-table-not-adapt, .esd-block-html table { width:auto!important } table.es-social { display:inline-block!important } table.es-social td { display:inline-block!important } .es-desk-hidden { display:table-row!important; width:auto!important; overflow:visible!important; max-height:inherit!important } }
      @media screen and (max-width:384px) {.mail-message-content { width:414px!important } }
      </style>
       </head>
       <body style="width:100%;font-family:arial, 'helvetica neue', helvetica, sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;padding:0;Margin:0">
        <div dir="ltr" class="es-wrapper-color" lang="en" style="background-color:#07023C"><!--[if gte mso 9]>
            <v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t">
              <v:fill type="tile" color="#07023c"></v:fill>
            </v:background>
          <![endif]-->
         <table class="es-wrapper" width="100%" cellspacing="0" cellpadding="0" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;padding:0;Margin:0;width:100%;height:100%;background-repeat:repeat;background-position:center top;background-color:#07023C">
           <tr>
            <td valign="top" style="padding:0;Margin:0">
             <table class="es-content" cellspacing="0" cellpadding="0" align="center" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
               <tr>
                <td align="center" style="padding:0;Margin:0">
                 <table class="es-content-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#ffffff;background-repeat:no-repeat;width:600px;background-image:url(https://efxsvyb.stripocdn.email/content/guids/CABINET_0e8fbb6adcc56c06fbd3358455fdeb41/images/vector_0Ia.png);background-position:center center" cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center" background="https://efxsvyb.stripocdn.email/content/guids/CABINET_0e8fbb6adcc56c06fbd3358455fdeb41/images/vector_0Ia.png" role="none">
                   <tr>
                    <td align="left" style="Margin:0;padding-bottom:10px;padding-top:20px;padding-left:20px;padding-right:20px">
                     <table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                       <tr>
                        <td class="es-m-p0r" valign="top" align="center" style="padding:0;Margin:0;width:560px">
                         <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                           <tr>
                            <td align="center" style="padding:0;Margin:0;font-size:0px"><a target="_blank" href="https://viewstripo.email" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:underline;color:#26C6DA;font-size:14px"><img src="https://efxsvyb.stripocdn.email/content/guids/CABINET_b0acaa6517477956e8f5a273acd40d02be26db03936a3371097894c6a6836992/images/image_20240402_164020011.png" alt="Logo" style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" title="Logo" height="105"></a></td>
                           </tr>
                         </table></td>
                       </tr>
                     </table></td>
                   </tr>
                   <tr>
                    <td align="left" style="Margin:0;padding-left:20px;padding-right:20px;padding-top:30px;padding-bottom:30px">
                     <table width="100%" cellspacing="0" cellpadding="0" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                       <tr>
                        <td class="es-m-p0r es-m-p20b" valign="top" align="center" style="padding:0;Margin:0;width:560px">
                         <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                           <tr>
                            <td align="center" style="padding:0;Margin:0"><h1 style="Margin:0;line-height:53px;mso-line-height-rule:exactly;font-family:Orbitron, sans-serif;font-size:44px;font-style:normal;font-weight:bold;color:#10054D">Welcome To TEKTAI&nbsp;<br></h1></td>
                           </tr>
                           <tr>
                            <td align="center" style="padding:0;Margin:0;padding-bottom:10px;padding-top:15px;font-size:0px"><a target="_blank" href="https://viewstripo.email" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:underline;color:#26C6DA;font-size:14px"><img class="adapt-img" src="https://efxsvyb.stripocdn.email/content/guids/CABINET_b0acaa6517477956e8f5a273acd40d02be26db03936a3371097894c6a6836992/images/image_20240402_165339903.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" height="300"></a></td>
                           </tr>
                           <tr>
                            <td align="center" style="padding:0;Margin:0;padding-top:10px;padding-bottom:10px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;color:#333333;font-size:14px">Let's verify your email<br></p></td>
                           </tr>
                           <tr>
                           <td align="center" style="padding: 0; Margin: 0; padding-top: 15px; padding-bottom: 15px;">
                           <!-- Génère un carré pour chaque chiffre du code aléatoire -->
                           ${RandomXCode.toString().split('').map((digit) => `
                           <div class="code-container" style="border: 2px solid #26C6DA; border-radius: 10px; width: 40px; height: 40px; display: inline-block; margin-right: 5px; text-align: center; font-size: 20px; font-weight: bold; color: #26C6DA;">${digit}</div>
                           `).join('')}
                         </td>
                                                    </tr>
                           <tr>
                            <td align="center" style="padding:0;Margin:0;padding-top:10px;padding-bottom:10px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;color:#333333;font-size:14px">If you ignore this message, your email won't be verifed.</p></td>
                           </tr>
                         </table></td>
                       </tr>
                     </table></td>
                   </tr>
                 </table></td>
               </tr>
             </table>
             <table cellpadding="0" cellspacing="0" class="es-content" align="center" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
               <tr>
                <td align="center" style="padding:0;Margin:0">
                 <table bgcolor="#10054D" class="es-content-body" align="center" cellpadding="0" cellspacing="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#10054d;width:600px" role="none">
                   <tr>
                    <td align="left" background="https://efxsvyb.stripocdn.email/content/guids/CABINET_0e8fbb6adcc56c06fbd3358455fdeb41/images/vector_sSY.png" style="Margin:0;padding-left:20px;padding-right:20px;padding-top:35px;padding-bottom:35px;background-image:url(https://efxsvyb.stripocdn.email/content/guids/CABINET_0e8fbb6adcc56c06fbd3358455fdeb41/images/vector_sSY.png);background-repeat:no-repeat;background-position:left center"><!--[if mso]><table style="width:560px" cellpadding="0" cellspacing="0"><tr><td style="width:69px" valign="top"><![endif]-->
                     <table cellpadding="0" cellspacing="0" class="es-left" align="left" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left">
                       <tr>
                        <td class="es-m-p20b" align="left" style="padding:0;Margin:0;width:69px">
                         <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                           <tr>
                            <td align="center" class="es-m-txt-l" style="padding:0;Margin:0;font-size:0px"><a target="_blank" href="https://viewstripo.email" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:underline;color:#26C6DA;font-size:14px"><img src="https://efxsvyb.stripocdn.email/content/guids/CABINET_dee64413d6f071746857ca8c0f13d696/images/group_118_lFL.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" width="69"></a></td>
                           </tr>
                         </table></td>
                       </tr>
                     </table><!--[if mso]></td><td style="width:20px"></td><td style="width:471px" valign="top"><![endif]-->
                     <table cellpadding="0" cellspacing="0" class="es-right" align="right" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:right">
                       <tr>
                        <td align="left" style="padding:0;Margin:0;width:471px">
                         <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                           <tr>
                            <td align="left" style="padding:0;Margin:0"><h3 style="Margin:0;line-height:34px;mso-line-height-rule:exactly;font-family:Orbitron, sans-serif;font-size:28px;font-style:normal;font-weight:bold;color:#ffffff"><b>Real people. Here to help.</b></h3></td>
                           </tr>
                           <tr>
                            <td align="left" style="padding:0;Margin:0;padding-bottom:5px;padding-top:10px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;color:#ffffff;font-size:14px">Have a question? Please end us an email tektaicontact@gmail.com</p></td>
                           </tr>
                         </table></td>
                       </tr>
                     </table><!--[if mso]></td></tr></table><![endif]--></td>
                   </tr>
                 </table></td>
               </tr>
             </table>
           </tr>
         </table>
        </div>
       </body>
      </html>`,
      };
  
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          res.json({ message: "error sending" });
          console.log(error);
        } else {
          res.status(200).json({
            message: "haw el mail wselek jawk behi erfess",
          });
          User.findOneAndUpdate(
            { email: req.body.email },
            { codeForget: RandomXCode },
            { new: true }
          )
            .then((updatedUser) => {
              console.log(updatedUser); // log the updated user document
            })
            .catch((err) => {
              console.log(err);
            });
        }
      });
    }

    export function VerifNewUser(req, res, next) {
      const { email, codeForget } = req.body;
      if (!email || !codeForget) {
          return res.status(400).json({ error: "Something is missing" });
      } else {
          if (codeForget === codeExpected && codeExpected !== "") {
              // Réinitialiser le code attendu après la vérification réussie
              codeExpected = "";
              return res.status(200).json({ message: "Code has been verified!" });
          } else {
              console.log("Sorry! The code is incorrect!");
              return res.status(402).json({ message: "Sorry! The code is incorrect!" });
          }
      }
  }
  export async function getProfile(req,res){
    const userId= req.auth.userId;
    try {
      const profile= await User.findById(userId);
      return res.status(200).json(profile);
  
    }
    catch (error) {
      return res.status(500).json(error)
    }
  }


  export async function SendCodeForgot(req, res, next) {
    const userMail = await User.findOne({ email: req.body.email.toLowerCase() });
    console.log(userMail);
  
    if (!userMail) {
      res.status(202).json({
        message: "email not found",
      });
    } else {
      var RandomXCode = Math.floor(1000 + Math.random() * 9000);
      console.log(RandomXCode);
      //
  
      var mailOptions = {
        from: "TEKTAI",
        to: req.body.email,
        text: "Forget Password?",
        subject: "Password Reset",
        html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
        <html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
         <head>
          <meta charset="UTF-8">
          <meta content="width=device-width, initial-scale=1" name="viewport">
          <meta name="x-apple-disable-message-reformatting">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta content="telephone=no" name="format-detection">
          <title>New Message</title><!--[if (mso 16)]>
            <style type="text/css">
            a {text-decoration: none;}
            </style>
            <![endif]--><!--[if gte mso 9]><style>sup { font-size: 100% !important; }</style><![endif]--><!--[if gte mso 9]>
        <xml>
            <o:OfficeDocumentSettings>
            <o:AllowPNG></o:AllowPNG>
            <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
        <![endif]--><!--[if !mso]><!-- -->
          <link href="https://fonts.googleapis.com/css2?family=Orbitron&display=swap" rel="stylesheet"><!--<![endif]-->
          <style type="text/css">
        #outlook a {
          padding:0;
        }
        .es-button {
          mso-style-priority:100!important;
          text-decoration:none!important;
        }
        a[x-apple-data-detectors] {
          color:inherit!important;
          text-decoration:none!important;
          font-size:inherit!important;
          font-family:inherit!important;
          font-weight:inherit!important;
          line-height:inherit!important;
        }
        .es-desk-hidden {
          display:none;
          float:left;
          overflow:hidden;
          width:0;
          max-height:0;
          line-height:0;
          mso-hide:all;
        }
        .es-button-border:hover a.es-button, .es-button-border:hover button.es-button {
          background:#58dfec!important;
        }
        .es-button-border:hover {
          border-color:#26C6DA #26C6DA #26C6DA #26C6DA!important;
          background:#58dfec!important;
          border-style:solid solid solid solid!important;
        }
        @media only screen and (max-width:600px) {p, ul li, ol li, a { line-height:150%!important } h1, h2, h3, h1 a, h2 a, h3 a { line-height:120% } h1 { font-size:30px!important; text-align:center } h2 { font-size:24px!important; text-align:left } h3 { font-size:20px!important; text-align:left } .es-header-body h1 a, .es-content-body h1 a, .es-footer-body h1 a { font-size:30px!important; text-align:center } .es-header-body h2 a, .es-content-body h2 a, .es-footer-body h2 a { font-size:24px!important; text-align:left } .es-header-body h3 a, .es-content-body h3 a, .es-footer-body h3 a { font-size:20px!important; text-align:left } .es-menu td a { font-size:14px!important } .es-header-body p, .es-header-body ul li, .es-header-body ol li, .es-header-body a { font-size:14px!important } .es-content-body p, .es-content-body ul li, .es-content-body ol li, .es-content-body a { font-size:14px!important } .es-footer-body p, .es-footer-body ul li, .es-footer-body ol li, .es-footer-body a { font-size:14px!important } .es-infoblock p, .es-infoblock ul li, .es-infoblock ol li, .es-infoblock a { font-size:12px!important } *[class="gmail-fix"] { display:none!important } .es-m-txt-c, .es-m-txt-c h1, .es-m-txt-c h2, .es-m-txt-c h3 { text-align:center!important } .es-m-txt-r, .es-m-txt-r h1, .es-m-txt-r h2, .es-m-txt-r h3 { text-align:right!important } .es-m-txt-l, .es-m-txt-l h1, .es-m-txt-l h2, .es-m-txt-l h3 { text-align:left!important } .es-m-txt-r img, .es-m-txt-c img, .es-m-txt-l img { display:inline!important } .es-button-border { display:inline-block!important } a.es-button, button.es-button { font-size:18px!important; display:inline-block!important } .es-adaptive table, .es-left, .es-right { width:100%!important } .es-content table, .es-header table, .es-footer table, .es-content, .es-footer, .es-header { width:100%!important; max-width:600px!important } .es-adapt-td { display:block!important; width:100%!important } .adapt-img { width:100%!important; height:auto!important } .es-m-p0 { padding:0px!important } .es-m-p0r { padding-right:0px!important } .es-m-p0l { padding-left:0px!important } .es-m-p0t { padding-top:0px!important } .es-m-p0b { padding-bottom:0!important } .es-m-p20b { padding-bottom:20px!important } .es-mobile-hidden, .es-hidden { display:none!important } tr.es-desk-hidden, td.es-desk-hidden, table.es-desk-hidden { width:auto!important; overflow:visible!important; float:none!important; max-height:inherit!important; line-height:inherit!important } tr.es-desk-hidden { display:table-row!important } table.es-desk-hidden { display:table!important } td.es-desk-menu-hidden { display:table-cell!important } .es-menu td { width:1%!important } table.es-table-not-adapt, .esd-block-html table { width:auto!important } table.es-social { display:inline-block!important } table.es-social td { display:inline-block!important } .es-desk-hidden { display:table-row!important; width:auto!important; overflow:visible!important; max-height:inherit!important } }
        @media screen and (max-width:384px) {.mail-message-content { width:414px!important } }
        </style>
         </head>
         <body style="width:100%;font-family:arial, 'helvetica neue', helvetica, sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;padding:0;Margin:0">
          <div dir="ltr" class="es-wrapper-color" lang="en" style="background-color:#07023C"><!--[if gte mso 9]>
              <v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t">
                <v:fill type="tile" color="#07023c"></v:fill>
              </v:background>
            <![endif]-->
           <table class="es-wrapper" width="100%" cellspacing="0" cellpadding="0" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;padding:0;Margin:0;width:100%;height:100%;background-repeat:repeat;background-position:center top;background-color:#07023C">
             <tr>
              <td valign="top" style="padding:0;Margin:0">
               <table class="es-content" cellspacing="0" cellpadding="0" align="center" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
                 <tr>
                  <td align="center" style="padding:0;Margin:0">
                   <table class="es-content-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#ffffff;background-repeat:no-repeat;width:600px;background-image:url(https://efxsvyb.stripocdn.email/content/guids/CABINET_0e8fbb6adcc56c06fbd3358455fdeb41/images/vector_0Ia.png);background-position:center center" cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center" background="https://efxsvyb.stripocdn.email/content/guids/CABINET_0e8fbb6adcc56c06fbd3358455fdeb41/images/vector_0Ia.png" role="none">
                     <tr>
                      <td align="left" style="Margin:0;padding-bottom:10px;padding-top:20px;padding-left:20px;padding-right:20px">
                       <table cellpadding="0" cellspacing="0" width="100%" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                         <tr>
                          <td class="es-m-p0r" valign="top" align="center" style="padding:0;Margin:0;width:560px">
                           <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                             <tr>
                              <td align="center" style="padding:0;Margin:0;font-size:0px"><a target="_blank" href="https://viewstripo.email" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:underline;color:#26C6DA;font-size:14px"><img src="https://efxsvyb.stripocdn.email/content/guids/CABINET_b0acaa6517477956e8f5a273acd40d02be26db03936a3371097894c6a6836992/images/image_20240402_164020011.png" alt="Logo" style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" title="Logo" height="105"></a></td>
                             </tr>
                           </table></td>
                         </tr>
                       </table></td>
                     </tr>
                     <tr>
                      <td align="left" style="Margin:0;padding-left:20px;padding-right:20px;padding-top:30px;padding-bottom:30px">
                       <table width="100%" cellspacing="0" cellpadding="0" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                         <tr>
                          <td class="es-m-p0r es-m-p20b" valign="top" align="center" style="padding:0;Margin:0;width:560px">
                           <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                             <tr>
                              <td align="center" style="padding:0;Margin:0"><h1 style="Margin:0;line-height:53px;mso-line-height-rule:exactly;font-family:Orbitron, sans-serif;font-size:44px;font-style:normal;font-weight:bold;color:#10054D">&nbsp;We got a request to reset your&nbsp;password<br></h1></td>
                             </tr>
                             <tr>
                              <td align="center" style="padding:0;Margin:0;padding-bottom:10px;padding-top:15px;font-size:0px"><a target="_blank" href="https://viewstripo.email" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:underline;color:#26C6DA;font-size:14px"><img class="adapt-img" src="https://efxsvyb.stripocdn.email/content/guids/CABINET_b0acaa6517477956e8f5a273acd40d02be26db03936a3371097894c6a6836992/images/image_20240402_165213543.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" height="300"></a></td>
                             </tr>
                             <tr>
                              <td align="center" style="padding:0;Margin:0;padding-top:10px;padding-bottom:10px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;color:#333333;font-size:14px">&nbsp;Forgot your password? No problem - it happens to everyone!<br></p></td>
                             </tr>
                             <tr>
                             <td align="center" style="padding: 0; Margin: 0; padding-top: 15px; padding-bottom: 15px;">
                             <!-- Génère un carré pour chaque chiffre du code aléatoire -->
                             ${RandomXCode.toString().split('').map((digit) => `
                             <div class="code-container" style="border: 2px solid #26C6DA; border-radius: 10px; width: 40px; height: 40px; display: inline-block; margin-right: 5px; text-align: center; font-size: 20px; font-weight: bold; color: #26C6DA;">${digit}</div>
                             `).join('')}
                           </td>
                                                        </tr>
                             <tr>
                              <td align="center" style="padding:0;Margin:0;padding-top:10px;padding-bottom:10px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;color:#333333;font-size:14px">If you ignore this message, your password won't be changed.</p></td>
                             </tr>
                           </table></td>
                         </tr>
                       </table></td>
                     </tr>
                   </table></td>
                 </tr>
               </table>
               <table cellpadding="0" cellspacing="0" class="es-content" align="center" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;table-layout:fixed !important;width:100%">
                 <tr>
                  <td align="center" style="padding:0;Margin:0">
                   <table bgcolor="#10054D" class="es-content-body" align="center" cellpadding="0" cellspacing="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#10054d;width:600px" role="none">
                     <tr>
                      <td align="left" background="https://efxsvyb.stripocdn.email/content/guids/CABINET_0e8fbb6adcc56c06fbd3358455fdeb41/images/vector_sSY.png" style="Margin:0;padding-left:20px;padding-right:20px;padding-top:35px;padding-bottom:35px;background-image:url(https://efxsvyb.stripocdn.email/content/guids/CABINET_0e8fbb6adcc56c06fbd3358455fdeb41/images/vector_sSY.png);background-repeat:no-repeat;background-position:left center"><!--[if mso]><table style="width:560px" cellpadding="0" cellspacing="0"><tr><td style="width:69px" valign="top"><![endif]-->
                       <table cellpadding="0" cellspacing="0" class="es-left" align="left" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:left">
                         <tr>
                          <td class="es-m-p20b" align="left" style="padding:0;Margin:0;width:69px">
                           <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                             <tr>
                              <td align="center" class="es-m-txt-l" style="padding:0;Margin:0;font-size:0px"><a target="_blank" href="https://viewstripo.email" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:underline;color:#26C6DA;font-size:14px"><img src="https://efxsvyb.stripocdn.email/content/guids/CABINET_dee64413d6f071746857ca8c0f13d696/images/group_118_lFL.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" width="69"></a></td>
                             </tr>
                           </table></td>
                         </tr>
                       </table><!--[if mso]></td><td style="width:20px"></td><td style="width:471px" valign="top"><![endif]-->
                       <table cellpadding="0" cellspacing="0" class="es-right" align="right" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;float:right">
                         <tr>
                          <td align="left" style="padding:0;Margin:0;width:471px">
                           <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                             <tr>
                              <td align="left" style="padding:0;Margin:0"><h3 style="Margin:0;line-height:34px;mso-line-height-rule:exactly;font-family:Orbitron, sans-serif;font-size:28px;font-style:normal;font-weight:bold;color:#ffffff"><b>Real people. Here to help.</b></h3></td>
                             </tr>
                             <tr>
                              <td align="left" style="padding:0;Margin:0;padding-bottom:5px;padding-top:10px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;color:#ffffff;font-size:14px">Have a question? Please end us an email tektaicontact@gmail.com</p></td>
                             </tr>
                           </table></td>
                         </tr>
                       </table><!--[if mso]></td></tr></table><![endif]--></td>
                     </tr>
                   </table></td>
                 </tr>
               </table>
             </tr>
           </table>
          </div>
         </body>
        </html>`,
      };
  
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          res.json({ message: "error sending" });
          console.log(error);
        } else {
          res.status(200).json({
            message: "haw el mail wselek jawk behi erfess",
          });
          User.findOneAndUpdate(
            { email: req.body.email },
            { codeForget: RandomXCode },
            { new: true }
          )
            .then((updatedUser) => {
              console.log(updatedUser); // log the updated user document
            })
            .catch((err) => {
              console.log(err);
            });
        }
      });
    }
  }
  ///////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////
  export async function VerifCodeForgot(req, res, next) {
    const { email, codeForget } = req.body;
    if (!email || !codeForget) {
      return res.status(400).json({ error: "Something is missing" });
    } else {
      const user = await User.findOne({ email: req.body.email });
      console.log(req.body.email);
      console.log("Code enter by the User ==> " + req.body.codeForget);
      console.log("Code ons the Database ==> " + user.codeForget);
      //////////////////////////////////////////////////////
      if (req.body.codeForget == user.codeForget && user.codeForget != "") {
        return res.status(200).json({ message: "Code Has been verified!" });
      }
      //////////////////////////////////////////////////////////
      if (req.body.codeForget != user.codeForget && user.codeForget != "") {
        console.log("Sorry! The code is incorrect!");
        return res.status(402).json({ message: "Sorry! The code is incorrect!" });
      }
      if (user.codeForget == "") {
        return res
          .status(401)
          .json({ message: "Sorry! There is no code in Database!" });
      }
    }
  }
  ///////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////

  export async function exportXls(req, res) {
    try {
      const users = await User.find();
  
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Users');
  
      worksheet.columns = [
        {header : "FirstName", key :"firstname", width : 30},
        {header : "LastName", key :"lastname", width : 30},
        {header : "Phone", key :"phone", width : 14},
        {header : "Email", key :"email", width : 30},
        {header : "Role", key :"role", width : 30}
      ]
  
  users.map((value,idx)=>{
  
    worksheet.addRow({
      firstname: value.firstname,
      lastname: value.lastname,
      phone: value.phone,
      email: value.email,
      role: value.role
    })
  }
  )
  
  
  res.setHeader('Content-Type',
   'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  
   res.setHeader('Content-Disposition',
    'attachment;filename=users.xlsx');
  
  
  
  workbook.xlsx.write(res);
  console.log('Excel file created successfully:');
  
    } catch (error) {
      console.log(error);
    }
  }

  
  
  export async function ChangePasswordForgot(req, res, next) {
    const { email, codeForget, password } = req.body;
    if (!email || !codeForget || !password) {
      return res.status(422).json({ error: "Something is missing" });

    }
  
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      if (codeForget === user.codeForget && user.codeForget !== "") {
        // Hash the new password
        bcrypt.hash(password, 10, async (err, hash) => {
          if (err) {
            return res.status(400).json({ error: "Error hashing password" });
          }
          // Update user's password and clear codeForget
          user.password = hash;
          user.codeForget = "";
          await user.save();
  
          // Generate access token
          const accessToken = await signAccessToken(user.id);
          // Generate refresh token
          const refreshToken = await signRefreshToken(user.id);
  
          return res.status(200).json({
            message: "Password changed successfully",
            accessToken,
            refreshToken,
            role: user.role,
          });
        });
      } else {
        return res.status(402).json({ message: "Incorrect code" });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  export async function VerifyAnswers(req, res, next) {
    try {
      const { email, questions } = req.body;
  
      const user = await User.findOne({ email: email.toLowerCase() });
  
      if (!user) {
        return res.status(202).json({
          message: "email not found",
        });
      }
  
      // Récupération des réponses aux questions de sécurité enregistrées pour cet utilisateur
      const securityQuestions = user.securityQuestions;
  
      // Vérification que les réponses fournies par l'utilisateur correspondent à celles enregistrées dans la base de données
      const isAnswersMatch = securityQuestions.every((question, index) => {
        // Comparaison insensible à la casse des réponses
        return question === questions[index];
      });
  
      if (isAnswersMatch) {
        // Réponses correctes
        return res.status(200).json({
          message: "Réponses correctes aux questions de sécurité",
        });
      } else {
        // Réponses incorrectes
        return res.status(401).json({
          message: "Réponses incorrectes aux questions de sécurité",
        });
      }
    } catch (error) {
      console.error("Erreur lors de la vérification des réponses:", error);
      return res.status(500).json({
        message: "Erreur lors de la vérification des réponses",
        error: error,
      });
    }
  }




  export async function getUserHistory(req, res) {
    try {
      const userId = req.auth.userId; // Récupérer l'ID de l'utilisateur connecté
  
      // Vérifier si l'ID de l'utilisateur connecté est valide
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
  
      // Rechercher l'utilisateur dans la base de données
      const user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Renvoyer l'historique de l'utilisateur
      return res.status(200).json({ history: user.history });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error retrieving user history', error });
    }
  }

  export async function deleteSpecificHistory(req, res) {
    try {
      const userId = req.auth.userId; // Récupérer l'ID de l'utilisateur connecté
      const { historyId } = req.params; // Récupérer l'ID de l'entrée d'historique à supprimer
  
      const user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      const index = user.history.findIndex(item => item._id.toString() === historyId); // Trouver l'index de l'entrée d'historique à supprimer
  
      if (index === -1) {
        return res.status(404).json({ message: 'History entry not found' });
      }
  
      user.history.splice(index, 1); // Supprimer l'entrée d'historique à l'index trouvé
  
      await user.save();
  
      return res.status(200).json({ message: 'History entry deleted successfully' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error deleting history entry', error });
    }
  }
  
   export async function getRole(req, res) {
    try {
        const { role } = req.auth; // Récupérer le rôle de l'utilisateur connecté

        // Renvoyer le rôle dans la réponse
        return res.status(200).json({ role });
    } catch (error) {
        console.error('Erreur lors de la récupération du rôle de l\'utilisateur :', error);
        return res.status(500).json({ message: 'Erreur serveur lors de la récupération du rôle de l\'utilisateur' });
    }
}
export async function getOtherUserHistory(req, res) {
  try {
    const { role, userId: currentUserId } = req.auth; // Récupérer le rôle et l'ID de l'utilisateur connecté (superAdmin)
    const { userId } = req.params; // Récupérer l'ID de l'utilisateur à consulter

    if (role !== 'superAdmin') {
      return res.status(403).json({ message: 'Action non autorisée' });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Ajouter l'action de consultation à l'historique de l'utilisateur qui effectue la consultation
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ message: 'Utilisateur actuel non trouvé' });
    }

    currentUser.history.push({ 
      action: `Vous avez consulté l'historique de l'utilisateur : ${user.firstname} ${user.lastname} (ID: ${userId})`, 
      timestamp: new Date() 
    });

    await currentUser.save();

    return res.status(200).json(user.history);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique de l\'utilisateur :', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'historique de l\'utilisateur' });
  }
}

export async function countTotalChallengers(req, res)  {
  try {
    const count = await User.countDocuments({ role: 'challenger' });
    res.json({ count: count });
  } catch (error) {
    console.error('Erreur lors du comptage des utilisateurs avec le rôle "challenger"', error);
    res.status(500).json({ error: 'Erreur lors du comptage des utilisateurs avec le rôle "challenger"' });
  }
};

export async function countTotalCompanies (req, res){
  try {
    const count = await User.countDocuments({ role: 'company' });
    res.json({ count: count });
  } catch (error) {
    console.error('Erreur lors du comptage des utilisateurs avec le rôle "company"', error);
    res.status(500).json({ error: 'Erreur lors du comptage des utilisateurs avec le rôle "company"' });
  }
};



