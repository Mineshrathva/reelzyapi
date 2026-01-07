export default function chatSocket(io) {
  io.on("connection", (socket) => {
    console.log("Client connected");

    socket.on("join_chat", (chat_id) => {
      socket.join(`chat_${chat_id}`);
    });

    socket.on("send_message", (data) => {
      io.to(`chat_${data.chat_id}`).emit("new_message", data);
    });

    socket.on("typing", (data) => {
      io.to(`chat_${data.chat_id}`).emit("user_typing", data);
    });

    socket.on("seen", (data) => {
      io.to(`chat_${data.chat_id}`).emit("message_seen", data);
    });
  });
}
