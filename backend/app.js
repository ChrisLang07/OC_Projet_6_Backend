const express = require('express');
const mongoose = require('mongoose');
const booksRoutes = require('./routes/books.js');
const userRoutes = require('./routes/user');



// Connexion à MongoDB avec Mongoose (inutile d'utiliser MongoClient ici)
mongoose.connect('mongodb+srv://chrisOne:kkwhGMi7Ejo6KNOd@cluster0.xfu4p.mongodb.net/monvieuxgrimoire?retryWrites=true&w=majority&appName=Cluster0', {
  connectTimeoutMS: 10000, // Timeout pour la connexion
  socketTimeoutMS: 45000   // Timeout pour les requêtes
})
.then(() => console.log('Connexion à MongoDB réussie !'))
.catch(err => console.error('Erreur de connexion à MongoDB :', err));

const app = express(); // Création d'une application Express

app.use(express.json()); // Pour analyser les requêtes JSON

// Configuration des en-têtes CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    next();
});

app.use('/api/books', booksRoutes);
app.use('/api/auth', userRoutes);

module.exports = app;
