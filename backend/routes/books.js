const express = require('express');
const router = express.Router();
const bookCtrl = require('../controllers/books');
const auth = require('../middleware/auth');

// Récupérer tous les livres
router.get("/", bookCtrl.getAllBooks);
  
// Ajouter un nouveau livre
router.post('/', auth, bookCtrl.createBook);
  
 // Récupérer un livre spécifique
router.get('/:id', auth, bookCtrl.getOneBook);
  
// Modifier un livre
router.put('/:id',auth, bookCtrl.updateBook);
  
// Supprimer un livre
router.delete('/:id',auth, bookCtrl.deleteBook);
  
module.exports = router;