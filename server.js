import express from 'express';
import mongoose, { connect } from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from "jsonwebtoken";
import pkg from 'body-parser';
const { json } = pkg;
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

dotenv.config();


const app = express();
app.use(cors())
const port = process.env.PORT || 5001;

// app.use(express.json());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


const Schema = mongoose.Schema;

// admin model
const adminSchema = new Schema({
    emailId: {
        type: String,
        require: true
    }
    ,
    pass: {
        type: String,
        default: 0
    }
})
const Admin = mongoose.model("admin", adminSchema);



// instructor model
const instructorSchema = new Schema({
    name: {
        type: String,
        require: true
    },
    emailId: {
        type: String,
        require: true
    }
    ,
    pass: {
        type: String,
        default: 0
    }
})
const Instructor = mongoose.model("instructor", instructorSchema)

// course model
const courseSchema = new Schema({
    Name: {
        type: String,
        require: true
    }
    ,
    Level: {
        type: String,
        require: true
    },
    Description: {
        type: String,
        require: true
    },
    image: {
        type: String,
        require: true
    },
    lectures: {
        type: [{
            lectureId: String,
        }]
    }
})
const Course = mongoose.model("course", courseSchema)


// lecture model
const lectureSchema = new Schema({
    CourseId: {
        type: String,
        require: true
    },
    InstructorId: {
        type: String,
        require: true
    },
    Date: {
        type: String,
        require: true
    }
})
const Lecture = mongoose.model("lecture", lectureSchema);



