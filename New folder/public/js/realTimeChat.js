
// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCLx8xu6uAPgPen6arijeDIf05uCj0zfUU",
    authDomain: "project1-46dde.firebaseapp.com",
    projectId: "project1-46dde",
    storageBucket: "project1-46dde.appspot.com",
    messagingSenderId: "700625207517",
    appId: "1:700625207517:web:d76bb780e53e0cb9d25b34",
    measurementId: "G-RN6YYR9X3C"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); // Initialize Firestore

// Initialize Socket.IO connection
const socket = io();

// Register user when the page is loaded
window.onload = function () {
    const username = document.getElementById('user-select').value;
    if (username) {
        socket.emit('register', username);  // Emit register event with the username
        console.log(`User ${username} registered.`);
    } else {
        console.error("No username selected!");
    }
};

// Send message when the "Send" button is clicked
document.getElementById('send-button').addEventListener('click', function () {
    const username = document.getElementById('user-select').value;
    const receiver = document.getElementById('user-select').value;
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim(); // Trimmed to avoid sending empty messages

    if (message && username) {
        const messageObj = {
            sender: username,
            receiver: receiver,
            content: message,
            timestamp: new Date(),
        };

        // Emit the message to the server
        socket.emit('send message', { message: messageObj.content, receiver });

        // Save message to Firestore
        saveMessageToFirestore(messageObj);
        messageInput.value = ''; // Clear the input field
    } else {
        console.error("Message or username is missing!");
    }
});

// Function to save the message to Firestore
const saveMessageToFirestore = async (messageObj) => {
    try {
        await db.collection('messages').add(messageObj);
        console.log('Message saved successfully to Firestore!');
    } catch (error) {
        console.error('Error saving message to Firestore:', error);
    }
};

// Listen for incoming messages from the server
socket.on('chat message', (data) => {
    const chatBox = document.getElementById('chat-box');
    const messageCount = document.getElementById('message-count');

    // Display the incoming message
    const messageElement = document.createElement('p');
    messageElement.innerHTML = `<strong>${data.sender}:</strong> ${data.message}`;
    chatBox.appendChild(messageElement);

    // Update message count
    const currentCount = parseInt(messageCount.innerText.split(': ')[1]) || 0;
    messageCount.innerText = `Messages: ${currentCount + 1}`;
});

