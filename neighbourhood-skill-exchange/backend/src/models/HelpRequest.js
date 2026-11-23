import mongoose from 'mongoose';
const helpRequestSchema = new mongoose.Schema({
  title: {type:String, required:true, trim:true, maxlength:120},
  description: {type:String, required:true, trim:true, maxlength:2000},
  skillRequired: {type:String, required:true},
  urgency: {type:String, enum:['Normal','Urgent','Emergency'], default:'Normal'},
  area: {type:String, required:true},
  requester: {type:mongoose.Schema.Types.ObjectId, ref:'User', required:true},
  helper: {type:mongoose.Schema.Types.ObjectId, ref:'User', default:null},
  status: {type:String, enum:['Pending','Accepted','Declined','Completed','Cancelled'], default:'Pending'},
  responseAt: {type:Date, default:null},
  completedAt: {type:Date, default:null},
}, {timestamps:true});
helpRequestSchema.index({area:1,skillRequired:1,status:1});
export default mongoose.model('HelpRequest',helpRequestSchema);
