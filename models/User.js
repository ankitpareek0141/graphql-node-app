const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
    },
    createdEvents: [{
        type: mongoose.Schema.ObjectId,
        ref: "event"
    }]
});

module.exports = mongoose.model("user", userSchema);