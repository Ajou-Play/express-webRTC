const { Server } = require("socket.io");
const wrtc = require("@koush/wrtc");
const { makePC } = require("./MyWebRTC");

const SocketMap = {};
// // 상품 Seller의 PC
// const ProductPC = {};
// 상품 Seller PC의 Stream 데이터
/**
 * {
 *  1 : {
 *    userId : stream
 *  }
 * }
 */
const ProductStream = {};
// // 상품에 참여하는 사람들 정보
/**
 * {
 *  1 : [userId]
 * }
 */
const ProductJoinUsers = {};
// // 상품에 참여하는 모든 유저들의 pc 정보
/**
 * {
 *  userId : pc
 * }
 */
const ProductUsersPC = {};

/**
 * 보내는 용도
 *
 * {
 *  1 : [{id : 2, pc}]
 * }
 */
const sendPC = {};

const socketInit = (server, app) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  app.set("io", io);
  io.on("connection", (socket) => {
    const req = socket.request;
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    console.log("socket 연결 성공 ip : ", ip);
    console.log(socket.id);

    //여기 부터 chating

    socket.on("setUid", (Id) => {
      SocketMap[Id] = socket.id;
      console.log(SocketMap);
    });

    //  여기부터 rtc

    socket.on("joinCamChat", ({ chatRoomId, userId }) => {
      console.log("joinCamChat");
      io.to(socket.id).emit(
        "existingUsers",
        ProductJoinUsers[chatRoomId]?.filter((user) => user !== userId) ?? []
      );

      // // broadcast
      app.get("io").to(chatRoomId).emit("joinUser", userId);

      const onIceCandidateCallback = ({ candidate }) => {
        if (candidate) {
          console.log("in candidate");
          io.to(socket.id).emit("getCandidate", { candidate, userId });
        }
      };

      const onTrackCallback = (e) => {
        ProductStream[chatRoomId] = { [userId]: { stream: e.streams[0] } };
      };

      const pc = makePC(onIceCandidateCallback, onTrackCallback);
      ProductUsersPC[userId] = pc;

      (ProductJoinUsers[chatRoomId] ??= []).push(userId);
      socket.join(chatRoomId);
    });

    const handleSendPCCandidate = (userId, myId, chatRoomId) => {
      console.log("userId : ", userId);
      console.log("myId : ", myId);
      if (userId === myId) return ProductUsersPC[userId];
      const [user] = sendPC[myId].filter((user) => user.id === userId);
      return user.pc;
    };

    socket.on("sendCandidate", ({ candidate, userId, myId, chatRoomId }) => {
      console.log("sendCandidate");
      const pc = handleSendPCCandidate(userId, myId, chatRoomId);
      if (!pc) return;
      if (!candidate) return;
      pc.addIceCandidate(new wrtc.RTCIceCandidate(candidate));
    });

    const handleSendPC = ({ userId, myId, chatRoomId }) => {
      if (userId === myId) return ProductUsersPC[userId];
      const onIceCandidateCallback = ({ candidate }) => {
        console.log("??tlqkfdk");
        console.log(socket.id);
        if (candidate) {
          io.to(socket.id).emit("getCandidate", { candidate, userId });
        }
      };
      const onTrackCallback = (e) => {
        console.log("tq 발생했냐?");
      };
      const pc = makePC(onIceCandidateCallback, onTrackCallback);
      (sendPC[myId] ??= []).push({ id: userId, pc });
      if (!ProductStream[chatRoomId][userId]) return pc;
      const { stream } = ProductStream[chatRoomId][userId];
      const tracks = stream.getTracks();
      tracks.forEach((track) => {
        console.log("track : ", track);
        pc.addTrack(track, stream);
      });
      console.log("정상 작동 : ", pc);

      return pc;
    };
    socket.on("sendOffer", async ({ sdp, userId, myId, chatRoomId }) => {
      console.log("sendOffer");
      console.log("userId : ", userId);
      console.log("myId : ", myId);
      console.log("-------------------");
      const pc = handleSendPC({ userId, myId, chatRoomId });
      if (!pc) return;
      pc.setRemoteDescription(sdp);

      const answerSdp = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVIdeo: true,
      });

      pc.setLocalDescription(answerSdp);

      io.to(socket.id).emit("getAnswer", { sdp: answerSdp, userId });
    });
    //   socket.on("leaveRoom", () => {
    //     try {
    //       let roomId = socketToRoom[socket.id];

    //       deleteUser(socket.id, roomId);
    //       closeReceiverPC(socket.id);
    //       closeSenderPCs(socket.id);
    //       app.get("io").to(roomId).emit("userExit", socket.id);
    //     } catch (error) {
    //       console.log(error);
    //     }
    //   });
    //   socket.on("disconnect", () => {
    //     try {
    //       console.log("disconnect : ", socket.id);
    //       let roomId = socketToRoom[socket.id];

    //       deleteUser(socket.id, roomId);
    //       closeReceiverPC(socket.id);
    //       closeSenderPCs(socket.id);
    //       app.get("io").to(roomId).emit("userExit", socket.id);
    //     } catch (error) {
    //       console.log(error);
    //     }
    //   });
  });
};

exports.SocketMap = SocketMap;
exports.socketInit = socketInit;
