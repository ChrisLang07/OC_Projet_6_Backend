const express = require('express');
const router = express.Router();
const bookCtrl = require('../controllers/books');
const auth = require('../middleware/auth');
const multer = require('../middleware/multer-config');

// Récupérer les 3 meilleurs livres (statique, doit être avant)
router.get('/bestrating', auth, bookCtrl.getTopRatedBooks);

// Récupérer tous les livres
router.get("/", auth, bookCtrl.getAllBooks);

// Ajouter un nouveau livre
router.post('/', auth, multer, bookCtrl.createBook);

// Noter un livre
router.post('/:id/rating', auth, bookCtrl.rateBook);

// Récupérer un livre spécifique (dynamique, après les routes statiques)
router.get('/:id', auth, bookCtrl.getOneBook);

// Modifier un livre
router.put('/:id', auth, multer, bookCtrl.updateBook);

// Supprimer un livre
router.delete('/:id', auth, bookCtrl.deleteBook);

module.exports = router;
