const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');


const ratingSchema = mongoose.Schema({
  userId: { type: String, required: true },
  grade: { type: Number, required: true }
});


const bookSchema = mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
  imageUrl: { type: String, required: true },
  year: { type: Number, required: true },
  genre: { type: String, required: true },
  ratings: [ratingSchema],
  averageRating: { type: Number, required: true }
});


bookSchema.index({ 'ratings.userId': 1 }, { unique: true });

module.exports = mongoose.model('Book', bookSchema);

