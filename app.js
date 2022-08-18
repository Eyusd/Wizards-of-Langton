import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from 'https://www.gstatic.com/firebasejs/9.9.2/firebase-auth.js';
import { getDatabase, ref, set, onDisconnect, onValue, onChildAdded, onChildRemoved, update } from 'https://www.gstatic.com/firebasejs/9.9.2/firebase-database.js';

// NOTE - INCLUDE YOUR FIREBASE CONFIG HERE FOR ANYTHING TO WORK:
const firebaseConfig = {
    apiKey: "AIzaSyDGs6254O6_U8_4zeSIQDqxRcQaPThfmr0",
    authDomain: "langton-cb1cd.firebaseapp.com",
    databaseURL: "https://langton-cb1cd-default-rtdb.firebaseio.com",
    projectId: "langton-cb1cd",
    storageBucket: "langton-cb1cd.appspot.com",
    messagingSenderId: "930846566670",
    appId: "1:930846566670:web:a603d82832ab4c91bb8f5f",
    measurementId: "G-LNZTSQMGJZ"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

let tilesinit = false;

const colors = {red: ['#F8A700', '#F87705', '#F8D204'],
                white: ['#FF00A8', '#FF03CA', '#FF0331'],
                pink: ['#490DFF', '#094BFF', '#7907FF'],
                blue: ['#00F53D', '#46C917', '#04C952']};
const bubbles = 25;

const explode = (x, y, direction, col) => {
  let particles = [];
  let ratio = window.devicePixelRatio;
  let c = document.createElement('canvas');
  let ctx = c.getContext('2d');

  c.style.position = 'absolute';
  c.style.left = x - 100 + 'px';
  c.style.top = y - 100 + 'px';
  c.style.pointerEvents = 'none';
  c.style.width = 200 + 'px';
  c.style.height = 200 + 'px';
  c.style.zIndex = -0.1;
  c.width = 200 * ratio;
  c.height = 200 * ratio;
  document.body.appendChild(c);

  let a = 0;
  let b = 360;
  switch (direction) {
    case "left": a = -10; b = 10; break;
    case "up": a = 80; b = 100; break;
    case "right": a = 170; b = 190; break;
    case "down": a = 260; b = 280; break
  }
  for (var i = 0; i < bubbles; i++) {
    particles.push({
      x: c.width / 2,
      y: c.height / 2,
      radius: r(20, 30),
      color: colors[col][Math.floor(Math.random() * colors[col].length)],
      rotation: r(a, b, true),
      speed: r(5, 9),
      friction: 0.9,
      opacity: r(0, 0.5, true),
      yVel: 0,
      gravity: 0.1 });

  }

  render(particles, ctx, c.width, c.height);
  setTimeout(() => document.body.removeChild(c), 1000);
};

const render = (particles, ctx, width, height) => {
  requestAnimationFrame(() => render(particles, ctx, width, height));
  ctx.clearRect(0, 0, width, height);

  particles.forEach((p, i) => {
    p.x += p.speed * Math.cos(p.rotation * Math.PI / 180);
    p.y += p.speed * Math.sin(p.rotation * Math.PI / 180);

    p.opacity -= 0.01;
    p.speed *= p.friction;
    p.radius *= p.friction;
    p.yVel += p.gravity;
    p.y += p.yVel;

    if (p.opacity < 0 || p.radius < 0) return;

    ctx.beginPath();
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = p.color;
    ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI, false);
    ctx.fill();
  });

  return ctx;
};

const r = (a, b, c) => parseFloat((Math.random() * ((a ? a : 1) - (b ? b : 0)) + (b ? b : 0)).toFixed(c ? c : 0));


const mapData = {
  minX: 1,
  maxX: 13,
  minY: 1,
  maxY: 13,
};

// Options for Player Colors... these are in the same order as our sprite sheet
const playerColors = ["red", "white", "pink", "blue"];

//Misc Helpers
function randomFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}
function getKeyString(x, y) {
  return `${x}x${y}`;
}

