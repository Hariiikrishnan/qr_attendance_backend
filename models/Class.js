const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    classId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    className: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    facultyIds: {
      type: [String],
      required: true,
      default: [],
    },

    facultyNames: {
      type: [String],
      default: [],
    },

    totalStudents: {
      type: Number,
      required: true,
      min: 0,
    },

    excelFileName: {
      type: String,
      required: true,
    },

    createdBy: {
      type: String, // facultyId who created the class
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt automatically
  }
);

module.exports = mongoose.model("Class", classSchema);
