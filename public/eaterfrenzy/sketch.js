// ===== Network =====
let socket;
let myId = null;
let remotePlayers = {};  // socketId → { x, y, alive, score }  (x/y are 0-1 fractions)
let diedEmitted = false;

// ===== Game Variables =====
let state;
let goobers = [];
let play = [];
let numberGoobers;
let spawnrate;
let efFrame = 0; // local frame counter, reset each new game so all clients stay in step

// SETUP -----------------------------------------------------
function setup() {
  state = 'startGame';
  createCanvas(windowWidth, windowHeight);

  // One local player 
  play.push(new Player());

  // ===== Socket Setup =====
  socket = io();

  //on is listening for message from the server

  //we just turn on the listener, and thenits on. do it once, but it runs forever.


  //whern i connect, lets make an id for my game player
  socket.on('connect', () => {
    myId = socket.id;
    //send server a message to join the game.
    socket.emit('ef:join');
  });

  socket.on('ef:welcome', ({ state: s, players, seed }) => {
    state = s;
    remotePlayers = players;
    // Recreate goobers if joining a game already in progress
    if (s === 'actualGame') efInitGoobers(seed);
  });

  // Server fires this when any player presses 2 — seed ensures identical goobers everywhere
  socket.on('ef:seed', (seed) => {
    efInitGoobers(seed);
  });

  socket.on('ef:players', (players) => {
    // If server revived our player (after reset), sync that locally
    if (myId && players[myId] && players[myId].alive && !play[0].alive) {
      play[0].alive = true;
      play[0].score = 0;
      diedEmitted = false;
    }
    remotePlayers = players;
  });

  socket.on('ef:state', (newState) => {
    state = newState;
  });
}

// DRAW ------------------------------------------------------
function draw() {
  background(0);

  // --- startGame state ---
  if (state === 'startGame') {
    push();
      fill(255, 255, 255, 100);
      rect(0, 0, windowWidth, windowHeight);
      textAlign(CENTER);
      textSize(50);
      text('Watch for the colored Balls!', windowWidth / 2, windowHeight / 2 - 100);
      text('Last one standing wins!', windowWidth / 2, windowHeight / 2 - 40);
    pop();
    push();
      textAlign(CENTER);
      textSize(30);
      fill(0);
      text('Press 2 to play', windowWidth / 2, windowHeight / 2 + 20);
    pop();
  }

  // --- actualGame state ---
  if (state === 'actualGame') {
    efFrame++;

    // Spawn goobers on schedule (same logic as original, keeps all clients in step)
    if (efFrame % spawnrate === 0) {
      goobers.push(new evilGoober());
      numberGoobers++;
    }
    if (numberGoobers >= 90)      spawnrate = 10;
    else if (numberGoobers >= 60) spawnrate = 30;
    else if (numberGoobers >= 30) spawnrate = 60;

//socket.emit, send amessage to the server...


    // Send local mouse position as normalised 0-1 fractions
    if (socket && myId) {
      socket.emit('ef:position', {
        x: mouseX / windowWidth,
        y: mouseY / windowHeight,
      });
    }

    // Local player — uses Player.js unchanged (render, collision, score)
    play[0].renderPlayer();
    play[0].collision(goobers);
    play[0].scoreCounter();

    // Notify server of death once
    if (!play[0].alive && !diedEmitted) {
      socket.emit('ef:died');
      diedEmitted = true;
    }

    // Remote players — scale their 0-1 position to this screen
    for (const [id, p] of Object.entries(remotePlayers)) {
      if (id === myId) continue;
      push();
        noStroke();
        fill(p.alive ? color(255, 255, 255, 100) : color(255, 0, 0, 255)); 

        //opposite of the 0-1 normilization
        ellipse(p.x * windowWidth, p.y * windowHeight, 10, 10);
      pop();
    }

    // Goobers — local physics via evilGoober.js (unchanged)
    for (let i = 0; i < numberGoobers; i++) {
      goobers[i].renderGoober();
      goobers[i].moveGoober();
      goobers[i].noLeave();
    }
  }

  // --- gameOver state ---
  if (state === 'gameOver') {
    push();
      fill(255, 255, 255, 100);
      rect(0, 0, windowWidth, windowHeight);
      textSize(50);
      textAlign(CENTER);
      text('game over... reset?', windowWidth / 2, windowHeight / 2);
    pop();
    push();
      textAlign(CENTER);
      textSize(30);
      fill(0);
      text('Press 1 to start over', windowWidth / 2, windowHeight / 2 + 20);
    pop();
  }
}

// KEY PRESSES -----------------------------------------------
function keyPressed() {
  if (key === '2') socket.emit('ef:start');
  if (key === '1') {
    socket.emit('ef:reset');
    diedEmitted = false;
  }
}

// GOOBER HELPERS --------------------------------------------
function efInitGoobers(seed) {
  randomSeed(seed); // same seed → same evilGoober properties on every client
  goobers = [];
  numberGoobers = 10;
  spawnrate = 120;
  efFrame = 0;
  for (let i = 0; i < numberGoobers; i++) goobers.push(new evilGoober());
}
