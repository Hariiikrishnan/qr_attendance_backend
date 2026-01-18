const express = require("express");
const Session = require("../models/Session");
const Attendance = require("../models/Attendance");
const { verifyPayload } = require("../utils/qr");
const { distanceMeters } = require("../utils/geo");

const router = express.Router();

router.post("/scan", async (req, res) => {
 console.log(req.body);
  const { payload, signature, studentId, deviceId, location } = req.body;

  if (!verifyPayload(payload, signature))
    return res.status(400).send("Invalid QR");

  const session = await Session.findOne({ sessionId: payload.sessionId });
  if (!session) return res.status(404).send("Session not found");

  if (
    (payload.type === "START" && session.state !== "START_ACTIVE") ||
    (payload.type === "END" && session.state !== "END_ACTIVE")
  ) {
    return res.status(400).send("Invalid session state");
  }

  const dist = distanceMeters(
    location.lat, location.lng,
    session.location.lat, session.location.lng
  );

  if (dist > session.radius)
    return res.status(403).send("Outside auditorium");

  let record = await Attendance.findOne({
    sessionId: payload.sessionId,
    studentId
  });

  if (!record) {
    record = await Attendance.create({
      sessionId: payload.sessionId,
      studentId,
      deviceId
    });
  }

  if (payload.type === "START") {
    record.startScanTime = new Date();
  } else {
    record.endScanTime = new Date();
    record.status = "PRESENT";
  }

  await record.save().then((attendanceData)=>{
        res.json({msg:"Success",data:attendanceData});
        // res.send("Scan successful");
      }).catch((err)=>{
        console.log(err);
        res.status(404).json({msg:"Failed"});
    })
});


router.get("/attendance/all/:regNo",(req,res)=>{
    Attendance.find({studentId:req.params.regNo}).then((attended)=>{
        console.log(attended);
        // console.log(attended[0].saved_buses);
        if(attended.length!=0){
          res.json({msg:"Success",data:attended});
        }else{
          res.status(404).json({msg:"Failed"});
        }
    })
})

module.exports = router;
