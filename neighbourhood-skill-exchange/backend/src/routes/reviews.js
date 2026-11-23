import {Router} from 'express';import Review from '../models/Review.js';import HelpRequest from '../models/HelpRequest.js';import {protect} from '../middleware/auth.js';
const router=Router();
router.post('/',protect,async(req,res)=>{try{const {requestId,rating,comment}=req.body;const r=await HelpRequest.findById(requestId);if(!r||r.status!=='Completed'||r.requester.toString()!==req.user._id.toString()||!r.helper)return res.status(400).json({message:'Only completed help you requested can be reviewed.'});const review=await Review.create({request:r._id,reviewer:req.user._id,reviewedUser:r.helper,rating,comment});res.status(201).json(review);}catch(e){res.status(400).json({message:'Review may already exist or is invalid.'});}});
router.get('/mine',protect,async(req,res)=>res.json(await Review.find({reviewer:req.user._id}).populate('reviewedUser','name profession')));
export default router;
