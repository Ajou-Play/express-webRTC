const { Server } = require('socket.io');

const getRandomColor = () => {
  const randomColor = Math.floor(Math.random() * 16777215).toString(16);
  return '#' + randomColor;
};

const getUniqueRandomColor = () => {
  let color = getRandomColor();
  while (Color.includes(color)) {
    color = getRandomColor();
  }
  Color.push(color);
  return color;
};

let Color = [];

const socketInit = (server, app) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket'],
  });

  app.set('io', io);
  io.on('connection', (socket) => {
    console.log(socket);
    socket.on('get-document', async (docId) => {
      console.log(docId);
      // const document = await findOrCreateDocument(docId);
      let cursors = {};
      socket.join(docId);
      socket.emit('load-document', '');

      socket.on('send-changes', (delta) => {
        socket.broadcast.to(docId).emit('receive-changes', delta);
      });

      socket.on('send-cursor-changes', (rangemap) => {
        const color =
          cursors[socket.id]?.color === undefined
            ? getUniqueRandomColor(Color)
            : cursors[socket.id]?.color;
        cursors[socket.id] = {
          range: rangemap.range,
          color,
          id: rangemap.id,
        };
        socket.broadcast.to(docId).emit('receive-cursor-changes', cursors);
      });
    });
  });
};

// exports.SocketMap = SocketMap;
exports.socketInit = socketInit;
