import { Schema, model } from 'mongoose';

const courseSchema = new Schema({
  Name:String,
  Level:Number,
  Description:String,
  image: String,
});
export default model('Course', courseSchema);
