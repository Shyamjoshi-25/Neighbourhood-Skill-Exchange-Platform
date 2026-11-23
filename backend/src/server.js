import 'dotenv/config';import express from 'express';import cors from 'cors';import rateLimit from 'express-rate-limit';import {connectDB} from './config/db.js';import authRoutes from './routes/auth.js';import usersRoutes from './routes/users.js';import requestRoutes from './routes/requests.js';import reviewRoutes from './routes/reviews.js';
if (!process.env.MONGODB_URI || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('MONGODB_URI and a JWT_SECRET of at least 32 characters are required.');
  process.exit(1);
}
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(v => v.trim()).filter(Boolean);
const app=express();app.use(cors({origin(origin,callback){if(!origin || allowedOrigins.includes(origin)) return callback(null,true); return callback(new Error('Origin not allowed by CORS'));}}));app.use(express.json({limit:'20kb'}));app.use(rateLimit({windowMs:15*60*1000,max:250,standardHeaders:true,legacyHeaders:false}));
app.get('/api/health',(req,res)=>res.json({status:'ok',service:'Neighbourhood Skill Exchange API'}));app.use('/api/auth',authRoutes);app.use('/api/users',usersRoutes);app.use('/api/requests',requestRoutes);app.use('/api/reviews',reviewRoutes);
app.use((err,req,res,next)=>{console.error(err);res.status(500).json({message:'Unexpected server error.'});});
const port=process.env.PORT||5000;connectDB().then(()=>app.listen(port,()=>console.log(`API running on ${port}`))).catch(e=>{console.error('Database connection failed:',e.message);process.exit(1);});
