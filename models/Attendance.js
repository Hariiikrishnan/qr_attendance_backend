const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  sessionId: String,
  studentId: String,
  startScanTime: Date,
  endScanTime: Date,
  deviceId: String,
  status: {
    type: String,
    enum: ["INCOMPLETE", "PRESENT"],
    default: "INCOMPLETE"
  }
});

attendanceSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });
attendanceSchema.index({ studentId: 1 });
module.exports = mongoose.model("Attendance", attendanceSchema);
