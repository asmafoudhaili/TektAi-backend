import Team from "../models/team.js"
import Challenge from "../models/challenge.js";
import nodemailer from 'nodemailer';
import User from "../models/user.js";
import { io } from '../server.js'; 
import { createNotification } from "./notification.js";



const createTeam = async (req, res) => {
  try {
    console.log("Received request to create team:", req.body);
    const { teamname, members, challengeId } = req.body;

    // Vérifier si le nom de l'équipe est présent dans la requête
    if (!teamname) {
      console.error('Please enter the team name');
      return res.status(400).json({ success: false, message: 'Please enter the team name' });
    }

    // Vérifier si l'ID du défi est présent dans la requête
    if (!challengeId) {
      console.error('Please provide the challenge ID');
      return res.status(400).json({ success: false, message: 'Please provide the challenge ID' });
    }

    // Vérifier si l'utilisateur est un participant dans le défi spécifié
    const challenge = await Challenge.findById(challengeId);
    if (!challenge || !challenge.participants.includes(req.auth.userId)) {
      console.log("Unauthorized access: User not a participant in the challenge");
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Vérifier si l'utilisateur a déjà créé une équipe pour ce défi
    const existingTeam = await Team.findOne({ createdBy: req.auth.userId, challenge: challengeId });
    if (existingTeam) {
      console.log("User has already created a team for this challenge");
      return res.status(400).json({ success: false, message: 'You can only create one team for this challenge' });
    }

    // Vérifier si le nombre maximal d'équipes n'est pas dépassé
    const teamCount = await Team.countDocuments({ challenge: challengeId });
    if (challenge.maxTeams <= teamCount) {
      console.log("Maximum teams reached for this challenge");
      return res.status(400).json({ success: false, message: 'Maximum teams reached for this challenge' });
    }

    // Vérifier si team est true
    if (!challenge.team) {
      console.log("Team creation is not allowed for this challenge");
      return res.status(400).json({ success: false, message: 'Team creation is not allowed for this challenge' });
    }

    // Initialiser members comme une liste vide si elle n'est pas présente dans la requête
    const teamMembers = members || [];

    // Créer une nouvelle équipe et ajouter l'utilisateur en tant que membre et créateur de l'équipe
    const team = new Team({ teamname, members: teamMembers, createdBy: req.auth.userId, challenge: challengeId });
    await team.save();
    console.log("Team created successfully:", team);

    // Vérifier si le nombre de membres de l'équipe dépasse la limite maximale
    if (teamMembers.length > challenge.maxTeamMembers) {
      console.log("Number of team members exceeds the maximum limit");
      await Team.findByIdAndDelete(team._id); // Supprimer l'équipe créée car elle dépasse la limite de membres
      return res.status(400).json({ success: false, message: `Maximum team members limit exceeded (${challenge.maxTeamMembers})` });
    }

    // Mettre à jour le défi pour inclure l'ID de la nouvelle équipe créée
    challenge.teams.push(team._id);
    challenge.teamCreated = true; // Mettre à jour la propriété teamCreated du défi
    console.log(challenge.teamCreated);
    await challenge.save();

    res.status(201).json({ success: true, data: team });
  } catch (error) {
    console.error("Error creating team:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
// const getTeamsByUserId = async (req, res) => {
//   try {
//     const userId = req.params.userId;
//     const teamsCreatedByUser = await Team.find({ createdBy: userId }).populate('members').populate('createdBy');
//     const teamsWithUserAsMember = await Team.find({ members: userId }).populate('members').populate('createdBy');
    
//     const allTeams = [...teamsCreatedByUser, ...teamsWithUserAsMember]; // Merge the two arrays
    
//     res.status(200).json(allTeams);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };
const deleteTeam = async (req, res) => {
  try {
    const { userId, challengeId } = req.params;

    // Vérifier si les identifiants de l'utilisateur et du défi sont présents dans la requête
    if (!userId || !challengeId) {
      console.error('Please provide user ID and challenge ID');
      return res.status(400).json({ success: false, message: 'Please provide user ID and challenge ID' });
    }

    // Vérifier si l'équipe existe pour l'utilisateur et le défi spécifiés
    const team = await Team.findOne({ createdBy: userId, challenge: challengeId });
    if (!team) {
      console.error('Team not found');
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Supprimer l'équipe
    await team.remove();

    // Mettre à jour le défi pour supprimer l'ID de l'équipe supprimée
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      console.error('Challenge not found');
      return res.status(404).json({ success: false, message: 'Challenge not found' });
    }

    challenge.teams.pull(team._id);
    challenge.teamCreated = false; // Mettre à jour la propriété teamCreated du défi
    await challenge.save();

    res.status(200).json({ success: true, message: 'Team deleted successfully' });
  } catch (error) {
    console.error("Error deleting team:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: "tektaicontact@gmail.com",
    pass: "fvuzgaepgwbfidnz",
  },
});
export const sendInvitationEmail = async (emails, teamId, challengeId) => {
  try {
    console.log("Received request to send invitation emails:", emails);
    console.log("Received request to send invitation teamId:", teamId);
    console.log("Received request to send invitation challengeId:", challengeId);
    //const { emails, teamId, challengeId } = req.body;

    // Obtenir les détails du challenge depuis la base de données en utilisant l'ID du challenge
    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
      console.error('Challenge not found');
      return res.status(404).json({ success: false, message: 'Challenge not found' });
    }
    const team = await Team.findById(teamId).populate('createdBy');

    if (!team) {
      console.error('Team not found');
      return {
        status: 400,
        data: { success: false, message: 'Team not found' }
      }
      //return res.status(404).json({ success: false, message: 'Team not found' });
    }
    // Générer un lien spécifique au challenge
    const challengeLink = `http://localhost:3000/ChallengeDetails/${challengeId}`;

    // Envoyer les invitations aux e-mails spécifiés
    for (const email of emails) {
      // Vérifier si l'e-mail existe déjà dans la base de données
      const userExists = await User.exists({ email });
      const challengeTitle = challenge.title;
      const teamName = team.teamname;
      const creator = team.createdBy;
      const creatorName = `${creator.firstname} ${creator.lastname}`;

      // Contenu de l'e-mail avec le lien spécifique au challenge
      const htmlContent = `
      <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
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
                                    <td align="center" style="padding:0;Margin:0"><h1 style="Margin:0;line-height:43px;mso-line-height-rule:exactly;font-family:Orbitron, sans-serif;font-size:36px;font-style:normal;font-weight:bold;color:#10054D">Invitation to collaborate as part of ${teamName}.</h1></td>
                                   </tr>
                                   <tr>
                                    <td align="center" style="padding:0;Margin:0;padding-bottom:10px;padding-top:15px;font-size:0px"><a target="_blank" href="https://viewstripo.email" style="-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;text-decoration:underline;color:#26C6DA;font-size:14px"><img class="adapt-img" src="https://efxsvyb.stripocdn.email/content/guids/CABINET_b0acaa6517477956e8f5a273acd40d02be26db03936a3371097894c6a6836992/images/image_20240402_164914150.png" alt style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic" height="300"></a></td>
                                   </tr>
                                   <tr>
                                    <td align="center" style="padding:0;Margin:0;padding-top:10px;padding-bottom:10px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:'trebuchet ms', 'lucida grande', 'lucida sans unicode', 'lucida sans', tahoma, sans-serif;line-height:24px;color:#333333;font-size:16px">${creatorName} would like you to collaborate with ${teamName}<br></p></td>
                                   </tr>
                                   <tr>
                                   <td align="center" style="padding: 0; Margin: 0; padding-top: 15px; padding-bottom: 15px;">
                                   <span class="es-button-border" style="border-style: solid; border-color: #26C6DA; background: #26C6DA; border-width: 4px; display: inline-block; border-radius: 10px; width: auto;">
  <a href="${challengeLink}" class="es-button" target="_blank" style="mso-style-priority: 100 !important; text-decoration: none; -webkit-text-size-adjust: none; -ms-text-size-adjust: none; mso-line-height-rule: exactly; color: #FFFFFF; font-size: 20px; padding: 10px 25px 10px 30px; display: inline-block; background: #26C6DA; border-radius: 10px; font-family: arial, 'helvetica neue', helvetica, sans-serif; font-weight: normal; font-style: normal; line-height: 24px; width: auto; text-align: center; mso-padding-alt: 0; mso-border-alt: 10px solid #26C6DA;">
    Challenge Link
  </a>
</span>

                                 </td>
                                                                    </tr>
                                   <tr>
                                    <td align="center" style="padding:0;Margin:0;padding-top:10px;padding-bottom:10px"><p style="Margin:0;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:21px;color:#333333;font-size:14px">If you were not expecting this invitation, you can ignore this email.</p></td>
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
              </html>
      `;

      // Envoyer l'e-mail en fonction de l'existence de l'utilisateur
      const mailOptions = {
        from: "TEKTAI",
        to: email,
        subject: `Invitation to collaborate on challenge "${challengeTitle}"`,
        html: htmlContent,
      };

      await transporter.sendMail(mailOptions);
    }


    // Envoyer une réponse réussie
    return {
      status: 200,
      data: { success: true, message: 'Invitation emails sent successfully' }
    }
    //res.status(200).json({ success: true, message: 'Invitation emails sent successfully' });
  } catch (error) {
    console.error('Error sending invitation emails:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};






export {createTeam,deleteTeam}; 