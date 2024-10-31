// Importing third-party and core modules
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const { storeCategoryCount, getCategoryCount, deleteImage } = require('./controlers/routeControlers'); // Corrected import path
const http = require('http');
const cors = require('cors');
const firebase = require('firebase/app');
require('firebase/firestore');

const admin = require('firebase-admin');

// Configure dotenv for environment variables
dotenv.config();

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_KEY, 'base64').toString('utf8'));
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.DATABASE_URL
    });
}

const firebaseConfig = process.env.FIREBASE_CONFIG;
firebase.initializeApp(firebaseConfig);

const db = admin.firestore();

// Initialize Express app
const app = express();

// Create HTTP server using the Express app
const server = http.createServer(app);

// Configure session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));


// Multer storage setup for user-specific folders
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!req.session || !req.session.user || !req.session.user.email) {
            return cb(new Error('No user session found.'));
        }

        const userEmail = req.session.user.email.replace(/[^a-zA-Z0-9]/g, '_'); // sanitize email for folder naming
        const userFolder = path.join(__dirname, 'uploads', userEmail);

        // Create the user's folder if it doesn't exist
        if (!fs.existsSync(userFolder)) {
            fs.mkdirSync(userFolder, { recursive: true });
        }

        cb(null, userFolder);
    },
    filename: async (req, file, cb) => {
        try {
            const category = req.body.category;
            const userEmail = req.session.user.email.replace(/[^a-zA-Z0-9]/g, '_');
            let count = await getCategoryCount(req, category);
            count += 1;

            await storeCategoryCount(req, category, count);

            const uniqueSuffix = '-' + Date.now() + '-' + Math.round(Math.random() * 1000);
            const fileName = `${category}-${count}${uniqueSuffix}${path.extname(file.originalname)}`;

            cb(null, fileName);
        } catch (error) {
            cb(error);
        }
    }
});


// Create 'uploads' folder if it doesn't exist
const dir = './uploads';
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

// Initialize multer for file uploads
const upload = multer({ storage: storage });

// Export the upload middleware for use in routeHandlers.js
module.exports = { upload };

// Route for image deletion
app.delete('/api/images/:imageName', deleteImage);

// Route handlers middleware
app.use("/", require("./routes/routeHandlers"));

// Start the server
const port = process.env.PORT || 8000;
server.listen(port, () => {
    console.log(`Server is running on port ${port}/home`);
});
