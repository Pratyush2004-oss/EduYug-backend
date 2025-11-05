import express from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import connectDB from './config/db.js';

// importing the routes
import AuthRoute from './routes/auth.routes.js';
import CourseRoute from './routes/course.routes.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('Server is Listening!');
});
// setting up the routes
app.use('/api/auth', AuthRoute);
app.use('/api/courses', CourseRoute);

// handling the errors
app.use((err, req, res, next) => {
    res.status(500).json({ message: ENV.NODE_ENV === "development" ? `Error in server : ${err.message}` || "Internal Server Error" : "Internal Server Error" });
});


// start the server
const startServer = async () => {
    try {
        await connectDB();
        if (ENV.NODE_ENV !== "production") {
            app.listen(ENV.PORT, () => {
                console.log(`Server started at http://localhost:${ENV.PORT}`);
            });
        }
    } catch (error) {
        console.log("Failed to start Server : " + error.message);
        process.exit(1);
    }
}
startServer();

export default app;