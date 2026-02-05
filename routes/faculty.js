const express = require("express");
const Session = require("../models/Session");
const Attendance = require("../models/Attendance");
const { signPayload } = require("../utils/qr");

const router = express.Router();

/* ------------------------- Helpers ------------------------- */
function formatDate() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${dd}_${mm}`;
}

function error(res, status, message, code) {
  return res.status(status).json({
    success: false,
    message,
    errorCode: code,
  });
}

/* -------------------- Start Session -------------------- */
router.post("/session/start", async (req, res) => {
  try {
    const {
      facultyId,
      classId,
      className,
      blockName,
      hourNumber,
      location,
    } = req.body;

    if (
      !facultyId ||
      !classId ||
      !className ||
      !blockName ||
      !hourNumber ||
      !location?.lat ||
      !location?.lng
    ) {
      return error(
        res,
        400,
        "Missing required session details",
        "MISSING_FIELDS"
      );
    }

    const sessionId = `${className}_H${hourNumber}_${formatDate()}`;

    const existing = await Session.findOne({ sessionId });
    if (existing) {
      return error(
        res,
        409,
        "Session already exists for this hour",
        "SESSION_ALREADY_EXISTS"
      );
    }

    const session = await Session.create({
      sessionId,
      facultyId,
      classId,
      className,
      blockName,
      hourNumber,
      location,
      radius: 100,
      startTime: new Date(),
      state: "START_ACTIVE",
    });

    return res.status(201).json({
      success: true,
      message: "Session started successfully",
      data: session,
    });
  } catch (err) {
    console.error("Session start error:", err);
    return error(
      res,
      500,
      "Unable to start session",
      "SESSION_START_FAILED"
    );
  }
});

/* -------------------- Generate QR -------------------- */
router.post("/session/qr", async (req, res) => {
  try {
    const { sessionId, type, qrExpirySeconds } = req.body;

    if (!sessionId || !type) {
      return error(
        res,
        400,
        "sessionId and type are required",
        "INVALID_QR_REQUEST"
      );
    }

    if (!["START_ACTIVE", "END_ACTIVE"].includes(type)) {
      return error(
        res,
        400,
        "Invalid QR type",
        "INVALID_QR_TYPE"
      );
    }

    const session = await Session.findOne({ sessionId });
    if (!session) {
      return error(
        res,
        404,
        "Session not found",
        "SESSION_NOT_FOUND"
      );
    }
session.state = type;
if (type === "END_ACTIVE") {
  session.endTime = new Date();
}
    await session.save();

    const expiryMs = Number(qrExpirySeconds) * 1000;
    if (!expiryMs || expiryMs <= 0) {
      return error(
        res,
        400,
        "Invalid QR expiry time",
        "INVALID_QR_EXPIRY"
      );
    }

    const qrData = signPayload({
      sessionId: session.sessionId,
      type,
      issuedAt: Date.now(),
      classId: session.classId,
      hourNumber: session.hourNumber,
      blockName: session.blockName,
      location: {
        lat: session.location.lat,
        lng: session.location.lng,
        radius: session.radius,
      },
      expiresAt: Date.now() + expiryMs,
    });

    return res.json({
      success: true,
      message: "QR generated successfully",
      data: qrData,
    });
  } catch (err) {
    console.error("QR generation error:", err);
    return error(
      res,
      500,
      "Failed to generate QR",
      "QR_GENERATION_FAILED"
    );
  }
});

/* -------------------- Close Session -------------------- */
router.post("/session/close", async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return error(
        res,
        400,
        "sessionId is required",
        "SESSION_ID_REQUIRED"
      );
    }

    const session = await Session.findOne({ sessionId });
    if (!session) {
      return error(
        res,
        404,
        "Session not found",
        "SESSION_NOT_FOUND"
      );
    }

    if (session.state === "CLOSED") {
      return error(
        res,
        409,
        "Session already closed",
        "SESSION_ALREADY_CLOSED"
      );
    }

    const result = await Attendance.updateMany(
      {
        sessionId,
        $or: [
          { status: { $exists: false } },
          { status: null },
          { status: "INCOMPLETE" },
        ],
      },
      {
        $set: {
          status: "ABSENT",
          updatedAt: new Date(),
        },
      }
    );

    session.state = "CLOSED";
    session.endTime = new Date();
    await session.save();

    return res.json({
      success: true,
      message: "Session closed and attendance finalized",
      data: {
        absentMarked: result.modifiedCount,
      },
    });
  } catch (err) {
    console.error("Session close error:", err);
    return error(
      res,
      500,
      "Failed to close session",
      "SESSION_CLOSE_FAILED"
    );
  }
});

/* -------------------- Get All Sessions (Faculty) -------------------- */
router.get("/sessions/all/:fId", async (req, res) => {
  try {
    const sessions = await Session.find({ facultyId: req.params.fId });

    if (!sessions.length) {
      return error(
        res,
        404,
        "No sessions found for faculty",
        "NO_SESSIONS"
      );
    }

    return res.json({
      success: true,
      message: "Sessions fetched successfully",
      data: sessions,
    });
  } catch (err) {
    console.error(err);
    return error(
      res,
      500,
      "Failed to fetch sessions",
      "FETCH_SESSIONS_FAILED"
    );
  }
});

/* -------------------- Get Attendance (Session) -------------------- */
router.get("/session/:sId/attendance", async (req, res) => {
  try {
    const records = await Attendance.find({
      sessionId: req.params.sId,
    });

    if (!records.length) {
      return error(
        res,
        404,
        "No attendance records found",
        "NO_ATTENDANCE"
      );
    }

    return res.json({
      success: true,
      message: "Attendance fetched successfully",
      data: records,
    });
  } catch (err) {
    console.error(err);
    return error(
      res,
      500,
      "Failed to fetch attendance",
      "FETCH_ATTENDANCE_FAILED"
    );
  }
});

/* -------------------- Update Attendance -------------------- */
router.put("/session/:sId/attendance", async (req, res) => {
  try {
    const { sId } = req.params;
    const { attendance } = req.body;

    if (!Array.isArray(attendance)) {
      return error(
        res,
        400,
        "Attendance must be an array",
        "INVALID_ATTENDANCE_DATA"
      );
    }

    const bulkOps = attendance
      .filter((a) => a.studentId && a.status)
      .map((a) => ({
        updateOne: {
          filter: { sessionId: sId, studentId: a.studentId },
          update: {
            $set: {
              status: a.status,
              updatedAt: new Date(),
            },
          },
          upsert: true,
        },
      }));

    if (!bulkOps.length) {
      return error(
        res,
        400,
        "No valid attendance records provided",
        "EMPTY_ATTENDANCE"
      );
    }

    await Attendance.bulkWrite(bulkOps);

    return res.json({
      success: true,
      message: "Attendance saved successfully",
    });
  } catch (err) {
    console.error(err);
    return error(
      res,
      500,
      "Failed to save attendance",
      "ATTENDANCE_SAVE_FAILED"
    );
  }
});

module.exports = router;
