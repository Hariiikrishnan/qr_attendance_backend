const express = require("express");
const Session = require("../models/Session");
const Attendance = require("../models/Attendance");
const { signPayload } = require("../utils/qr");

const router = express.Router();

router.post("/session/start", async (req, res) => {
  const session = await Session.create({
    sessionId: `AUD_${Date.now()}`,
    facultyId: req.body.facultyId,
    location: req.body.location,
    radius: 50,
    audi:req.body.audi,
    startTime: new Date()
  });

  res.json(session);
});

router.post("/session/qr", async (req, res) => {
  const { sessionId, type, audi } = req.body;

  const session = await Session.findOne({ sessionId });
  if (!session) return res.status(404).send("Session not found");

  session.state = type === "START" ? "START_ACTIVE" : "END_ACTIVE";
  if (type === "END") session.endTime = new Date();
  await session.save();


  // 10.768554, 79.103301 - Dummy Data Home Location
  // 10.764479, 79.126183 - Dummy Data Mall Location
  // 10.728720, 79.020181 - KRC Library Location
  // 10.7283089, 79.0197605 - KRC Library New Location

  // 10.7274146,79.0193826 - VV Auditorium
  // 10.728649, 79.020686  - TDC Auditorium
  // 10.7287991,79.0199514 - SoC Auditorium
  // 10.7292073,79.0192644 - Tifac Auditorium

  const qrData = signPayload({
    sessionId,
    type,
    issuedAt: Date.now(),
      auditorium: {
    id: "AUDI_001",
    lat: 10.768554,
    lng: 79.103301,
    radius: 100 // meters
  },
  expiresAt: Date.now() + 2 * 60 * 1000 // 2 minutes
  });

  res.json(qrData);
});

router.post("/session/close", async (req, res) => {
  await Session.updateOne(
    { sessionId: req.body.sessionId },
    { state: "CLOSED" }
  );
  res.send("Session closed");
});



router.get("/sessions/all/:fId",(req,res)=>{
    Session.find({facultyId:req.params.fId}).then((conducted)=>{
        console.log(conducted);
        // console.log(attended[0].saved_buses);
        if(conducted.length!=0){
          res.json({msg:"Success",data:conducted});
        }else{
          res.status(404).json({msg:"Failed"});
        }
    })
})
router.get("/session/:sId/attendance",(req,res)=>{
    Attendance.find({sessionId:req.params.sId}).then((attendedStudents)=>{
        console.log(attendedStudents);
        // console.log(attended[0].saved_buses);
        if(attendedStudents.length!=0){
          res.json({msg:"Success",data:attendedStudents});
        }else{
          res.status(404).json({msg:"Failed"});
        }
    })
})



module.exports = router;
