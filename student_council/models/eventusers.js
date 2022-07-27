const mongoose = require('mongoose');
const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
    },
    event: {
      type: String,
    },
    phonenumber: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);
const EventUsers = mongoose.model('EventUser', eventSchema);
module.exports = EventUsers;
