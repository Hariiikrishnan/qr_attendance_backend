const mongoose = require("mongoose");
const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  facultyId: { type: String, required: true, index: true },

  isAudi: {
    type: Boolean,
    default: false,
  },

  classId: {
    type: String,
    required: function () {
      return !this.isAudi;
    },
  },

  className: {
    type: String,
    required: function () {
      return !this.isAudi;
    },
  },

  hourNumber: {
    type: Number,
    min: 1,
    max: 8,
    required: function () {
      return !this.isAudi;
    },
  },

  blockName: {
    type: String,
    required: true,
  },

  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },

  radius: { type: Number, default: 50 },

  state: { type: String, default: "S" },

  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
}, { timestamps: true });



sessionSchema.index({ sessionId: 1 });
module.exports = mongoose.model("Session", sessionSchema);
