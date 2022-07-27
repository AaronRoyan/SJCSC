module.exports.chatSockets = function (socketServer) {
  let io = require('socket.io')(socketServer); //importing the socket.io

  io.sockets.on('connection', function (socket) {
    // reciving the chat server
    //on connection being fired then we rrecive the connection
    console.log('new connection received', socket.id);
    //when client gets disconnected then this event gets triggered
    socket.on('disconnect', function () {
      console.log('socket disconnected!');
    });
    // when new user joins the user .on detetc the client
    socket.on('join_room', function (data) {
      console.log('joining request rec.', data);

      socket.join(data.chatroom);
      // joining the socket to the chat room with that new user or if present then will contiue
      io.in(data.chatroom).emit('user_joined', data);
    });

    // CHANGE :: detect send_message and broadcast to everyone in the room
    socket.on('send_message', function (data) {
      //it will recieve the message and sends to all the members in the chat room
      io.in(data.chatroom).emit('receive_message', data);
    });
  });
};
