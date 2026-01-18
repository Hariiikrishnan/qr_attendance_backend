const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const facultyRoutes = require("./routes/faculty");
const studentRoutes = require("./routes/student");

const app = express();
app.use(express.json());
app.use(cors());


// Connect DB
connectDB();

// Routes
app.use("/faculty", facultyRoutes);
app.use("/student", studentRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