// MongoDB connection
connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => {
        console.log('Connected to MongoDB');



        cloudinary.config({
            cloud_name: process.env.CLOUD_NAME,
            api_key: process.env.API_KEY,
            api_secret: process.env.API_SECRET
        });
        const storage = multer.memoryStorage();
        const upload = multer({ storage: storage });

        app.post('/api/upload', upload.single('file'), (req, res) => {
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            // Upload image to Cloudinary
            cloudinary.uploader.upload_stream({ resource_type: 'auto' }, (error, result) => {
                if (error) {
                    console.error('Error uploading to Cloudinary:', error);
                    return res.status(500).json({ message: 'An error occurred while uploading' });
                }

                return res.json({ imageUrl: result.secure_url });
            }).end(req.file.buffer);
        });

        let protectAdmin = async (req, res, next) => {
            let token = undefined;
            if (
                req.headers.authorization &&
                req.headers.authorization.startsWith("Admin")
              ) {
                console.log(req.headers.authorization);
                let tokenId = req.headers.authorization.split(" ");
                // console.log(token);
                // console.log(tokenId)
                token = tokenId[1];
              }
            
              if (!token) {
                return next(res.status(401).send({ message: "unauthorized access" }));
              }
            
              try {
                const decoded = jwt.verify(token, "secret_key");
                const admin = await Admin.find({_id:decoded.id});
                if (!admin) {
                  return next(res.status(404).send({ message: "admin Not Found" }));
                }
            
                req.admin = admin;
                next();
              } catch (error) {
                return next(res.status(401).send({ message: "not authorized" }));
              }
        }

        let protectInstructor = async (req, res, next) => {
            let token = undefined;
            if (
                req.headers.authorization &&
                req.headers.authorization.startsWith("Instructor")
              ) {
                console.log(req.headers.authorization);
                let tokenId = req.headers.authorization.split(" ");
                // console.log(token);
                // console.log(tokenId)
                token = tokenId[1];
              }
            
              if (!token) {
                return next(res.status(401).send({ message: "unauthorized access" }));
              }
            
              try {
                const decoded = jwt.verify(token, "secret_key");
                const instructor = await Instructor.find({_id:decoded.id});
                if (!instructor) {
                  return next(res.status(404).send({ message: "admin Not Found" }));
                }
            
                req.instructor = instructor;
                next();
              } catch (error) {
                return next(res.status(401).send({ message: "not authorized" }));
              }
        } 


        app.post("/login", async (req, res) => {
            const { emailId, pass, user } = req.body;
            console.log(emailId, pass, user);
            try {
                if (user === 'Admin') {
                    const adminData = await Admin.findOne({ emailId: emailId });
                    console.log(adminData);
                    if (adminData) {
                        
                        const isPasswordValid = adminData.pass == pass;
                        //   if (!isPasswordValid) return res.status(401).send({ msg: "Invalid Credentials" });

                        if (isPasswordValid) {
                            // generate a token
                            const token = jwt.sign({
                                emailId: adminData.emailId,
                                userId: adminData._id
                            }, 'secret_key', { expiresIn: '1h' });

                            // Send the token to the frontend
                            res.json({ token: token, user: 'Admin' });
                        } else {
                            res.status(401).json({ message: "Invalid Email Id or Password" });
                        }
                    } else {
                        res.status(401).json({ message: "Invalid Email Id or Password" });
                    }
                } else {
                    ////////////////// login for instructor //////////////////////
                    const instructorData = await Instructor.findOne({ emailId: emailId });
                    console.log(instructorData);
                    if (instructorData) {

                        const isPasswordValid = instructorData.pass == pass;
                        //   if (!isPasswordValid) return res.status(401).send({ msg: "Invalid Credentials" });

                        if (isPasswordValid) {
                            // generate a token
                            const token = jwt.sign({ emailId: instructorData.emailId, userId: instructorData._id }, 'secret_key', { expiresIn: '1h' });

                            // Send the token to the frontend
                            res.json({ token: token, user: 'Instructor',InstrId: instructorData._id });
                        } else {
                            res.status(401).json({ message: "Invalid Email Id or Password" });
                        }
                    } else {
                        res.status(401).json({ message: "Invalid Email Id or Password" });
                    }
                }
            } catch (error) {
                console.error("Error during login:", error);
                res.status(500).json({ message: "Internal server error" });
            }
        });




        ///////////////// course related all routes are here //////////////////////////////

        app.post("/course",protectAdmin, async (req, res) => {
            try {
                const { Name, Level, Description, Image } = req.body;

                const newCourse = new Course({
                    Name: Name,
                    Level: Level || 0, 
                    Description: Description,
                    image: Image 
                });

                await newCourse.save();

                res.status(201).json({ message: 'Course created successfully', course: newCourse });
            } catch (error) {
                console.error("Error creating course:", error);
                res.status(500).json({ message: "Internal server error" });
            }
        });



        app.get('/courses',protectAdmin, async (req, res) => {
            try {
                const courses = await Course.find();
                if (courses.length > 0) {
                    res.json({ data: courses });
                } else {
                    res.status(404).json({ message: 'No Course Found' });
                }
            } catch (error) {
                console.error('Error fetching courses:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });

        app.get("/course/:id",protectAdmin, async (req, res) => {
            const id = req.params.id;
            try {
                const courses = await Course.find({ _id: id });
                if (courses.length > 0) {
                    res.json({ data: courses });
                } else {
                    res.status(404).json({ message: 'No Course Found' });
                }
            } catch (error) {
                console.error('Error fetching courses:', error);
                res.status(500).json({ message: 'Internal server error' });
            }


        });

        app.put('/course/:id', async (req, res) => {

        });



        ///////////////// instructor related all routes are here ///////////////////////
        app.get("/instructors",protectAdmin, async (req, res) => {
            try {
                const instructors = await Instructor.find();
                if (instructors.length > 0) {
                    res.json({ data: instructors });
                } else {
                    res.status(404).json({ message: 'No instructors Found' });
                }
            } catch (error) {
                console.error('Error fetching instructors:', error);
                res.status(500).json({ message: 'Internal server error' });
            }

        });


        // //////// only for the instructor side , you cant use it from admin//////////
        app.get("/:instrId/lectures",protectInstructor,async(req,res)=>{
            const instrId=req.params.instrId;
            console.log(instrId);
            try{
                const lectures = await Lecture.find({InstructorId:instrId});
                if (lectures.length > 0) {
                    const instructWithLectureName = await Promise.all(
                        lectures.map(async (lecture) => {
                          const course = await Course.findById(lecture.CourseId);
                          const courseName = course ? course.Name : '';
                          return { ...lecture._doc, courseName }; // Attach instructor to lecture object
                        })
                      );



                    res.json({ data: instructWithLectureName });
                } else {
                    res.status(404).json({ message: 'No lectures Found' });
                }

            }catch(err){
                console.error('Error fetching lectures:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        })



        // assign lecture route handled here///////////////////

        app.post("/assignlecture",protectAdmin, async (req, res) => {
            try {


                const { courseId, instructId, date } = req.body;
                console.log(courseId, instructId, date);
                const course = await Course.findById({ _id: courseId });
                const instructor = await Instructor.findById({ _id: instructId });
                const lectures = await Lecture.find({ Date: date, InstructorId: instructId });
                if (lectures.length > 0) {
                    return res.status(409).json({ message: 'Lecture already assigned for this date and time.' })
                } else {

                    const lecture = new Lecture({
                        CourseId: courseId,
                        InstructorId: instructId,
                        Date: date

                    })

                    const doc = await lecture.save();

                    if (!doc) {
                        throw Error("Failed to create a new lecture");
                    } else {
                        await course.updateOne({ $push: { lectures: [{ LectureId: doc._id }] } });
                        res.status(201).json({ message: `${course} has been successfully assigned to ${instructor}` })

                    }



                }
            } catch (err) {
                res.status(409).json({ message: "you can not assign same lecture 2 times" })
            }


        });


        // route for instructor to get all lectures
        app.get('/course/:courseId/getlectures', async (req, res) => {
            const { courseId } = req.params;
            try {
                // const course = await Course.find({_id:courseId});
                const lectures = await Lecture.find({ CourseId: courseId });
                if (lectures.length > 0) {


                    const lecturesWithInstructors = await Promise.all(
                        lectures.map(async (lecture) => {
                            const instructor = await Instructor.find({_id:lecture.InstructorId});
                            return { ...lecture._doc, instructor }; 
                        })
                    );

                    res.json({ data: lecturesWithInstructors });
                } else {
                    res.status(404).json({ message: 'No Lecture Found' });
                }
            } catch (error) {
                console.error('Error fetching instructors:', error);
                res.status(500).json({ message: 'Internal server error' });
            }

        })


        






        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    })
    .catch((err) => {
        console.error('Error connecting to MongoDB:', err.message);
    });



