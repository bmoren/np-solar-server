/**
 * solar.js — simple real-time messaging for the classroom
 *
 * Include this script AFTER socket.io in your HTML:
 *   <script src="/socket.io/socket.io.js"></script>
 *   <script src="/solar.js"></script>
 *
 * Then use solar.* functions anywhere — inline onclick="" or in <script> blocks.
 */

const solar = (() => {
  const socket = io();
  const _listeners = {};

  // Internal: fire all registered callbacks for an event
  function _emit(event, data) {
    (_listeners[event] || []).forEach(fn => fn(data));
  }

  // Wire up socket events → solar listeners
  socket.on('message',      data => _emit('message', data));
  socket.on('room-message', data => _emit('room-message', data));
  socket.on('joined',       data => _emit('joined', data));
  socket.on('connect',      ()   => _emit('connect', { id: socket.id }));
  socket.on('disconnect',   ()   => _emit('disconnect', {}));

  return {

    /**
     * Send a message to everyone connected.
     * solar.send('hello')
     * solar.send({ text: 'hi', color: 'red' })
     */
    send(message) {
      const data = typeof message === 'string' ? { text: message } : message;
      socket.emit('message', data);
    },

    /**
     * Join a named room.
     * solar.join('group1')
     */
    join(room) {
      socket.emit('join', room);
    },

    /**
     * Send a message to everyone in a room.
     * solar.sendTo('group1', 'hello group')
     * solar.sendTo('group1', { text: 'hi', x: 100 })
     */
    sendTo(room, message) {
      const data = typeof message === 'string' ? { text: message } : message;
      socket.emit('room-message', { room, ...data });
    },

    /**
     * Listen for an event and run a function when it happens.
     * Call this in a <script> block — not inline.
     *
     * Events: 'message', 'room-message', 'joined', 'connect', 'disconnect'
     *
     * solar.on('message', function(data) {
     *   console.log(data.text);
     * });
     */
    on(event, callback) {
      if (!_listeners[event]) _listeners[event] = [];
      _listeners[event].push(callback);
    },

    /**
     * Returns this client's unique socket ID.
     * solar.myId()
     */
    myId() {
      return socket.id;
    },

  };
})();
