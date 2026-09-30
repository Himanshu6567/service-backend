const { Server } = require("socket.io");
require("dotenv").config();

let io;
//console.log(process.env.clientOrigin)
function initializeSocket(server) {
  //create server
  io = new Server(server, {
    cors: {
      origin: process.env.clientOrigin, //frontend url
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    //request accept
    socket.on("reqAccept", (data) => {
      io.emit("reqAccept", data);
    });

    //new request notification
    socket.on("newRequest", (data) => {
      io.emit("newRequest", data);
    });

    socket.on("chatMessage", (data) => {
      io.emit("chatMessage", data);
    });

    //request reject
    socket.on("reqReject", (data) => {
      io.emit("reqReject", data);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
  return io;
}

function getSocketIO() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

module.exports = { initializeSocket, getSocketIO };
