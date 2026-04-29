//variables from ben
let socket;
let currentRound = 1;
let hasVoted = false;
let statusMsg = '';
let resultMsg = '';
let tallyMsg = '';
let btnA, btnB, resetBtn;
//end of variables from ben


let cityB
let foodstoreB
let restaurantB
let restkitB
let carB
let jailB
let SMhouseB
let dialogueB
let sugarM
let Mag
let Jojo
let Leon
let Queen
let Demi

let loc = "city"
let player = null
let isSpectator = false


function preload(){
  city = loadImage("town.jpg")
  carl_s = loadImage("foodplace.jpg")
  prison = loadImage("mugshot.jpeg")
  cooking = loadImage("kitchen.jpg")
  vechicle = loadImage("carro.jpeg")
  shop = loadImage("store.jpg")
  paper = loadImage("LinedPaperBackground.jpg")
  SM = loadImage("Sugarmama.png")
  J = loadImage("Joey.png")
  D = loadImage("Demi.png")
  M = loadImage("Maggie.png")
  L = loadImage("Leon.png")
  RQ = loadImage("Rat.png")
}

function setup() {
  createCanvas(400, 400);

  btnA = createButton('...');
  btnA.mousePressed(() => castVote(btnA.elt.dataset.key));
  btnA.position(100, 200);

  btnB = createButton('...');
  btnB.mousePressed(() => castVote(btnB.elt.dataset.key));
  btnB.position(300, 200);

  resetBtn = createButton('Play Again');
  resetBtn.mousePressed(() => socket.emit('reset'));
  resetBtn.position(175, 300);
  resetBtn.hide();

  socket = io();

  socket.on('character-assigned', (character) => {
    player = character;
  });

  socket.on('spectator', () => {
    isSpectator = true;
    btnA.hide();
    btnB.hide();
  });

  socket.on('round', (r) => {
    currentRound = r;
    hasVoted = false;
  });

  socket.on('loc-update', ({ loc: newLoc, options }) => {
    loc = newLoc;
    if (options.length > 0) {
      btnA.html(options[0].label);
      btnA.elt.dataset.key = options[0].key;
      btnA.removeAttribute('disabled');
      btnA.show();

      if (options[1]) {
        btnB.html(options[1].label);
        btnB.elt.dataset.key = options[1].key;
        btnB.removeAttribute('disabled');
        btnB.show();
      } else {
        btnB.hide();
      }
      hasVoted = false;
    } else {
      btnA.hide();
      btnB.hide();
    }
  });

  socket.on('vote-result', ({ winner, round, tally }) => {
    currentRound = round;
    resultMsg = `Round ${round - 1} winner: ${winner}`;
    tallyMsg = Object.entries(tally).map(([k, v]) => `${k}: ${v}`).join('   |   ');
    statusMsg = '';
  });
}

function draw() {
  background(220);


  if (isSpectator) {
    fill(180);
    textSize(14);
    text('spectating', width / 2, 85);
  }

  noStroke();
  fill(80);
  textSize(20);
  text(`Round ${currentRound}`, width / 2, 60);

  fill(150);
  textSize(16);
  text(statusMsg, width / 2, height / 2 + 80);

  fill(30);
  textSize(24);
  text(resultMsg, width / 2, height / 2 + 130);

  fill(100);
  textSize(16);
  text(tallyMsg, width / 2, height / 2 + 170);


  if(player === "SM"){
    image(SM,100,100,100, 100)
  }else if(player === "J"){
    image(J, 100,100,200,200)
  } else if (player === "D"){
    image(D, 200,200,200,200)
  } else if (player === "A"){
    image(L, 100,200,100,200)
  } else if (player === "M"){
    image(M, 200,100,200,100)
  }


  if(loc === "city"){
    text('city 🏙️',100,100)
    //image for the city, 
    // text stuff for the city...

    resetBtn.hide();
  } else if(loc === "citygrocery"){
    text('city > grocery',100,100)
    resetBtn.hide();
  } else if(loc === "cityresturant"){
    text('city > resturant',100,100)
    resetBtn.hide();
  } else if(loc === "grocery"){
    text('grocery🌭',100,100)
    resetBtn.hide();
  } else if(loc === "groceryjail"){
    text('grocery > jail',100,100)
    resetBtn.hide();
  } else if(loc === "grocerysmhouse"){
    text('grocery > smhouse',100,100)
    resetBtn.hide();
  } else if(loc === "resturant"){
    text('resturant🍴',100,100)
    resetBtn.hide();
  } else if(loc === "resturantresturantkitchen"){
    text('resturant > kitchen',100,100)
    resetBtn.hide();
  } else if(loc === "resturantcarinterior"){
    text('resturant > car',100,100)
    resetBtn.hide();
  } else if(loc === "jail"){
    text('jail📶',100,100)
    resetBtn.show();
  } else if (loc === "smhouse"){
    text('smhouse🐶',100,100)
    resetBtn.show();
  } else if (loc === "resturantkitchen"){
    text('rest kitch ⏲️',100,100)
    resetBtn.show();
  } else if (loc === "carinterior"){
    text('car int 🚌',100,100)
    resetBtn.show();
  }
}


function castVote(choice) {
  socket.emit('vote', choice);
  hasVoted = true;
  btnA.attribute('disabled', '');
  btnB.attribute('disabled', '');
  statusMsg = 'Vote cast! Waiting for others...';
  resultMsg = '';
  tallyMsg = '';
}


function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
