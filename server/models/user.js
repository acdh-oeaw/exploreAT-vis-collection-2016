const mongoose = require('mongoose');

// define the User model schema
const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        index: { unique: true }
    },
    about: String,
    password: String
});

/**
 * Compare the passed password with the value in the database. A model method.
 *
 * @param {string} password
 * @param {function} callback
 * @returns {object}
 */
UserSchema.methods.comparePassword = function comparePassword(password, callback) {
    bcrypt.compare(password, this.password, callback);
};

module.exports = mongoose.model('User', UserSchema);
