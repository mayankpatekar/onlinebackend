import { Schema, model } from 'mongoose';

const instructorSchema = new Schema({
  emailId:String,
  pass:String,
});
export default model('instructor', instructorSchema);
