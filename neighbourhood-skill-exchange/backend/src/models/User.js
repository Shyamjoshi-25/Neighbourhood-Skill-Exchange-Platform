import mongoose from 'mongoose';
const userSchema = new mongoose.Schema({
  name: {type:String, required:true, trim:true, maxlength:80},
  email: {type:String, required:true, unique:true, lowercase:true, trim:true},
  password: {type:String, required:true},
  role: {type:String, enum:['user','skilled_member','admin'], default:'user'},
  area: {type:String, required:true, trim:true},
  city: {type:String, default:'', trim:true},
  profession: {type:String, default:''},
  skills: {type:[String], default:[]},
  bio: {type:String, default:'', maxlength:500},
  availability: {type:String, enum:['Available','Busy','Unavailable'], default:'Available'},
  contactPreference: {type:String, enum:['In-app','Email'], default:'In-app'},
  verified: {type:Boolean, default:false},
  isBlocked: {type:Boolean, default:false}
}, {timestamps:true});
export default mongoose.model('User',userSchema);
