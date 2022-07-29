class ChatEngine {
  constructor(chatBoxId, userEmail) {
    //chat id and the useremail
    this.chatBox = $(`#${chatBoxId}`);
    this.userEmail = userEmail;

    this.socket = io.connect('process.env.PORT'); //initiating the connection for socket.io
    // io is a globel variable given by socket.io
    //fires a connection
    if (this.userEmail) {
      //if useremail is present then call connection handler
      this.connectionHandler();
    }
  }

  connectionHandler() {
    let self = this;

    this.socket.on('connect', function () {
      //on means on even takes place
      //when a conneect evnt has occured the console log
      console.log('connection established using sockets...!');
      //when new user is joing the chat room
      self.socket.emit('join_room', {
        user_email: self.userEmail, // while sending the request
        chatroom: 'codeial', // chat room name
      });

      self.socket.on('user_joined', function (data) {
        console.log('a user joined!', data);
      });
    });

    // CHANGE :: send a message on clicking the send message button
    $('#send-message').click(function () {
      let msg = $('#chat-message-input').val();

      if (msg != '') {
        // not empty it will send the message to the socket.io
        self.socket.emit('send_message', {
          message: msg,
          user_email: self.userEmail,
          chatroom: 'codeial',
        });
      }
    });

    self.socket.on('receive_message', function (data) {
      console.log('message received', data.message);

      let newMessage = $('<li>');
      // setting the default type
      let messageType = 'other-message';
      // if self message then
      if (data.user_email == self.userEmail) {
        messageType = 'self-message';
      }

      newMessage.append(
        $('<span>', {
          html: data.message,
        })
      );

      newMessage.append(
        $('<sub>', {
          html: data.user_email,
        })
      );

      newMessage.addClass(messageType);

      $('#chat-messages-list').append(newMessage);
    });
  }
}
