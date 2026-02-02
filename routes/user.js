const express = require("express");
const User = require("../models/User");
const Class = require("../models/Class");
const Session = require("../models/Session");
const Attendance = require("../models/Attendance");

const multer = require("multer");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const router = express.Router();

/* ------------------------- Helpers ------------------------- */
function error(res, status, message, code) {
  return res.status(status).json({
    success: false,
    message,
    errorCode: code,
  });
}

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

/* ------------------------- Multer ------------------------- */
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const { className } = req.body;
    if (!className) {
      return cb(new Error("className is required"));
    }
    const safeName = className.replace(/\s+/g, "_") + ".xlsx";
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  fileFilter: (_, file, cb) => {
    if (!file.originalname.endsWith(".xlsx")) {
      cb(new Error("Only .xlsx files allowed"));
    } else {
      cb(null, true);
    }
  },
});

/* -------------------- Add / Fetch User -------------------- */
router.post("/addFaculty/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const { role, facultyID, email } = req.body;

    if (!uid || !email || !role) {
      return error(
        res,
        400,
        "Missing required user details",
        "MISSING_USER_DATA"
      );
    }

    let user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      user = await User.create({
        firebaseUid: uid,
        email,
        role,
        facultyID: role === "faculty" ? facultyID : null,
      });
    }

    return res.json({
      success: true,
      message: "User authenticated successfully",
      data: {
        userId: user._id,
        role: user.role,
        email: user.email,
        facultyID: user.facultyID,
      },
    });
  } catch (err) {
    console.error(err);
    return error(res, 500, "Failed to create user", "USER_CREATE_FAILED");
  }
});

/* -------------------- Add Class -------------------- */
router.post("/add-class", upload.single("file"), async (req, res) => {
  try {
    const { className, facultyId, facultyName } = req.body;

    if (!className || !facultyId) {
      return error(res, 400, "Missing class details", "MISSING_CLASS_DATA");
    }

    let existingClass = await Class.findOne({ className });

    if (existingClass) {
      if (!existingClass.facultyIds.includes(facultyId)) {
        existingClass.facultyIds.push(facultyId);
        existingClass.facultyNames.push(facultyName);
        existingClass.updatedAt = new Date();
        await existingClass.save();
      }

      return res.json({
        success: true,
        message: "Faculty added to existing class",
        data: { classId: existingClass.classId },
      });
    }

    if (!req.file) {
      return error(
        res,
        400,
        "Excel file required for new class",
        "EXCEL_REQUIRED"
      );
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const students = XLSX.utils.sheet_to_json(sheet);

    if (!students.length) {
      return error(
        res,
        400,
        "Excel file contains no students",
        "EMPTY_EXCEL"
      );
    }

    const newClass = await Class.create({
      classId: `CLS${Date.now()}`,
      className,
      facultyIds: [facultyId],
      facultyNames: [facultyName],
      totalStudents: students.length,
      createdAt: new Date(),
      createdBy: facultyId,
      excelFileName: className.replace(/\s+/g, "_"),
    });

    return res.json({
      success: true,
      message: "New class created successfully",
      data: { classId: newClass.classId },
    });
  } catch (err) {
    console.error(err);
    return error(res, 500, "Failed to add class", "ADD_CLASS_FAILED");
  }
});

/* -------------------- Recent Sessions -------------------- */
router.get("/recent", async (req, res) => {
  try {
    const facultyId = req.query.facultyId;
    if (!facultyId) {
      return error(res, 400, "facultyId is required", "FACULTY_ID_REQUIRED");
    }

    const sessions = await Session.find({ facultyId })
      .sort({ createdAt: -1 })
      .limit(10);

    return res.json({
      success: true,
      message: "Recent sessions fetched",
      data: sessions,
    });
  } catch (err) {
    console.error(err);
    return error(res, 500, "Failed to fetch sessions", "FETCH_RECENT_FAILED");
  }
});

/* -------------------- Classes by Faculty -------------------- */
router.get("/by-faculty/:facultyId", async (req, res) => {
  try {
    const classes = await Class.find({
      facultyIds: req.params.facultyId,
      isActive: true,
    }).select("classId className totalStudents createdAt createdBy");

    return res.json({
      success: true,
      message: "Classes fetched successfully",
      data: classes,
    });
  } catch (err) {
    console.error(err);
    return error(res, 500, "Failed to fetch classes", "FETCH_CLASSES_FAILED");
  }
});

/* -------------------- Class Details -------------------- */
router.get("/class/:classId", async (req, res) => {
  try {
    const cls = await Class.findOne({ classId: req.params.classId });
    if (!cls) {
      return error(res, 404, "Class not found", "CLASS_NOT_FOUND");
    }

    const filePath = path.join(uploadDir, `${cls.excelFileName}.xlsx`);
    if (!fs.existsSync(filePath)) {
      return error(res, 404, "Class file missing", "EXCEL_NOT_FOUND");
    }

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const students = XLSX.utils.sheet_to_json(sheet);

    return res.json({
      success: true,
      message: "Class details fetched",
      data: {
        classId: cls.classId,
        className: cls.className,
        facultyNames: cls.facultyNames,
        totalStudents: cls.totalStudents,
        createdAt: cls.createdAt,
        students,
      },
    });
  } catch (err) {
    console.error(err);
    return error(res, 500, "Failed to fetch class", "FETCH_CLASS_FAILED");
  }
});

/* -------------------- Full Attendance -------------------- */
router.get("/session/:sId/attendance/full", async (req, res) => {
  try {
    const session = await Session.findOne({ sessionId: req.params.sId });
    if (!session) {
      return error(res, 404, "Session not found", "SESSION_NOT_FOUND");
    }

    const filePath = path.join(uploadDir, `${session.className}.xlsx`);
    if (!fs.existsSync(filePath)) {
      return error(res, 404, "Class file missing", "EXCEL_NOT_FOUND");
    }

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const classStudents = XLSX.utils.sheet_to_json(sheet);

    const attendance = await Attendance.find({
      sessionId: req.params.sId,
    });

    const attendanceMap = {};
    attendance.forEach((a) => {
      attendanceMap[a.studentId] = a.status;
    });

    const merged = classStudents.map((s) => ({
      studentId: s.RegNo || s["Reg No"] || s["Register No"],
      name: s.Name || s.name || "",
      status: attendanceMap[s.RegNo] || "ABSENT",
    }));

    return res.json({
      success: true,
      message: "Full attendance fetched",
      data: merged,
    });
  } catch (err) {
    console.error(err);
    return error(
      res,
      500,
      "Failed to fetch attendance",
      "FETCH_FULL_ATTENDANCE_FAILED"
    );
  }
});

module.exports = router;
