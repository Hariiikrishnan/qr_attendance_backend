const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },

    facultyId: {
      type: String,
      required: true,
      index: true,
    },

    classId: {
      type: String,
      required: true,
    },

    className: {
      type: String,
      required: true,
    },

    blockName: {
      type: String,
      required: true,
    },

    hourNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },

    location: {
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
    },

    radius: {
      type: Number,
      default: 50, // meters
    },

    state: {
      type: String,
      enum: ["START_ACTIVE", "END_ACTIVE", "CLOSED"],
      default: "START_ACTIVE",
    },

    startTime: {
      type: Date,
      default: Date.now,
    },

    endTime: {
      type: Date,
    },
  },
  {
    timestamps: true, // createdAt & updatedAt
  }
);

sessionSchema.index({ sessionId: 1 });
module.exports = mongoose.model("Session", sessionSchema);
