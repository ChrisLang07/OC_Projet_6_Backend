const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const Book = require("../models/book");
const { v4: uuidv4 } = require("uuid");

exports.getAllBooks = (req, res, next) => {
  Book.find()
    .then((books) => {
      res.status(200).json(books);
    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};

exports.createBook = (req, res, next) => {
  const bookObject = JSON.parse(req.body.book);
  delete bookObject._id;
  delete bookObject._userId;

  // Chemins pour les fichiers temporaires et optimisés
  const tempImagePath = req.file.path; // Chemin temporaire de l'image téléchargée
  const optimizedFilename = `${uuidv4()}.webp`; // Nom de fichier unique pour l'image optimisée
  const optimizedImagePath = path.join(__dirname, '../images', optimizedFilename); // Chemin pour l'image optimisée

  // Optimiser l'image avec Sharp
  sharp(tempImagePath)
    .resize({ width: 800 }) // Redimensionner à une largeur de 800px
    .webp({ quality: 80 }) // Convertir en WebP avec une qualité de 80
    .toFile(optimizedImagePath, (err, info) => {
      if (err) {
        console.error("Erreur lors de l'optimisation de l'image :", err);
        return res.status(500).json({
          error: "Erreur lors de l'optimisation de l'image.",
          details: err.message,
        });
      }

      // Après l'optimisation, créer l'objet du livre
      const book = new Book({
        ...bookObject,
        userId: req.auth.userId,
        imageUrl: `${req.protocol}://${req.get("host")}/images/${optimizedFilename}`, // URL de l'image optimisée
      });

      // Sauvegarder le livre dans la base de données
      book
        .save()
        .then(() => {
          // Une fois l'enregistrement terminé, on peut supprimer l'image temporaire
          fs.unlink(tempImagePath, (unlinkErr) => {
            if (unlinkErr) {
              console.error("Erreur lors de la suppression de l'image temporaire :", unlinkErr);
            }
          });

          res.status(201).json({ message: "Objet enregistré et image optimisée !" });
        })
        .catch((error) => {
          res.status(400).json({ error });
        });
    });
};


exports.getOneBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then((book) => res.status(200).json(book))
    .catch((error) => res.status(404).json({ error }));
};

exports.updateBook = (req, res, next) => {
  const bookId = req.params.id;

  // Vérifier si un nouveau fichier image est envoyé avec la requête
  const newBookObject = req.file
    ? {
        ...JSON.parse(req.body.book),
        imageUrl: `${req.protocol}://${req.get("host")}/images/${
          req.file.filename
        }`,
      }
    : { ...req.body };

  // Récupérer l'ancien livre pour supprimer l'image précédente si une nouvelle image est fournie
  Book.findById(bookId)
    .then((book) => {
      if (!book) {
        return res.status(404).json({ message: "Livre non trouvé !" });
      }

      // Si une nouvelle image est téléchargée
      if (req.file) {
        const oldFilename = book.imageUrl.split("/images/")[1];
        const oldImagePath = path.join(__dirname, "../images", oldFilename);

        // Supprimer l'ancienne image
        fs.unlink(oldImagePath, (err) => {
          if (err) {
            console.log(
              "Erreur lors de la suppression de l'ancienne image:",
              err
            );
          }
        });

        // Chemins pour les fichiers temporaires
        const tempImagePath = req.file.path;
        const tempOptimizedImagePath = path.join(
          __dirname,
          "../images",
          `${uuidv4()}.webp`
        ); // Chemin pour l'image optimisée

        // Optimiser la nouvelle image avec Sharp
        sharp(tempImagePath)
          .resize({ width: 800 }) // Redimensionner à une largeur de 800px
          .webp({ quality: 80 }) // Convertir en WebP avec une qualité de 80
          .toFile(tempOptimizedImagePath, (err, info) => {
            if (err) {
              console.error("Erreur lors de l'optimisation de l'image :", err);
              return res
                .status(500)
                .json({
                  error: "Erreur lors de l'optimisation de l'image.",
                  details: err.message,
                });
            }
            // Déplacer l'image optimisée à son emplacement final
            const finalImagePath = path.join(
              __dirname,
              "../images",
              req.file.filename
            );
            fs.rename(tempOptimizedImagePath, finalImagePath, (err) => {
              if (err) {
                console.error(
                  "Erreur lors du déplacement de l'image optimisée :",
                  err
                );
                return res
                  .status(500)
                  .json({
                    error: "Erreur lors du déplacement de l'image optimisée.",
                    details: err.message,
                  });
              }

              // Mettre à jour le livre avec les nouvelles informations
              Book.updateOne({ _id: bookId }, { ...newBookObject, _id: bookId })
                .then(() =>
                  res
                    .status(200)
                    .json({ message: "Livre modifié avec succès !" })
                )
                .catch((error) => res.status(400).json({ error }));
            });
          });
      } else {
        // Si aucune nouvelle image n'est fournie, juste mettre à jour le livre
        Book.updateOne({ _id: bookId }, { ...newBookObject, _id: bookId })
          .then(() =>
            res.status(200).json({ message: "Livre modifié avec succès !" })
          )
          .catch((error) => res.status(400).json({ error }));
      }
    })
    .catch((error) =>
      res
        .status(500)
        .json({
          error: "Erreur lors de la récupération du livre.",
          details: error,
        })
    );
};

exports.deleteBook = (req, res, next) => {
  const bookId = req.params.id;
  
  Book.findById(bookId)
    .then((book) => {
      if (!book) {
        return res.status(404).json({ message: "Livre non trouvé !" });
      }

      const filename = book.imageUrl.split("/images/")[1];
      const imagePath = path.join(__dirname, "../images", filename); // chemin absolu de l'image

      fs.unlink(imagePath, (err) => {
        if (err) {
          return res
            .status(500)
            .json({
              error: "Erreur lors de la suppression de l'image.",
              details: err,
            });
        }

        Book.deleteOne({ _id: bookId })
          .then(() =>
            res.status(200).json({ message: "Livre et image supprimés !" })
          )
          .catch((error) =>
            res
              .status(500)
              .json({
                error: "Erreur lors de la suppression du livre.",
                details: error,
              })
          );
      });
    })
    .catch((error) =>
      res
        .status(500)
        .json({
          error: "Erreur lors de la récupération du livre.",
          details: error,
        })
    );
};

exports.rateBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then((book) => {
      const userId = req.auth.userId;

      const existingRatingIndex = book.ratings.findIndex(
        (rating) => rating.userId.toString() === userId.toString()
      );

      if (existingRatingIndex !== -1) {
        return res.status(400).json({ error: "Vous avez déjà noté ce livre." });
      }

      book.ratings.push({ userId: req.auth.userId, grade: req.body.rating });

      const totalRatings = book.ratings.length;
      const totalGrades = book.ratings.reduce(
        (sum, rating) => sum + rating.grade,
        0
      );
      const rawAverageRating = totalGrades / totalRatings;

      const newAverageRating = Math.round(rawAverageRating * 2) / 2;

      book.averageRating = newAverageRating;

      return book.save();
    })
    .then((updatedBook) => {
      res.status(200).json(updatedBook);
    })
    .catch((error) => {
      res.status(404).json({ error });
    });
};

exports.getTopRatedBooks = (req, res, next) => {
  Book.find() // Récupère tous les livres
    .sort({ averageRating: -1 }) // Trie les livres par 'averageRating' en ordre décroissant (du plus grand au plus petit)
    .limit(3) // Limite les résultats à 3 livres
    .then((books) => {
      res.status(200).json(books); // Retourne les 3 livres ayant la meilleure note moyenne
    })
    .catch((error) => {
      res.status(400).json({ error }); // En cas d'erreur
    });
};
