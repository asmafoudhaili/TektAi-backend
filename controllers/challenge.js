import Challenge from '../models/challenge.js';
import team from '../models/team.js' ; 
import User from '../models/user.js';
import fs from 'fs';
import path from 'path';
import moment from 'moment';
import archiver from 'archiver'; // Assurez-vous d'avoir installé le module 'archiver'

const createChallenge = async (req, res) => {
  try {
      //console.log("User object from request:", req.auth); // Ajoutez ce log pour vérifier le contenu de req.user

      // Get user role from the database using userId
      const user = await User.findById(req.auth.userId);
      if (!user || user.role !== 'company') {
          return res.status(403).json({ message: 'Forbidden: Only companies can create challenges' });
      }

      // Create a new challenge with data from the request body
      const challenge = new Challenge(req.body);

      // Set the createdBy field to the company's ID
      challenge.createdBy = req.auth.userId; // Store only the userID
      
      if (req.file) {
        const imagePath = req.file.path; // Chemin de l'image téléchargée
        req.body.imgChallenge = imagePath; // Associer le chemin de l'image au champ imgChallenge du défi
      }
      // Si un fichier Excel est téléchargé, associez-le au défi
      if (req.file) {
        const excelFilePath = req.file.path;
        challenge.dataset = excelFilePath; // Associer le chemin du fichier Excel au défi
      }

    

      // Save the challenge to the database
      await challenge.save();
 
      // Return the created challenge
      res.status(201).json(challenge);
  } catch (error) {
      console.error('Error creating challenge:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
};


  

  export async function generatePrivateLinkAndSendEmail(req, res) {
    try {
      //console.log("Received request to generate private link and send emails:", req.body);
      const { userId, challengeId } = req.auth; // Receive the company ID and challenge ID from the request
  
      // Get the company details from the database using the company ID
      const company = await Company.findById(userId);
  
      if (!company) {
        console.error('Company not found');
        return res.status(404).json({ success: false, message: 'Company not found' });
      }
  
      // Get the challenge details from the database using the challenge ID
      const challenge = await Challenge.findById(challengeId);
  
      if (!challenge) {
        console.error('Challenge not found');
        return res.status(404).json({ success: false, message: 'Challenge not found' });
      }
  
      // Generate a unique private link for the challenge (you can use any method to generate a unique link)
      const privateLink = generateUniqueLink(challengeId);
  
      // Send an email to the company with the private link
      const htmlContent = `<p>You have created a private challenge. Here is the link to share:</p><p><a href="${privateLink}">${privateLink}</a></p>`;
      const mailOptions = {
        from: "TEKTAI <tektaicontact@gmail.com>",
        to: company.email,
        subject: `Your private challenge link`,
        html: htmlContent,
      };
      await transporter.sendMail(mailOptions);
  
      // Send a successful response
      res.status(200).json({ success: true, message: 'Private link generated and email sent successfully' });
    } catch (error) {
      console.error('Error generating private link and sending email:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };
  
  // Function to generate a unique private link
  export function generateUniqueLink(challengeId) {
    const randomString = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    return `https://yourapp.com/private/challenge/${challengeId}/${randomString}`;
  };
  
  const getAllChallenges = async (req, res) => {
    try {
        let challenges = await Challenge.find({}).populate({
            path: 'createdBy',
            select: 'firstname'
        }).populate({
            path: 'participants',
            select: '_id'
        }).populate({
            path: 'teams',
            select: '_id'
        });

        const transformedChallenges = challenges.map(challenge => {
            const transformedChallenge = {
                _id: challenge._id,
                title: challenge.title,
                description: challenge.description,
                evaluationmetric: challenge.evaluationmetric,
                submissionfiledescription: challenge.submissionfiledescription,
                startDate: challenge.startDate,
                endDate: challenge.endDate,
                participantsCount: challenge.participants.length,
                teamsCount: challenge.teams.length,
                teamCreated: challenge.teamCreated,
                prizes: challenge.prizes,
                imgChallenge: challenge.imgChallenge,
                rankingMode: challenge.rankingMode,
                ispublic: challenge.ispublic,
                isprivate: challenge.isprivate,
                solo: challenge.solo,
                maxParticipants: challenge.maxParticipants,
                team: challenge.team,
                maxTeams: challenge.maxTeams,
                maxTeamMembers: challenge.maxTeamMembers,
                presentation: challenge.presentation,
                output: challenge.output,
                codeSource: challenge.codeSource,
                dataset: challenge.dataset,
                rapport: challenge.rapport,
                demo: challenge.demo,
                createdBy: challenge.createdBy,
                createdByFirstName: challenge.createdBy,
                problematic: challenge.problematic,
                monetaryPrize: challenge.monetaryPrize,
                isMonetaryAmount: challenge.isMonetaryAmount,
                otherGiftDetails: challenge.otherGiftDetails,
                isUnmonetaryAmount: challenge.isUnmonetaryAmount,
                internship: challenge.internship,
                internshipDetails: challenge.internshipDetails,
                jobOffer: challenge.jobOffer,
                jobOfferDetails: challenge.jobOfferDetails,
                freelanceOpportunity: challenge.freelanceOpportunity,
                freelanceDetails: challenge.freelanceDetails,
                otherGift: challenge.otherGift,
                solutions: challenge.solutions,
                comments: challenge.comments,
            };
            if (challenge.createdBy) {
              transformedChallenge.createdByFirstName = challenge.createdBy.firstname;
          }
            return transformedChallenge;
        });

        //console.log("Challenges:", transformedChallenges);
        res.json(transformedChallenges);
    } catch (error) {
        console.error('Error getting challenges:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


  
  
const getChallengeById = async (req, res) => {
  try {
      const challengeId = req.params.challengeId;
      let challenge = await Challenge.findById(challengeId).populate({
          path: 'createdBy',
          select: 'firstname'
      }).populate({
          path: 'participants',
          select: '_id'
      }).populate({
          path: 'teams',
          select: '_id'
      });

      if (!challenge) {
          return res.status(404).json({ message: 'Challenge not found' });
      }

      const transformedChallenge = {
          _id: challenge._id,
          title: challenge.title,
          description: challenge.description,
          evaluationmetric: challenge.evaluationmetric,
          submissionfiledescription: challenge.submissionfiledescription,
          startDate: challenge.startDate,
          endDate: challenge.endDate,
          participantsCount: challenge.participants.length,
          teamsCount: challenge.teams.length,
          teamCreated: challenge.teamCreated,
          prizes: challenge.prizes,
          imgChallenge: challenge.imgChallenge,
          rankingMode: challenge.rankingMode,
          ispublic: challenge.ispublic,
          isprivate: challenge.isprivate,
          solo: challenge.solo,
          maxParticipants: challenge.maxParticipants,
          team: challenge.team,
          maxTeams: challenge.maxTeams,
          maxTeamMembers: challenge.maxTeamMembers,
          presentation: challenge.presentation,
          output: challenge.output,
          codeSource: challenge.codeSource,
          dataset: challenge.dataset,
          rapport: challenge.rapport,
          demo: challenge.demo,
          createdBy: challenge.createdBy,
          createdByFirstName: challenge.createdBy.firstname,
          problematic: challenge.problematic,
          monetaryPrize: challenge.monetaryPrize,
          isMonetaryAmount: challenge.isMonetaryAmount,
          otherGiftDetails: challenge.otherGiftDetails,
          isUnmonetaryAmount: challenge.isUnmonetaryAmount,
          internship: challenge.internship,
          internshipDetails: challenge.internshipDetails,
          jobOffer: challenge.jobOffer,
          jobOfferDetails: challenge.jobOfferDetails,
          freelanceOpportunity: challenge.freelanceOpportunity,
          freelanceDetails: challenge.freelanceDetails,
          otherGift: challenge.otherGift,
          solutions: challenge.solutions,
          comments: challenge.comments,
      };

      //console.log("Challenge:", transformedChallenge);
      res.json(transformedChallenge);
  } catch (error) {
      console.error('Error getting challenge by ID:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
};


  

const getAllTeamsForChallenge = async (req, res) => {
    try {
      const { challengeId } = req.params;
      const challenge = await Challenge.findById(challengeId).populate('teams');
      const teams = challenge.teams;
      //console.log('Teams fetched for challenge:', teams);
      res.status(200).json({ success: true, data: teams });
    } catch (error) {
      console.error('Error fetching teams for challenge:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };
// Update a challenge by ID
const updateChallenge = async (req, res) => {
    try {
      // Ensure only the company can update challenges
      if (req.auth.role !== 'company') {
        return res.status(403).json({ message: 'Forbidden: Only companies can update challenges' });
      }
  
      // Find the challenge by ID
      const challenge = await Challenge.findById(req.params.id);
  
      // Check if the challenge exists
      if (!challenge) {
        return res.status(404).json({ message: 'Challenge not found' });
      }
  
      // Update the challenge with data from the request body
      Object.assign(challenge, req.body);
  
      // Save the updated challenge
      await challenge.save();
  
      // Return the updated challenge
      res.json(challenge);
    } catch (error) {
      console.error('Error updating challenge:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
};

// Delete a challenge by ID
const deleteChallenge = async (req, res) => {
    try {
      // Ensure only the company can delete challenges
      if (req.auth.role !== 'company') {
        return res.status(403).json({ message: 'Forbidden: Only companies can delete challenges' });
      }
  
      // Find the challenge by ID and delete it
      const deletedChallenge = await Challenge.findByIdAndDelete(req.params.id);
  
      // Check if the challenge exists
      if (!deletedChallenge) {
        return res.status(404).json({ message: 'Challenge not found' });
      }
  
      // Return the deleted challenge
      res.json(deletedChallenge);
    } catch (error) {
      console.error('Error deleting challenge:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
};


export async function getChallengesByCompanyId(req, res) {
    try {
      const companyId = req.params.companyId;
  
      // Vérifier si req.auth est défini et a la propriété 'role'
      if (!req.auth || !req.auth.role) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
  
      const { role } = req.auth;
  
      // Vérifier le rôle pour l'autorisation
      if (role !== 'company' && role !== 'superAdmin') {
        return res.status(403).json({ message: 'Unauthorized action' });
      }
  
      // Récupérer les challenges créés par l'entreprise spécifiée
      const challenges = await Challenge.find({ createdBy: companyId });
  
      return res.status(200).json({ challenges });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching challenges by company ID', error: error.message });
    }
  }
  
  export async function getParticipantsInCompanyChallenges(req, res) {
    try {
      const companyId = req.params.companyId;
  
      // Vérifier si req.auth est défini et a la propriété 'role'
      if (!req.auth || !req.auth.role) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
  
      const { role } = req.auth;
  
      // Vérifier si l'utilisateur est une company ou superAdmin
      if (role !== 'company' && role !== 'superAdmin') {
        return res.status(403).json({ message: 'Unauthorized action' });
      }
  
      // Récupérer les challenges créés par l'entreprise spécifiée avec les participants
      const challenges = await Challenge.find({ createdBy: companyId }).populate('participants', 'firstname lastname');
  
      let participantsWithChallenges = [];
  
      challenges.forEach(challenge => {
        challenge.participants.forEach(participant => {
          participantsWithChallenges.push({
            participant: participant.firstname + ' ' + participant.lastname,
            challengeTitle: challenge.title
          });
        });
      });
  
      return res.status(200).json({ participantsWithChallenges });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching participants in company challenges', error });
    }
  }
  

const downloadExcelFile = async (req, res) => {
    try {
        const challengeId = req.params.challengeId;
        const userId = req.user.userId;

        // Vérifier si l'utilisateur est un participant du défi
        const challenge = await Challenge.findById(challengeId);
        if (!challenge) {
            return res.status(404).json({ message: 'Challenge not found' });
        }

        const isParticipant = challenge.participants.includes(userId);
        if (!isParticipant) {
            return res.status(403).json({ message: 'Forbidden: Only participants can download the file' });
        }

        // Récupérer le chemin du fichier Excel
        const excelFilePath = path.join(__dirname, 'uploads', challenge.dataset);

        // Vérifier si le fichier existe
        if (!fs.existsSync(excelFilePath)) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Télécharger le fichier
        res.download(excelFilePath);
    } catch (error) {
        console.error('Error downloading Excel file:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


// Fonction pour participer à un défi
const participateChallenge = async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
  
    try {
      // Recherchez le défi par ID
      const challenge = await Challenge.findById(id);
  
      if (!challenge) {
        return res.status(404).json({ message: 'Challenge not found' });
      }
  
      // Ajoutez l'ID de l'utilisateur à la liste des participants
      challenge.participants.push(userId);
      //console.log(userId); 
  
      // Enregistrez les modifications
      await challenge.save();
  
      res.status(200).json({ message: 'Successfully participated in challenge', challenge });
    } catch (error) {
      console.error('Error participating in challenge:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  

  const addSolutionToChallenge = async (req, res) => {
    try {
        const challengeId  = req.params.challengeId;
        const filePath = req.file.path;
        //console.log("req.params:",req.params.challengeId)
        //console.log("req.body:",req.body)
        //console.log("req.file.path",req.file.path)

        const userId= req.auth.userId;
        //console.log("userId",userId)

        const challenge = await Challenge.findById(challengeId);
        if (!challenge) {
            return res.status(404).json({ message: 'Défi non trouvé' });
        }

        let solutionExists = false;
     

        for (const solution of challenge.solutions) {
            if (solution && solution.participant && solution.participant.toString() === userId) {
                solution.file.push(filePath);
                solutionExists = true;
                break;
            }
        }

        if (!solutionExists) {
            challenge.solutions.push({
                participant: userId,
                file: [filePath]
            });
        }

        await challenge.save();





        res.status(201).json({ message: 'Solution ajoutée avec succès au défi' });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la solution au défi:', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
};






////////python 
const addSolutionToChallengePython = async (req, res) => {
    try {
        const { challengeId } = req.params;
        const { userId } = req.body;
        
        // Vérifier si un fichier a été téléchargé
        if (!req.file) {
            return res.status(400).json({ message: 'Erreur : aucun fichier téléchargé' });
        }

        const filePath = req.file.path;

        // Vérifier si le fichier est de type Python
        const filetypes = /py/;
        const mimetype = filetypes.test(req.file.mimetype);
        const extname = filetypes.test(path.extname(req.file.originalname).toLowerCase());
        if (!mimetype || !extname) {
            return res.status(400).json({ message: 'Erreur : le fichier doit être de type Python' });
        }

        // Vérifier si le défi existe
        const challenge = await Challenge.findById(challengeId);
        if (!challenge) {
            return res.status(404).json({ message: 'Défi non trouvé' });
        }

        // Ajouter la solution au défi
        challenge.solutions.push({ participant: userId, file: filePath });

        // Sauvegarder les modifications
        await challenge.save();

        res.status(201).json({ message: 'Solution ajoutée avec succès au défi' });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la solution au défi:', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
};





const countParticipantsByChallenge = async (req, res) => {
    try {
        // Extraire l'identifiant de la société à partir des paramètres de la requête
        const { companyId } = req.params;
        
        // Recherche des challenges associés à la société spécifiée
        const challenges = await Challenge.find({ createdBy: companyId });

        // Créer un tableau pour stocker les résultats
        const participantCounts = [];

        // Itérer sur chaque challenge pour compter le nombre de participants
        for (const challenge of challenges) {
            // Compter le nombre de participants pour le challenge actuel
            const participantCount = challenge.participants.length;

            // Ajouter les détails du challenge et le nombre de participants au tableau de résultats
            participantCounts.push(
                
                 participantCount
            );
        }

        // Répondre avec le tableau contenant les détails des challenges et le nombre de participants
        res.json(participantCounts);
    } catch (error) {
        // En cas d'erreur, renvoyer une réponse d'erreur interne du serveur
        console.error(error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
};





const ChallengesInCompany = async (req, res) => {
    try {
        const { companyId } = req.params;
        
        // Recherche des challenges associés à la société spécifiée
        const challenges = await Challenge.find({ createdBy: companyId });

        // Créer un tableau pour stocker les résultats
        const challengeTitles = [];

        // Itérer sur chaque challenge pour récupérer les titres
        for (const challenge of challenges) {
            // Ajouter le titre du challenge au tableau de résultats
            challengeTitles.push(challenge.title);
        }

        // Répondre avec le tableau contenant les titres des challenges
        res.json(challengeTitles);
    } catch (error) {
        // En cas d'erreur, renvoyer une réponse d'erreur interne du serveur
        console.error(error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
};






////////////temps restant
const countTimeRemaining = async (req, res) => {
    try {
        const { challengeId } = req.params;
        
        // Rechercher le défi dans la base de données
        const challenge = await Challenge.findById(challengeId);
        if (!challenge) {
            return res.status(404).json({ message: 'Défi non trouvé' });
        }

        // Convertir les dates en objets Moment
        const currentMoment = moment();
        const endMoment = moment(challenge.endDate);

        // Calculer la différence de temps entre endDate et startDate en secondes
        const durationInSeconds = endMoment.diff(currentMoment, 'seconds');

        // Envoyer la réponse avec uniquement le nombre total de secondes
        res.status(200).json(durationInSeconds);
    } catch (error) {
        console.error('Erreur lors du calcul du temps restant du défi :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
};




//////////////////time

const calculateRemainingTime = (startDate, endDate) => {
    const currentTime = new Date();
    const remainingTimeInSeconds = (endDate - currentTime) / 1000; // Convertir en secondes
    return Math.max(remainingTimeInSeconds, 0); // Assurez-vous que le temps restant est toujours positif
};
/////////////////////////Commentaires

const addCommentToChallenge = async (req, res) => {
    console.log("authhhh",req.auth.userId)

    try {  
        const challengeId  = req.params.challengeId;
        const   {content}  = req.body;
//console.log("add",content)
//console.log("challengeId",challengeId)

const userId= req.auth.userId;

        // Recherche de l'utilisateur dans la base de données pour obtenir son nom
        const user = await User.findById( userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        // Recherche du défi dans la base de données
        const challenge = await Challenge.findById(challengeId);
        if (!challenge) {
            return res.status(404).json({ message: 'Défi non trouvé' });
        }

        // Création du nouveau commentaire avec le nom de l'utilisateur
        const newComment = {
            userId: userId,
            userName: user.firstname, // Utilisation du nom de l'utilisateur trouvé dans la base de données
            content: content
        };

        // Ajout du nouveau commentaire au tableau de commentaires du défi
        challenge.comments.push(newComment);

        // Sauvegarde du défi mis à jour dans la base de données
        await challenge.save();

        res.status(201).json({ message: 'Commentaire ajouté avec succès', comment: newComment });
    } catch (error) {
        console.error('Erreur lors de l\'ajout du commentaire au défi :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
};






   const deleteComment = async (req, res) => {
      try {
        const { challengeId, commentId } = req.params;
        // Vérifier si le commentaire existe dans le challenge
        const challenge = await Challenge.findById(challengeId);
        if (!challenge) {
          return res.status(404).json({ message: 'Challenge not found' });
        }
  
        // Trouver le commentaire dans la liste des commentaires du challenge
        const commentIndex = challenge.comments.findIndex(comment => comment._id == commentId);
        if (commentIndex === -1) {
          return res.status(404).json({ message: 'Comment not found in challenge' });
        }
  
        // Vérifier si l'utilisateur est autorisé à supprimer ce commentaire
        if (challenge.comments[commentIndex].userId !== userId) {
          return res.status(403).json({ message: 'Unauthorized to delete this comment' });
        }
  
        // Supprimer le commentaire du challenge
        challenge.comments.splice(commentIndex, 1);
        await challenge.save();
  
        res.status(200).json({ message: 'Comment deleted successfully' });
      } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    };


    const getAllCommentsForChallenge = async (req, res) => {
        try {
            const { challengeId } = req.params;
            
            // Rechercher le défi dans la base de données
            const challenge = await Challenge.findById(challengeId);
            if (!challenge) {
                return res.status(404).json({ message: 'Défi non trouvé' });
            }
    
            // Récupérer tous les commentaires associés au défi
            const comments = challenge.comments;
    
            res.status(200).json({ comments });
        } catch (error) {
            console.error('Erreur lors de la récupération des commentaires du défi :', error);
            res.status(500).json({ message: 'Erreur interne du serveur' });
        }
    };

    const getTrueProperties = async (req, res) => {
      const trueAttributes = [];
      const { challengeId } = req.params;
      const challenge = await Challenge.findById(challengeId);


      if (challenge.presentation=== true) {
  trueAttributes.push('presentation');
}
if (challenge.output === true) {
  trueAttributes.push('output');
}
if (challenge.codeSource === true) {
  trueAttributes.push('codeSource');
}
if (challenge.dataset === true) {
  trueAttributes.push('dataset');
}
if (challenge.rapport === true) {
  trueAttributes.push('rapport');
}
if (challenge.demo === true) {
  trueAttributes.push('demo');
}

return trueAttributes;
  }

 const addScoreToChallenge = async (req, res) => {
    try {
        const challengeId = req.params.challengeId;
        const userId = req.auth.userId;
        console.log("userId", userId);
        const score = req.body.score; // Supposant que req.body.score est déjà un float
        console.log("req.params:", req.params.challengeId);
        console.log("req.body:", req.body);
        console.log("Score:", score);

        

        const challenge = await Challenge.findById(challengeId);
        if (!challenge) {
            return res.status(404).json({ message: 'Défi non trouvé' });
        }

        let solutionExists = false;

        for (const solution of challenge.solutions) {
            if (solution && solution.participant && solution.participant.toString() === userId) {
                solution.score = score; // la valeur de score (float)
                solutionExists = true;
                break;
            }
        }

        if (!solutionExists) {
            challenge.solutions.push({
                participant: userId,
                score: [score] // Initialise le tableau avec la valeur de score (float)
            });
        }

        await challenge.save();

        res.status(201).json({ message: 'Score ajouté avec succès au défi' });
    } catch (error) {
        console.error('Erreur lors de l\'ajout du score au défi :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
};


export async function getScoresForChallenge(req, res) {
  const { challengeId } = req.params;

  try {
    // Récupérer le challenge avec les participants et leurs scores ainsi que les détails des participants
    const challenge = await Challenge.findById(challengeId)
      .populate({
        path: 'solutions.participant',
        select: 'firstname lastname ',
      })
      .populate('solutions', 'score'); // Populate les scores seulement

    if (!challenge) {
      throw new Error('Challenge non trouvé');
    }

    // Extraire les scores des participants avec leur nom complet et image
    const scoresWithDetails = challenge.solutions.map(solution => ({
      fullName: `${solution.participant.firstname} ${solution.participant.lastname}`,
      // imageUser: solution.participant.imageUser,
      score: solution.score || 0 // Si le score est null, mettre 0 par défaut
    }));

    // Trier les scores du plus grand au plus petit
    scoresWithDetails.sort((a, b) => b.score - a.score);

    res.status(200).json(scoresWithDetails); // Envoyer les scores triés en tant que réponse JSON avec les noms complets des participants
  } catch (error) {
    // Gérer les erreurs
    console.error('Erreur lors de la récupération des scores :', error.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des scores' });
  }
}

function convertPathForDownload(filePath) {
  // Remplacer les antislash par des slash
  const correctedPath = filePath.replace(/\\/g, '/');
  console.log("Chemin converti pour le téléchargement :", correctedPath); // Log du chemin corrigé
  return correctedPath;
}
// Fonction pour vérifier si le fichier existe
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function getUploadsDirectory() {
  return 'C:\\Users\\HP\\Desktop\\TEKTAI\\'; // Chemin absolu du dossier uploads
}

export async function downloadFile(req, res) {
  const { filePath } = req.params; // Chemin du fichier à télécharger
  const absolutePath = path.join(getUploadsDirectory(), filePath);
  console.log("absolutePath:",absolutePath);

  try {
    console.log("Tentative de téléchargement du fichier :", filePath);

    // Vérifier si le fichier existe
    if (!fileExists(absolutePath)) {
      throw new Error('Le fichier n\'existe pas.');
    }

    // Télécharger le fichier
    res.download(absolutePath, (err) => {
      if (err) {
        console.error("Erreur lors du téléchargement du fichier :", err);
        res.status(500).json({ message: 'Une erreur est survenue lors du téléchargement du fichier' });
      } else {
        console.log("Téléchargement réussi :", filePath);
      }
    });

  } catch (error) {
    console.error("Erreur lors du téléchargement du fichier :", error.message);
    res.status(500).json({ message: error.message });
  }
}
export async function getFiles(req, res) {
  const { challengeId } = req.params;
  try {
    let participantsDetails = []; // Tableau pour stocker les détails des participants

    // Obtenir les détails du challenge avec les solutions et les participants
    const challenge = await Challenge.findById(challengeId)
      .populate({
        path: 'solutions',
        populate: {
          path: 'participant',
          select: 'firstname lastname', // Sélectionner les champs nécessaires
        },
        select: 'file', // Sélectionner uniquement les fichiers
      });

    if (!challenge) {
      throw new Error('Challenge non trouvé');
    }

// Parcourir les solutions pour chaque participant
for (const solution of challenge.solutions) {
  if (solution.participant && solution.file.length > 0) {
    // Générer les liens de téléchargement pour chaque fichier du participant
    const participantFiles = solution.file.map(file => {
      const filePath = file.trim().replace(/\\/g, '/'); // Supprimer les espaces et remplacer les antislash par des slash
      return {
        name: file,
        downloadLink: `/challenge/downloadFile/${encodeURIComponent(filePath)}`
      };
    });
    
    // Ajouter les détails du participant avec les liens de téléchargement
    participantsDetails.push({
      participant: `${solution.participant.firstname} ${solution.participant.lastname}`,
      files: participantFiles
    });
  }
}

    console.log("Détails des participants et des fichiers récupérés avec succès :", participantsDetails);

    // Envoyer la réponse avec les détails des participants et des fichiers
    res.status(200).json({ participants: participantsDetails, message: "Tous les fichiers ont été récupérés avec succès." });

  } catch (error) {
    console.error("Erreur lors de la récupération des fichiers :", error.message);
    res.status(500).json({ message: 'Une erreur est survenue lors de la récupération des fichiers' });
  }
}


  const getChallengeOutputValue = async (req, res) => {
      try {
          const { challengeId } = req.params;
          const challenge = await Challenge.findById(challengeId);
  
          // Vérifie si le défi a été trouvé
          if (!challenge) {
              throw new Error('Défi non trouvé');
          }
  
          // Retourne la valeur de output du défi
          return res.json({ outputValue: challenge.output });
      } catch (error) {
          return res.status(500).json({ error: `Erreur lors de la récupération de la valeur de 'output' du défi : ${error.message}` });
      }
  };

  const getChallengepresentationValue = async (req, res) => {
      try {
          const { challengeId } = req.params;
          const challenge = await Challenge.findById(challengeId);
  
          // Vérifie si le défi a été trouvé
          if (!challenge) {
              throw new Error('Défi non trouvé');
          }
  
          // Retourne la valeur de output du défi
          return res.json({ presentationValue: challenge.presentation });
      } catch (error) {
          return res.status(500).json({ error: `Erreur lors de la récupération de la valeur de 'output' du défi : ${error.message}` });
      }
  };

  const getChallengecodeSourceValue = async (req, res) => {
      try {
          const { challengeId } = req.params;
          const challenge = await Challenge.findById(challengeId);
  
          // Vérifie si le défi a été trouvé
          if (!challenge) {
              throw new Error('Défi non trouvé');
          }
  
          // Retourne la valeur de output du défi
          return res.json({ codeSourceValue: challenge.codeSource });
      } catch (error) {
          return res.status(500).json({ error: `Erreur lors de la récupération de la valeur de 'output' du défi : ${error.message}` });
      }
  };

  const getChallengedatasetValue = async (req, res) => {
      try {
          const { challengeId } = req.params;
          const challenge = await Challenge.findById(challengeId);
  
          // Vérifie si le défi a été trouvé
          if (!challenge) {
              throw new Error('Défi non trouvé');
          }
  
          // Retourne la valeur de output du défi
          return res.json({ datasetValue: challenge.dataset });
      } catch (error) {
          return res.status(500).json({ error: `Erreur lors de la récupération de la valeur de 'output' du défi : ${error.message}` });
      }
  };


  const getChallengerapportValue = async (req, res) => {
      try {
          const { challengeId } = req.params;
          const challenge = await Challenge.findById(challengeId);
  
          // Vérifie si le défi a été trouvé
          if (!challenge) {
              throw new Error('Défi non trouvé');
          }
  
          // Retourne la valeur de output du défi
          return res.json({ rapportValue: challenge.rapport });
      } catch (error) {
          return res.status(500).json({ error: `Erreur lors de la récupération de la valeur de 'output' du défi : ${error.message}` });
      }
  };



  const getChallengedemoValue = async (req, res) => {
      try {
          const { challengeId } = req.params;
          const challenge = await Challenge.findById(challengeId);
  
          // Vérifie si le défi a été trouvé
          if (!challenge) {
              throw new Error('Défi non trouvé');
          }
  
          // Retourne la valeur de output du défi
          return res.json({ demoValue: challenge.demo });
      } catch (error) {
          return res.status(500).json({ error: `Erreur lors de la récupération de la valeur de 'output' du défi : ${error.message}` });
      }
  };

  


export {downloadExcelFile,addScoreToChallenge,getChallengeById,participateChallenge,getChallengedemoValue,getChallengerapportValue,getChallengedatasetValue,getChallengecodeSourceValue,getChallengepresentationValue,getChallengeOutputValue,getTrueProperties,ChallengesInCompany, calculateRemainingTime,countTimeRemaining,countParticipantsByChallenge ,addSolutionToChallenge ,addSolutionToChallengePython, createChallenge, getAllChallenges, updateChallenge, deleteChallenge,addCommentToChallenge,getAllCommentsForChallenge,getAllTeamsForChallenge  };