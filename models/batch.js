import { Schema, model } from 'mongoose';

const batchSchema = new Schema({
  CourseId:String,
  instructorId:String,
  Date:Date,
});
export default model('Batch', batchSchema);
