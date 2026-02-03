const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const facultyRoutes = require("./routes/faculty");
const studentRoutes = require("./routes/student");
const userRoutes = require("./routes/user");


const app = express();
app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});


// Connect DB
connectDB();

// Routes
app.use("/faculty", facultyRoutes);
app.use("/student", studentRoutes);
app.use("/user", userRoutes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
