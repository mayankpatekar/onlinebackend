import { Schema, model } from 'mongoose';

const adminSchema = new Schema({
  emailId:String,
  pass:String,
});
export default model('admin', adminSchema);
