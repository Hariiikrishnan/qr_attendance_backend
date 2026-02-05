const express = require("express");
const Session = require("../models/Session");
const Attendance = require("../models/Attendance");
const { verifyPayload ,verifyOnce} = require("../utils/qr");
const { distanceMeters } = require("../utils/geo");
const rateLimit = require("express-rate-limit");

const router = express.Router();

/* ------------------------- Helpers ------------------------- */
function error(res, status, message, code) {
  return res.status(status).json({
    success: false,
    message,
    errorCode: code,
  });
}


router.use("/scan", rateLimit({
  windowMs: 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_, res) => {
    return res.status(429).json({
      success: false,
      message: "Too many scans, slow down",
      errorCode: "RATE_LIMITED",
    });
  },
}));

/* -------------------- Scan QR -------------------- */

router.post("/scan", async (req, res) => {
  console.log("Hitting");
  try {
    console.log("But not here");
    const { payload, signature, studentId, deviceId, location } = req.body;


    // ---------------- BASIC VALIDATION ----------------
    // if (!payload || !signature || !studentId || !deviceId || !location) {
    //   return error(res, 400, "Missing required scan data", "MISSING_SCAN_DATA");
    // }

    // if (location.lat == null || location.lng == null) {
    //   return error(res, 400, "Invalid location data", "INVALID_LOCATION");
    // }

    // ---------------- QR VALIDATION ----------------
   let isValidQR;
    try {
      isValidQR = verifyPayload(payload, signature);
    } catch (e) {
      console.error("verifyOnce error:", e);
      return error(res, 400, "Invalid QR", "INVALID_QR_CODE");
    }


    if (!isValidQR) {
      return error(res, 400, "Invalid or tampered QR code", "INVALID_QR");
    }

    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      return error(res, 410, "QR code has expired", "QR_EXPIRED");
    }

    // ---------------- SESSION ----------------
    const session = await Session.findOne({ sessionId: payload.sessionId });
    if (!session) {
      return error(res, 404, "Session not found", "SESSION_NOT_FOUND");
    }

    if (session.state === "CLOSED") {
      return error(res, 403, "Session already closed", "SESSION_CLOSED");
    }

    const dist = distanceMeters(
      payload.location.lat, payload.location.lng,
      location.lat, location.lng,
    );
    
    if (dist > payload.location.radius){
      return error(res, 403, "Outside Block", "OUTSIDE");
      // return res.status(403).send("Outside auditorium");
    }

    // ---------------- SCAN TYPE ----------------
    // if (!["START_ACTIVE", "END_ACTIVE"].includes(payload.type)) {
    //   return error(res, 400, "Invalid scan type", "INVALID_SCAN_TYPE");
    // }

    // ---------------- ATTENDANCE RECORD ----------------
    // let record = await Attendance.findOne({
    //   sessionId: payload.sessionId,
    //   studentId,
    // });

    // if (!record) {
    //   record = await Attendance.create({
    //     sessionId: payload.sessionId,
    //     studentId,
    //     deviceId,
    //     status: "INCOMPLETE",
    //   });
    // }

    let update = {};
let setOnInsert = {
  sessionId: payload.sessionId,
  studentId,
  deviceId,
};

// ---------------- START SCAN ----------------
if (payload.type === "START_ACTIVE") {
  const existing = await Attendance.findOne({
    sessionId: payload.sessionId,
    studentId,
  });

  if (existing?.startScanTime) {
    return error(
      res,
      409,
      "Start attendance already marked",
      "START_ALREADY_MARKED"
    );
  }

  update.startScanTime = new Date();
  update.status = "INCOMPLETE";
}

// ---------------- END SCAN ----------------
if (payload.type === "END_ACTIVE") {
  const existing = await Attendance.findOne({
    sessionId: payload.sessionId,
    studentId,
  });

  if (!existing?.startScanTime) {
    return error(
      res,
      409,
      "Start attendance not marked yet",
      "START_NOT_MARKED"
    );
  }

  if (existing.endScanTime) {
    return error(
      res,
      409,
      "End attendance already marked",
      "END_ALREADY_MARKED"
    );
  }

  update.endScanTime = new Date();
  update.status = "PRESENT";
}

// ✅ single atomic write — no conflicts
const record = await Attendance.findOneAndUpdate(
  { sessionId: payload.sessionId, studentId },
  {
    $setOnInsert: setOnInsert,
    $set: update,
  },
  { new: true, upsert: true }
);



    // ---------------- SUCCESS ----------------
    return res.status(200).json({
      success: true,
      message: "Attendance recorded successfully",
      data: record,
    });
  } catch (err) {
    console.error("QR Scan error:", err);

    return error(
      res,
      500,
      "Failed to process QR scan",
      "SCAN_FAILED"
    );
  }
});


/* -------------------- Student Attendance History -------------------- */
router.get("/attendance/all/:regNo", async (req, res) => {
  try {
    const records = await Attendance.find({
      studentId: req.params.regNo,
    }).sort({ createdAt: -1 });

    if (!records.length) {
      return res.json({
        success: true,
        message: "No attendance records found",
        data: [],
      });
    }

    return res.json({
      success: true,
      message: "Attendance history fetched",
      data: records,
    });
  } catch (err) {
    console.error("Fetch attendance error:", err);
    return error(
      res,
      500,
      "Failed to fetch attendance history",
      "FETCH_ATTENDANCE_FAILED"
    );
  }
});

module.exports = router;
