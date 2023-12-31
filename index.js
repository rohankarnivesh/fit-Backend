import express from "express";
import { config } from "dotenv";
import connection from './Database/connection.js';
import cookieParser from "cookie-parser";
import router from "./Router/routes.js";
import helmet from 'helmet';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from './Schema/User/signup.js';
import Fitness from './Schema/User/fitness.js';
import WorkoutPlan from './Schema/Admin/Workout.js';
import CommunityPost from './Schema/User/CommunityPost.js';
import authenticateToken from './Middleware/User/AuthMiddleware.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: ['http://localhost:5173'], // Update with your frontend URL(s)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));
app.options('*', cors());
app.use(express.json({ extended: true }));
app.use(authenticateToken);
app.use(cookieParser());
app.use("/api", router);
app.use(helmet());

config();

const salt = bcrypt.genSaltSync(10);

connection().then(() => {
  console.log("Connected to the database");

  app.post('/register', async (req, res) => {
    const { username, email, password, isAdmin } = req.body;
    try {
      const userDoc = await User.create({
        username,
        email,
        password: bcrypt.hashSync(password, salt),
        isAdmin,
      });

      if (!isAdmin) {
        const fitnessDoc = await Fitness.create({
          user: userDoc._id,
          weight: 0,
          height: 0,
          age: 0,
          BMI: 0,
          workoutType: 'Normal Workout',
        });

        userDoc.fitness = fitnessDoc._id;
        await userDoc.save();
      }

      res.json(userDoc);
    } catch (e) {
      res.status(400).json(e);
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: user._id, isAdmin: user.isAdmin }, process.env.SECRET);

      res.cookie("token", token, {
        httpOnly: true,
      });

      res.status(200).json({ token, hasFitnessData: !user.isAdmin });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  router.post('/admin/register', async (req, res) => {
    try {
      const { username, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const admin = await Admin.create({
        username,
        password: hashedPassword,
      });
  
      res.status(201).json({ message: 'Admin registered successfully', admin });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });

  app.post("/api/workoutplan", async (req, res) => {
    try {
      const { userId, workoutDetails } = req.body;

      if (!userId || !workoutDetails) {
        return res.status(400).json({ message: "Missing required parameters" });
      }

      const user = await User.findById(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Permission denied" });
      }

      const workoutPlan = await WorkoutPlan.create(workoutDetails);

      res.status(201).json({ message: "Workout plan created and assigned successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  router.post('/communitypost', async (req, res) => {
    try {
      const { username, profilePicSrc, date, description, imageSrc } = req.body;
      const communityPost = await CommunityPost.create({
        username,
        profilePicSrc,
        date,
        description,
        imageSrc,
      });
  
      res.status(201).json({ message: 'Community post created successfully', post: communityPost });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}).catch((error) => {
  console.log("Invalid Database connection");
});
