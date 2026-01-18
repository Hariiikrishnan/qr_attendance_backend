const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  sessionId: String,
  facultyId: String,
  location: {
    lat: Number,
    lng: Number
  },
  audi:String,
  radius: Number,
  state: {
    type: String,
    enum: ["START_ACTIVE", "END_ACTIVE", "CLOSED"],
    default: "START_ACTIVE"
  },
  startTime: Date,
  endTime: Date
});

module.exports = mongoose.model("Session", sessionSchema);
