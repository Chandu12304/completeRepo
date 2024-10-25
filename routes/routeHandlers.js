const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const {
    getAuthenticationPage,
    saveUserData,
    handleLogin,
    getHomePage,
    verifyEmail,
    changePassword,
    registerUser,
    chatbotControler,
    feedbackControler,
    isAuthenticated,
    profileCreationController,
    OauthControllerFunction,
    getDashboardPage,
    getUserProfileDetails,
    imagesFetcher
} = require('../controlers/routeControlers');

const { upload } = require('../server');  // Importing upload from server.js

// Initialize the router
const router = express.Router();

// Route-1: Show home page
router.get('/home', getHomePage);

// Route-2: Show authentication page
router.get('/auth', getAuthenticationPage);

// Route-3: Handle registration
router.post('/register', registerUser);

// Route-4: Handle login
router.post('/login', handleLogin);

// Route-5: Show verify email page
router.get('/verify', (req, res) => res.render('verify.ejs'));

// Route-6: Handle email verification
router.post('/verify', verifyEmail);

// Route-7: Show change password page
router.get('/changePassword', (req, res) => res.render('changePassword.ejs'));

// Route-8: Handle password change
router.post('/changePassword', changePassword);

// Route for chatbot functionality
router.post('/chat-bot', chatbotControler);

// Route to handle form submission and send email
router.post('/send-email', feedbackControler);

// Route for user profile creation
router.post('/api/createProfile', profileCreationController);

// Route for fetching user profile details
router.get('/api/profile', getUserProfileDetails);

// Route for image uploads (using multer)
router.post('/upload', upload.single('image'), (req, res) => {
    console.log(req.file); // Log the uploaded file details
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }
    res.json({ message: 'Image uploaded successfully!', file: req.file });
});

// Route for viewing images
router.get('/images', (req, res) => {
    if (!req.session || !req.session.user || !req.session.user.email) {
        return res.status(401).json({ message: 'User not authenticated' });
    }

    imagesFetcher(req, res); // Only fetch the authenticated user's images
});

// Route for dashboard (authenticated)
router.get('/main', isAuthenticated, getDashboardPage);

// Route for scrolling example
router.get('/scroll', (req, res) => {
    res.render('scroll.ejs');
});

// Route for Real Time Chat
router.get('/RealChat', (req, res) => {
    res.render('RealTimeChat.ejs');
});

module.exports = router;
