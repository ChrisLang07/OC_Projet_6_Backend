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

  
  const tempImagePath = req.file.path; 
  const optimizedFilename = `${uuidv4()}.webp`; 
  const optimizedImagePath = path.join(__dirname, '../images', optimizedFilename);

 
  sharp(tempImagePath)
    .resize({ width: 800 }) 
    .webp({ quality: 80 }) 
    .toFile(optimizedImagePath, (err, info) => {
      if (err) {
        console.error("Erreur lors de l'optimisation de l'image :", err);
        return res.status(500).json({
          error: "Erreur lors de l'optimisation de l'image.",
          details: err.message,
        });
      }

      const book = new Book({
        ...bookObject,
        userId: req.auth.userId,
        imageUrl: `${req.protocol}://${req.get("host")}/images/${optimizedFilename}`, // URL de l'image optimisée
      });
      book
        .save()
        .then(() => {
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
  const userId = req.userId;

    const newBookObject = req.file
    ? {
        ...JSON.parse(req.body.book),
        imageUrl: `${req.protocol}://${req.get("host")}/images/${
          req.file.filename
        }`,
      }
    : { ...req.body };

    Book.findById(bookId)
    .then((book) => {
      if (!book) {
        return res.status(404).json({ message: "Livre non trouvé !" });
      }

      if (book.userId.toString() !== userId) {
        return res.status(403).json({ message: "Accès refusé. Vous n'êtes pas autorisé à modifier ce livre." });
      }

      if (req.file) {
        const oldFilename = book.imageUrl.split("/images/")[1];
        const oldImagePath = path.join(__dirname, "../images", oldFilename);

                fs.unlink(oldImagePath, (err) => {
          if (err) {
            console.log(
              "Erreur lors de la suppression de l'ancienne image:",
              err
            );
          }
        });

        const tempImagePath = req.file.path;
        const tempOptimizedImagePath = path.join(
          __dirname,
          "../images",
          `${uuidv4()}.webp`
        );

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
  const userId = req.userId;
  
  Book.findById(bookId)
    .then((book) => {
      if (!book) {
        return res.status(404).json({ message: "Livre non trouvé !" });
      }

      if (book.userId.toString() !== userId) {
        return res.status(403).json({ message: "Accès refusé. Vous n'êtes pas autorisé à supprimer ce livre." });
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
  Book.find()
    .sort({ averageRating: -1 }) 
    .limit(3) 
    .then((books) => {
      res.status(200).json(books); 
    })
    .catch((error) => {
      res.status(400).json({ error }); 
    });
};
