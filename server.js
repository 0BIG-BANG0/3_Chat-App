import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { connect } from "./config.js";
import { chatModel } from "./chat.schema.js";

// Creating a express app
const app = express();
app.use(cors());

//Create a http server
const server = http.createServer(app);

//Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

//Handle client connections
io.on("connection", (socket) => {
  console.log("Connnection made.");

  // Set up a listener on the client side to handle the "join" event
  socket.on("join", (data) => {
    // When a "join" event is received from the server,
    // the data associated with the event is passed to this function.

    // Assign the received data (presumably the username) to a property called "username" on the socket object.
    socket.username = data;

    // Send old Messages to the client

    // Find old messages from the database, sort them by timestamp in ascending order, and limit the result to 50 messages.
    chatModel
      .find()
      .sort({ timestamp: 1 })
      .limit(50)
      .then((messages) => {
        // When the messages are successfully retrieved from the database:

        // Emit a 'load_messages' event to the socket (client) with the retrieved messages.
        socket.emit("load_messages", messages);
      })
      .catch((err) => {
        // If there's an error during the database query:

        // Log the error to the console for debugging purposes.
        console.log(err);
      });
  });

  // Set up a listener on the client side to handle the "new_message" event
  socket.on("new_message", (message) => {
    // When a "new_message" event is received from the server,
    // the message associated with the event is passed to this function.

    // Create an object to represent the user's message
    // This object contains the username associated with the socket
    // and the message content received from the server.
    let userMessage = {
      username: socket.username, // Assign the username stored in the socket object
      message: message, // Assign the received message
    };
    //Just before broadcasting we will save it to database
    const newChat = new chatModel({
      username: socket.username,
      message: message,
      timestamp: new Date(),
    });
    newChat.save();

    // Broadcast the user's message to all connected clients except the current client
    // by emitting a "broadcast_message" event with the userMessage object.
    // This allows all other clients to receive the message except the one that sent it.
    socket.broadcast.emit("broadcast_message", userMessage);
  });

  // Handle events and interaction here

  //Handle disconnects
  socket.on("disconnect", () => {
    console.log("Connection disconnected");
  });
});

//Start the server on the port 3000
server.listen(3000, () => {
  console.log("App is Listenig on port 3000");
  connect();
});
