/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] https://raw.githubusercontent.com/ralphv/nodetastic/master/LICENSE.
 * do not remove this notice.
 */

"use strict";

var logger = require("../logger.js");

module.exports = function(mapper, server, sessionMiddleWare) {
  logger.log("Adding Socket.IO support");

  var io = require('socket.io')(server);
  io.use(function(socket, next) {
    sessionMiddleWare(socket.request, socket.request.res, next);
  });
  io.on('connection', function(socket) {
    var roomId = mapper.sessionToSocketIORoomFn(socket.request.session);
    if(roomId) {
      socket.roomId = roomId;
      socket.join(roomId);
      io.to(roomId).emit("channel", {"type": "connect", data: ""});
    }
    socket.on('channel', function(data) {
      mapper.socketIoRecieveDataFn(data); //*/ must pass through same dependency engine handler
    });
    socket.on('disconnect', function() {
      if(socket.roomId) {
        io.to(socket.roomId).emit("channel", {"type": "disconnect", data: ""});
      }
    });
  });
  mapper.injectReservedValue("$roomId", function(obj, $session) {
    var roomId = mapper.sessionToSocketIORoomFn($session.getCoreSession());
    if(!roomId) {
      return mapper.emptyValue;
    } else {
      return roomId;
    }
  });
  mapper.injectReservedValue("$sio", function() {
    return io;
  });
  mapper.injectReservedValue("$socket", function(obj, $sio, $roomId) {
    if($sio === mapper.emptyValue || !$sio) {
      return mapper.emptyValue;
    }
    return function(data) {
      $sio.to($roomId).emit("channel", data);
      return $sio.sockets.clients($roomId).length;
    }
  });
};