function createName() {
  const prefix = randomFromArray([
    "COOL",
    "SUPER",
    "HIP",
    "SMUG",
    "COOL",
    "SILKY",
    "GOOD",
    "SAFE",
    "DEAR",
    "DAMP",
    "WARM",
    "RICH",
    "LONG",
    "DARK",
    "SOFT",
    "BUFF",
    "DOPE",
  ]);
  const animal = randomFromArray([
    "BEAR",
    "DOG",
    "CAT",
    "FOX",
    "LAMB",
    "LION",
    "BOAR",
    "GOAT",
    "VOLE",
    "SEAL",
    "PUMA",
    "MULE",
    "BULL",
    "BIRD",
    "BUG",
  ]);
  return `${prefix} ${animal}`;
}

function isOOB(x,y) {
  return (
    x >= mapData.maxX ||
    x < mapData.minX ||
    y >= mapData.maxY ||
    y < mapData.minY
  )
}


(function () {

  let playerId;
  let playerRef;
  let playerInfosRef;
  let players = {};
  let playerElements = {};
  let tiles = {};
  let tileElements = {};
  let projs = {};
  let projElements = {};
  let playersInfos = {};
  let gameinfos = {gamestart: false, alive: 0, ready: false, host: false};

  const gameContainer = document.querySelector(".game-container");
  const playerNameInput = document.querySelector("#player-name");
  const playerColorButton = document.querySelector("#player-color");
  const fireButton = document.querySelector("#fire");
  const readyButton = document.querySelector("#ready");

  function getRandomSafeSpot() {
    let pos = {x: mapData.minX + Math.floor((mapData.maxX - mapData.minX)*Math.random()), y: mapData.minY + Math.floor((mapData.maxY - mapData.minY)*Math.random())};
    return(pos);
  }

  function canStep(x,y) {
    return (
      tiles[getKeyString(x,y)].type != "void"
    )
  }

  function act(key, life) {
    const projRef = ref(database, `projs/${key}`);
    const proj = projs[key];
    const todo = proj.rule[tiles[getKeyString(proj.x, proj.y)].type];
    const tileRef = ref(database, `tiles/${getKeyString(proj.x, proj.y)}`);
    let stay = false;
    todo.forEach((task) => {
      switch (task) {
        case "go left":      projs[key].dir = "left"; update(projRef, {dir: projs[key].dir}); break;
        case "go right":     projs[key].dir = "right"; update(projRef, {dir: projs[key].dir}); break;
        case "go up":        projs[key].dir = "up"; update(projRef, {dir: projs[key].dir}); break;
        case "go down":      projs[key].dir = "down"; update(projRef, {dir: projs[key].dir}); break;
        case "turn right":   switch (projs[key].dir) {
                              case "left": projs[key].dir = "up"; update(projRef, {dir: projs[key].dir}); break;
                              case "right": projs[key].dir = "down"; update(projRef, {dir: projs[key].dir}); break;
                              case "up": projs[key].dir = "right"; update(projRef, {dir: projs[key].dir}); break;
                              case "down": projs[key].dir = "left"; update(projRef, {dir: projs[key].dir}); break;
                              default: break;
                            }; break;
        case "turn left":   switch (projs[key].dir) {
                              case "right": projs[key].dir = "up"; update(projRef, {dir: projs[key].dir}); break;
                              case "left": projs[key].dir = "down"; update(projRef, {dir: projs[key].dir}); break;
                              case "down": projs[key].dir = "right"; update(projRef, {dir: projs[key].dir}); break;
                              case "up": projs[key].dir = "left"; update(projRef, {dir: projs[key].dir}); break;
                              default: break;
                            }; break;
        case "turn back":   switch (projs[key].dir) {
                              case "right": projs[key].dir = "left"; update(projRef, {dir: projs[key].dir}); break;
                              case "left": projs[key].dir = "right"; update(projRef, {dir: projs[key].dir}); break;
                              case "down": projs[key].dir = "up"; update(projRef, {dir: projs[key].dir}); break;
                              case "up": projs[key].dir = "down"; update(projRef, {dir: projs[key].dir}); break;
                              default: break;
                            }; break;
        case "stay": stay = true; break;
        case "fill oak": tiles[getKeyString(proj.x, proj.y)].type = "oak"; 
                          update(tileRef, tiles[getKeyString(proj.x, proj.y)]); 
                          break;
        case "fill spruce": tiles[getKeyString(proj.x, proj.y)].type = "spruce"; 
                          update(tileRef, tiles[getKeyString(proj.x, proj.y)]); 
                          break;
        case "fill tile": tiles[getKeyString(proj.x, proj.y)].type = "tile"; 
                          update(tileRef, tiles[getKeyString(proj.x, proj.y)]); 
                          break;
        case "fill void": tiles[getKeyString(proj.x, proj.y)].type = "void"; 
                          update(tileRef, tiles[getKeyString(proj.x, proj.y)]); 
                          break;
        case "fill cobble":  tiles[getKeyString(proj.x, proj.y)].type = "cobble";
                          update(tileRef, tiles[getKeyString(proj.x, proj.y)]); 
                          break;
        default: break;
      };
    })

    if (!stay) {
      switch (projs[key].dir) {
        case "up": projs[key].y = proj.y-1; break;
        case "down": projs[key].y = proj.y+1; break;
        case "left": projs[key].x = proj.x-1; break;
        case "right": projs[key].x = proj.x+1; break;
      };
      if (isOOB(projs[key].x, projs[key].y )) {
        set(projRef, null);
        return 0;
      } else {
        update(projRef, {x: projs[key].x, y: projs[key].y});
      }
    }

    Object.keys(players).forEach((id) => {
      if (players[id].x == projs[key].x && players[id].y == projs[key].y) {
        if (gameinfos.gamestart) {
          update(ref(database, `players/${players[id].id}`), {direction: "dead"});
          update(ref(database, `infos/${players[id].id}`), {alive: false, ready: false})

        }
        set(projRef, null);
        return 0
      }
    })

    if (life > 0) {
      setTimeout(() => {
        act(key, life - 1);
      }, 300);
    } else {set(projRef, null); return 0;}
  }


  function placeTile(x, y, type) {
    const tileRef = ref(database, `tiles/${getKeyString(x, y)}`);
    set(tileRef, {x, y, type})
  }

  function initTiles() {
    for (var i=mapData.minX; i<mapData.maxX; i++) {
      for (var j=mapData.minY; j<mapData.maxY; j++) {
        placeTile(i,j,randomFromArray(["oak", "tile", "cobble", "spruce", "void"]));
      }
    };
    tilesinit = true;
    set(ref(database, `projs`), null);
  }

  function fillTiles() {
    for (var i=mapData.minX; i<mapData.maxX; i++) {
      for (var j=mapData.minY; j<mapData.maxY; j++) {
        placeTile(i,j,"oak");
      }
    };
    tilesinit = true;
    set(ref(database, `projs`), null);
  }

  function initSelect() {
    ["oak", "tile", "cobble", "spruce", "void"].forEach((color) => {
      ["dir", "fill"].forEach((action) => {
        var select = document.querySelector(`#${color}-${action}`);
        var items = select.getElementsByTagName('option');
        var index = Math.floor(Math.random() * items.length);

        select.selectedIndex = index;
      })
    })
  }

  function placeProj() {

    let xChange = 0;
    let yChange = 0;

    switch (players[playerId].direction) {
      case "up": yChange = -1; break;
      case "left": xChange = -1; break;
      case "right": xChange = 1; break;
      case "down": yChange = 1; break;
    }

    if (!isOOB(players[playerId].x + xChange, players[playerId].y + yChange)) {
      let rules = {};
      ["oak", "tile", "cobble", "spruce", "void"].forEach((color) => {
        let arr = ["nothing", "nothing"];
        var n = 0;
        ["dir", "fill"].forEach((action) => {
          const el = document.querySelector(`#${color}-${action}`);
          arr[n] = el.value;
          n = n+1;
        })
        rules[color] = arr;
      })


      const key = playerId + Math.floor(Math.random()*10000000);
      const projRef = ref(database, `projs/${key}`);
      set(projRef, {x: players[playerId].x + xChange, y: players[playerId].y + yChange, dir: players[playerId].direction, rule: rules, key:`${key}`, color: players[playerId].color})
      act(`${key}`, 50);
    }
  }


  function handleArrowPress(xChange=0, yChange=0) {
    const newX = players[playerId].x + xChange;
    const newY = players[playerId].y + yChange;
    if (playersInfos[playerId].alive) {
      if (!isOOB(newX, newY) && players[playerId].coins > 0 && canStep(newX,newY)) {
        //move to the next space
        if  ((players[playerId].direction == "down" && yChange == 1) ||
            (players[playerId].direction == "up" && yChange == -1) ||
            (players[playerId].direction == "right" && xChange == 1) ||
            (players[playerId].direction == "left" && xChange == -1)) {
          players[playerId].x = newX;
          players[playerId].y = newY;
          players[playerId].coins = players[playerId].coins - 1;
        }
      }
      if (yChange === 1) {
        players[playerId].direction = "down";
      }
      if (yChange === -1) {
        players[playerId].direction = "up";
      }
      if (xChange === 1) {
        players[playerId].direction = "right";
      }
      if (xChange === -1) {
        players[playerId].direction = "left";
      }
      update(playerRef, {direction: players[playerId].direction, x: players[playerId].x, y: players[playerId].y, coins: players[playerId].coins});
    }
  }

  function initGame() {

    new KeyPressListener("ArrowUp", () => handleArrowPress(0, -1))
    new KeyPressListener("ArrowDown", () => handleArrowPress(0, 1))
    new KeyPressListener("ArrowLeft", () => handleArrowPress(-1, 0))
    new KeyPressListener("ArrowRight", () => handleArrowPress(1, 0))

    const allPlayersRef = ref(database, `players`);
    const allTilesRef = ref(database, `tiles`);
    const allProjsRef = ref(database, `projs`);
    const allPlayersInfosRef = ref(database, `infos`);

    function startGame() {
      initTiles();
      Object.keys(players).forEach((key) => {
        console.log(key)
        update(ref(database, `infos/${players[key].id}`), {gamestart: true, ready: false, alive: true})
      })
    }

    function endGame() {
      console.log('executed')
      fillTiles();
      Object.keys(players).forEach((key) => {
        update(ref(database, `/infos/${players[key].id}`), {gamestart: false, ready: false, alive: true})
        update(ref(database, `/players/${players[key].id}`), {direction: "down", coins: 10, y: py, x: px,})
      }) 
    }

    function makehost(newkey) {
      console.log(newkey)
      update(ref(database, `/infos/${newkey}`), {host: true});
    }

    function resetStuff() {
      console.log('executed')
      initSelect();
      readyButton.setAttribute("available", "false");
    }

    onValue(allPlayersInfosRef, (snapshot) => {
      playersInfos = snapshot.val() || {}
    })

    function infiniteLoop() {
      let checkready = true;
      let checkalive = 0;
      let checkhost = false;
      let checkstart = true;
      Object.keys(players).forEach((key) => {
        checkready = checkready && playersInfos[key].ready;
        checkalive = checkalive + playersInfos[key].alive;
        checkhost = checkhost || playersInfos[key].host;
        checkstart = checkstart && playersInfos[key].gamestart;
      })
      gameinfos.gamestart = checkstart;

      let delta = 300;
      if (Object.keys(playersInfos).length > 0) {
        if (!checkhost) {
          console.log("no host")
          let newkey = Object.keys(playersInfos)[0];
          makehost(newkey);
        }

        if (playersInfos[playerId].host) {
          if (checkready && !checkstart) {
            startGame();
          }
          if (checkalive == 1 && checkstart) {
            delta = 3000
            console.log('triggered')
            setTimeout(() => {endGame()},  2500);
          }
        }
        if (checkready && !checkstart) {
          update(ref(database, `/infos/${playerId}`), {gamestart: true})
        }
        if (checkalive == 1 && checkstart) {
          delta = 3000
          //setTimeout(() => resetStuff(),  2500);
        }
      }

      setTimeout(() => infiniteLoop(), delta)
    }


    onValue(allPlayersRef, (snapshot) => {
      //Fires whenever a change occurs
      players = snapshot.val() || {}; 
      Object.keys(players).forEach((key) => {
        const characterState = players[key];
        let el = playerElements[key];
        // Now update the DOM
        el.querySelector(".Character_name").innerText = characterState.name;
        el.querySelector(".Character_coins").innerText = characterState.coins;
        el.setAttribute("data-color", characterState.color);
        el.setAttribute("data-direction", characterState.direction);
        const left = 16 * characterState.x + "px";
        const top = 16 * characterState.y - 4 + "px";
        el.style.transform = `translate3d(${left}, ${top}, 0)`;
      })
    })
    onChildAdded(allPlayersRef, (snapshot) => {
      //Fires whenever a new node is added the tree
      const addedPlayer = snapshot.val();
      const characterElement = document.createElement("div");
      characterElement.classList.add("Character", "grid-cell");
      if (addedPlayer.id === playerId) {
        characterElement.classList.add("you");
      }
      characterElement.innerHTML = (`
        <div class="Character_shadow grid-cell"></div>
        <div class="Character_sprite grid-cell"></div>
        <div class="Character_name-container">
          <span class="Character_name"></span>
          <span class="Character_coins">0</span>
        </div>
        <div class="Character_you-arrow"></div>
      `);
      playerElements[addedPlayer.id] = characterElement;

      //Fill in some initial state
      characterElement.querySelector(".Character_name").innerText = addedPlayer.name;
      characterElement.querySelector(".Character_coins").innerText = addedPlayer.coins;
      characterElement.setAttribute("data-color", addedPlayer.color);
      characterElement.setAttribute("data-direction", addedPlayer.direction);
      const left = 16 * addedPlayer.x + "px";
      const top = 16 * addedPlayer.y - 4 + "px";
      characterElement.style.transform = `translate3d(${left}, ${top}, 0)`;
      gameContainer.appendChild(characterElement);
    })


    onValue(allPlayersRef, (snapshot) => {
      if (!tilesinit && Object.keys(playerElements).length == 1) {
        fillTiles()
        update(playerInfosRef, {host: true});
      }
      initSelect();
    }, {onlyOnce: true}
    )

    //Remove character DOM element after they leave
    onChildRemoved(allPlayersRef, (snapshot) => {
      const removedKey = snapshot.val().id;
      gameContainer.removeChild(playerElements[removedKey]);
      delete playerElements[removedKey];
    })


    onValue(allTilesRef, (snapshot) => {
      //Fires whenever a change occurs
      tiles = snapshot.val() || {};
      Object.keys(tiles).forEach((key) => {
        const tileElement = tileElements[key];
        const tile = tiles[key];
        if (tileElement.getAttribute("data-type") != tile.type) {
          tileElement.setAttribute("data-type", tile.type);
        }
      })
    });

    onChildAdded(allTilesRef, (snapshot) => {
      const tile = snapshot.val();
      const key = getKeyString(tile.x, tile.y);
      tiles[key] = tile.type;

      // Create the DOM Element
      const tileElement = document.createElement("div");
      tileElement.classList.add("Tile", "grid-cell");
      tileElement.innerHTML = `
        <div class="Tile_sprite grid-cell"></div>
      `;
      tileElement.setAttribute("data-type", tile.type);

      // Position the Element
      const left = 16 * tile.x + "px";
      const top = 16 * tile.y - 4 + "px";
      tileElement.style.transform = `translate3d(${left}, ${top}, 0)`;

      // Keep a reference for removal later and add to DOM
      tileElements[key] = tileElement;
      gameContainer.appendChild(tileElement);
    })
    onChildRemoved(allTilesRef, (snapshot) => {
      const {x,y} = snapshot.val();
      const keyToRemove = getKeyString(x,y);
      gameContainer.removeChild( tileElements[keyToRemove] );
      delete tileElements[keyToRemove];
    })


    //Projectiles
    onValue(allProjsRef, (snapshot) => {
      projs = snapshot.val() || {};
      Object.keys(projs).forEach((key) => {
        const projState = projs[key];
        let el = projElements[key];

        const left = 16 * projState.x + "px";
        const top = 16 * projState.y - 4 + "px";
        el.style.transform = `translate3d(${left}, ${top}, 0)`;
        explode(gameContainer.getBoundingClientRect().left + 3*(16 * projState.x+8), gameContainer.getBoundingClientRect().top + 3*(16 * projState.y+1), projs[key].dir, projs[key].color);
      })
    });

    onChildAdded(allProjsRef, (snapshot) => {
      const proj = snapshot.val();
      const key = proj.key;
      projs[key] = {x: proj.x, y: proj.y, dir: proj.dir, rule: proj.rule, key: key, color: proj.color};

      // Create the DOM Element
      const projElement = document.createElement("div");
      projElement.classList.add("Proj", "grid-cell");
      projElement.innerHTML = `
        <div class="Proj_sprite grid-cell"></div>
      `;
      projElement.setAttribute("data-color", proj.color);

      // Position the Element
      const left = 16 * proj.x + "px";
      const top = 16 * proj.y - 4 + "px";
      projElement.style.transform = `translate3d(${left}, ${top}, 0)`;

      // Keep a reference for removal later and add to DOM
      projElements[key] = projElement;
      gameContainer.appendChild(projElement);
    })
    onChildRemoved(allProjsRef, (snapshot) => {
      const keyToRemove = snapshot.val().key;
      gameContainer.removeChild( projElements[keyToRemove] );
      delete projElements[keyToRemove];
    })


    //Updates player name with text input
    playerNameInput.addEventListener("change", (e) => {
      const newName = e.target.value || createName();
      playerNameInput.value = newName;
      update(playerRef, {
        name: newName
      })
    })

    //Update player color on button click
    playerColorButton.addEventListener("click", () => {
      const mySkinIndex = playerColors.indexOf(players[playerId].color);
      const nextColor = playerColors[mySkinIndex + 1] || playerColors[0];
      update(playerRef, {
        color: nextColor
      });
    })

    const countdown = async(time) => {
      if (time > 0) {
        fireButton.textContent = time;
        setTimeout(() => {
          countdown(time - 1);
        }, 900)
      } else {
        fireButton.textContent = "Fire !";
        fireButton.setAttribute("available", "true");
      }
    }

    fireButton.addEventListener("click", () => {
      if (fireButton.getAttribute("available") == "true" && playersInfos[playerId].alive) {
        placeProj();
        fireButton.setAttribute("available", "false");
        countdown(5);
      }
    })

    readyButton.addEventListener("click", () => {
      if (fireButton.getAttribute("available") == "true" && !playersInfos[playerId].ready) {
        readyButton.setAttribute("available", "false");
        update(playerInfosRef, {ready: true});
      }
    })

    infiniteLoop();

  }

  onAuthStateChanged(auth, user => {
    if (user) {
      //You're logged in!
      playerId = user.uid;
      playerRef = ref(database, `players/${playerId}`);
      playerInfosRef = ref(database, `infos/${playerId}`);

      const name = createName();
      playerNameInput.value = name;

      const {x, y} = getRandomSafeSpot();

      set(ref(database, `infos/${playerId}`), {gamestart: false, alive: true, host: false, ready: false})
      set(playerRef, {
        id: playerId,
        name,
        direction: "down",
        color: randomFromArray(playerColors),
        x,
        y,
        coins: 10,
      }) 

      //Remove me from Firebase when I diconnect
      onDisconnect(playerRef).remove();
      onDisconnect(playerInfosRef).remove();

      //Begin the game now that we are signed in
      initGame();
    } else {
      //You're logged out.
    }
  })

  signInAnonymously(auth).catch((error) => {
    var errorCode = error.code;
    var errorMessage = error.message;
    // ...
    console.log(errorCode, errorMessage);
  });


})();
