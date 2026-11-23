import mongoose from 'mongoose';
const reviewSchema = new mongoose.Schema({request: {type:mongoose.Schema.Types.ObjectId, ref:'HelpRequest', required:true, unique:true},
  reviewer: {type:mongoose.Schema.Types.ObjectId, ref:'User', required:true},
  reviewedUser: {type:mongoose.Schema.Types.ObjectId, ref:'User', required:true},
  rating: {type:Number, min:1, max:5, required:true},
  comment: {type:String, trim:true, maxlength:500, default:''}
},{timestamps:true});
export default mongoose.model('Review',reviewSchema);
