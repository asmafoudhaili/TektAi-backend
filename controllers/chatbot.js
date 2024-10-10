// Importer les modules nécessaires
import express from 'express';
import bodyParser from 'body-parser';
import natural from 'natural';
// Initialiser l'application Express

// Configurer le middleware pour parser le corps des requêtes en JSON

// Créer un tokenizer
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;

// Définir les intents et leurs exemples et solutions
const intents = {
    'general_inquiry': {
        examples: [
            "What services do you offer?",
            "How can your platform help my company?",
            "What solutions do you provide for businesses?"
        ],
        solution: "We offer a range of data-driven solutions tailored to your business needs."
    },
    'solution_recommendation': {
        examples: [
            "Can you recommend data-driven solutions for marketing analysis?",
            "I need help with customer segmentation. What solutions do you suggest?",
            "Do you have any recommendations for optimizing supply chain management?"
        ],
        solution: "For solution recommendation, we provide tailored data-driven solutions based on your specific requirements."
    },
    'greetings': {
        examples: [
            "Hi ",
            "Hi there!",
            "Hello!",
            "Hey!",
            "Good morning!",
            "Good afternoon!",
            "Good evening!",
            "Hi, how are you?",
            "Hello, how are you doing?",
            "Hey, what's up?",
            "Hi, what's new?",
            "Hello, how's it going?",
            "Hey, how's your day?",
            "Hi, how have you been?",
            "Hello, how's everything?",
            "Hey, how's life treating you?",
            "Hi, how's your week going?",
            "Hello, any exciting plans for today?",
            "Hey, how's the weather where you are?",
            "Hi, did you have a good weekend?",
            "Hello, how was your day?",
            "Hey, how was your week?",
        ],
        solution: "Hello! I'm here to assist you. How can I help you today?"
    },
    
    

};

// Prétraitement du texte
function preprocess(text) {
    return tokenizer.tokenize(text.toLowerCase()).filter(token => token.match(/^[a-zA-Z0-9]+$/));
}

// Fonction pour obtenir la réponse basée sur l'entrée de l'utilisateur
function getResponse(userInput) {
    // Preprocess user input
    const preprocessedInput = preprocess(userInput);

    // Check if the input matches any known greetings
    if (isGreeting(preprocessedInput)) {
        return "Hello! How can I assist you today?";
    }
    
   else  if (handleDataSecurity(preprocessedInput)) {
        return "Data privacy measures: Encryption, consent, and minimal data collection.";
    }

    // Use TF-IDF for other types of questions
    const userTokens = preprocess(userInput);
    const tfidf = new TfIdf();

    for (const intent in intents) {
        for (const example of intents[intent].examples) {
            tfidf.addDocument(preprocess(example));
        }
    }

    const maxSimilarity = { intent: null, score: -Infinity };

    tfidf.tfidfs(userTokens, (i, measure) => {
        if (measure > maxSimilarity.score) {
            maxSimilarity.intent = Object.keys(intents)[i];
            maxSimilarity.score = measure;
        }
    });

    if (maxSimilarity.score > 0.3) {
        return intents[maxSimilarity.intent].solution;
    } else {
        return "I'm sorry, I didn't understand that.";
    }
}

// Function to check if the input is a greeting
function isGreeting(tokens) {
    const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];
    for (const token of tokens) {
        if (greetings.includes(token)) {
            return true;
        }
    }
    return false;
}
function isguidance(tokens) {
    console.log("Tokens:", tokens); // Debugging log
    
    const guidance = [
        'How', 'do', 'I', 'navigate', 'the', 'platform?',
        'Can', 'you', 'show', 'me', 'how', 'to', 'find', 'what', 'Im', 'looking', 'for?',
        'Where', 'can', 'I', 'access', 'different', 'features?'
    ];
    
    // Check if any token matches a navigation example
    for (const token of tokens) {
        if (guidance.includes(token)) {
            return true;
        }
    }
    
    // If no match found, return false
    return false;
}









function handleDataSecurity(tokens) {
    const securityQuestions = [
        "how do you ensure the privacy of our data?",
        "what measures do you take to protect sensitive information?",
        "can you provide details about your data security practices?",
        "how is user data encrypted?",
        "do you perform regular security audits?",
        "what protocols do you have in place for data breach incidents?",
        "how do you handle access control and user permissions?",
        "are there any certifications or compliance standards you adhere to?",
        "what steps do you take to prevent unauthorized access?",
        "how do you handle data deletion requests?",
        "what is your disaster recovery plan for data loss situations?",
        "privacy"
    ];    for (const token of tokens) {
        if (securityQuestions.includes(token)) {
            return true;
        }
    }
    return false;
}

// Route pour recevoir la question de l'utilisateur et renvoyer la réponse
export async function CHAT(req, res) {
    try {
        const userQuestion = req.body.question;
console.log(userQuestion)
        // Call the getResponse function
        const response = await getResponse(userQuestion);

        // Send the response back to the client
        res.json({ response });
    } catch (error) {
        // Handle errors gracefully
        console.error('An error occurred:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Servir le frontend (remplacer 'public' par le chemin de votre répertoire frontend)

// Démarrez le serveur sur le port spécifié
;
