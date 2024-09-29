// Importing third-party and core modules
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');  // Keep only this line
const session = require('express-session');
const passport = require('./OAuth'); // Assuming you have a passport configuration in OAuth.js
const multer = require('multer');
const fs = require('fs');
const { storeCategoryCount, getCategoryCount, deleteImage } = require('./controlers/routeControlers'); // Corrected import path
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const firebase = require('firebase/app');
require('firebase/firestore');

const admin = require('firebase-admin');

// Your service account key file
const serviceAccount = require('./config/serviceAccountKey.json');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://project1-46dde-default-rtdb.asia-southeast1.firebasedatabase.app/"
    });
}

const firebaseConfig = process.env.FIREBASE_CONFIG

firebase.initializeApp(firebaseConfig);

const db = admin.firestore();

// Configure dotenv for environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configure session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Directory for EJS templates

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware
app.use(cors());

// Middleware for parsing application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// Middleware for parsing JSON data
app.use(bodyParser.json());

// Middleware to serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Passport for authentication
app.use(passport.initialize());
app.use(passport.session());

// Set up multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Directory to save uploaded files
    },
    filename: async (req, file, cb) => {
        try {
            const category = req.body.category; // Get the selected category
            console.log('Selected Category:', category); // Log the selected category

            // Fetch the category count
            let count = await getCategoryCount(req, category);
            count += 1; // Increment the count
            console.log(`Updated count for category "${category}": ${count}`);

            // Store the category count in Firestore
            await storeCategoryCount(req, category, count); // Pass req to access the session

            // Generate the unique suffix and file name
            const uniqueSuffix = '-' + Date.now() + '-' + Math.round(Math.random() * 1000);
            const fileName = `${category}-${count}${uniqueSuffix}${path.extname(file.originalname)}`; // Append category count and random suffix

            cb(null, fileName); // Pass the filename to the callback
        } catch (error) {
            cb(error); // Pass any error to the callback
        }
    },
});

// Create 'uploads' folder if it doesn't exist
const dir = './uploads';
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

// Initialize multer for file uploads
const upload = multer({ storage: storage });

// Route for file upload
app.post('/upload', upload.single('image'), (req, res) => {
    res.json({ message: 'File uploaded successfully!', file: req.file });
});

// Chat functionality routes
io.on('connection', (socket) => {
    console.log('A user connected');

    // Register user
    socket.on('register', (username) => {
        socket.username = username;
        users[username] = socket.id; // Map username to socket ID
        io.emit('user list', Object.keys(users));
    });

    // Handle sending chat messages
    socket.on('send message', async (data) => {
        const { message, receiver } = data;
        const timestamp = new Date();

        const newMessage = {
            sender: socket.username,
            receiver: receiver,
            content: message,
            timestamp: timestamp,
        };

        try {
            // Save message to Firestore
            await db.collection('messages').add(newMessage);
            // Emit message only to the intended recipient or to everyone
            if (receiver === 'Everyone') {
                io.emit('chat message', {
                    sender: socket.username,
                    message,
                    receiver,
                    timestamp: timestamp.toISOString(),
                });
            } else {
                const recipientSocketId = users[receiver];
                if (recipientSocketId) {
                    io.to(recipientSocketId).emit('chat message', {
                        sender: socket.username,
                        message,
                        receiver,
                        timestamp: timestamp.toISOString(),
                    });
                }
            }
        } catch (err) {
            console.error('Error saving message:', err);
        }
    });

    // Handle posting items for sell, rent, or donate
    socket.on('post item', async (data) => {
        const { type, item, amount, imageUrl } = data;
        const timestamp = new Date();

        // Validate input
        if ((type === 'sell' || type === 'rent') && (!amount || !imageUrl)) {
            socket.emit('error', 'Amount and Image URL are required for selling or renting.');
            return;
        }

        const newMessage = {
            sender: socket.username,
            content: `${type.charAt(0).toUpperCase() + type.slice(1)} posted: ${item} ${amount ? `for $${amount}` : ''}`,
            imageUrl: (type === 'sell' || type === 'rent') ? imageUrl : undefined,
            timestamp: timestamp,
        };

        try {
            // Save item post to Firestore
            await db.collection('messages').add(newMessage);
            io.emit('item posted', {
                sender: socket.username,
                content: `${type.charAt(0).toUpperCase() + type.slice(1)} posted: ${item} ${amount ? `for $${amount}` : ''}`,
                imageUrl: newMessage.imageUrl,
                timestamp: timestamp.toISOString(),
            });
        } catch (err) {
            console.error('Error saving item post:', err);
        }
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected');
        delete users[socket.username]; // Remove user from active users
        io.emit('user list', Object.keys(users)); // Update user list for everyone
    });
});

// Route for image deletion
app.delete('/api/images/:imageName', deleteImage);

// Route handlers middleware
app.use("/", require("./routes/routeHandlers")); // Assuming routeHandlers is a file that handles your routes

// Start the server
const port = process.env.PORT || 8000;
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
