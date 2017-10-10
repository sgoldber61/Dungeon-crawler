"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BIRTH_LIMIT = 4;
var DEATH_LIMIT = 3;
var INITIAL_CHANCE = 0.35; // possibly adjust

var ROWS = 150;
var COLS = 300;
var PIXEL_SIZE = 4;

var DISPLAY_ENEMY_ZONES = false;

var DungeonBoard = function () {
  function DungeonBoard(rows, cols, func) {
    _classCallCheck(this, DungeonBoard);

    this.board = new Array(rows).fill(null);
    for (var i = 0; i < rows; i++) {
      this.board[i] = [];
      for (var j = 0; j < cols; j++) {
        this.board[i].push(func(i, j));
      }
    }

    this.rows = rows;
    this.cols = cols;
  }

  DungeonBoard.prototype.copyDungeon = function copyDungeon() {
    var _this = this;

    var newDungeon = new DungeonBoard(this.rows, this.cols, function (i, j) {
      return _this.board[i][j];
    });
  };

  DungeonBoard.generateDungeon = function generateDungeon() {
    var initialTime = performance.now();

    var dungeon = new DungeonBoard(ROWS, COLS, function () {
      return Math.random() < INITIAL_CHANCE;
    }).fixedPoint().removeInaccessibleLand().removeInteriorHoles();

    var elapsedTime = performance.now() - initialTime;
    console.log("dungeon milliseconds ellapsed: " + elapsedTime);

    return dungeon;
  };

  // automaton generation functions

  DungeonBoard.prototype.tallyNeighbors = function tallyNeighbors(i, j) {
    var total = 0;

    for (var I = i - 1; I <= i + 1; I++) {
      for (var J = j - 1; J <= j + 1; J++) {
        if (I < 0 || J < 0 || I == this.rows || J == this.cols) total++;else total += this.board[I][J];
      }
    }

    return total - this.board[i][j];
  };

  DungeonBoard.prototype.advanceStep = function advanceStep() {
    var _this2 = this;

    var fixedPointQ = true;

    if (this.board2 === undefined) this.board2 = new Array(this.rows).fill(0).map(function () {
      return new Array(_this2.cols).fill(0);
    });

    for (var i = 0; i < this.rows; i++) {
      for (var j = 0; j < this.cols; j++) {
        var neighbors = this.tallyNeighbors(i, j);
        if (this.board[i][j]) {
          if (neighbors < DEATH_LIMIT) {
            this.board2[i][j] = 0;
            fixedPointQ = false;
          } else {
            this.board2[i][j] = this.board[i][j];
          }
        } else {
          if (neighbors > BIRTH_LIMIT) {
            this.board2[i][j] = 1;
            fixedPointQ = false;
          } else {
            this.board2[i][j] = this.board[i][j];
          }
        }
      }
    }

    var _ref = [this.board2, this.board];
    this.board = _ref[0];
    this.board2 = _ref[1];

    return fixedPointQ;
  };

  DungeonBoard.prototype.fixedPoint = function fixedPoint() {
    for (var i = 0; i < 30; i++) {
      // max 30 steps to find fixed point.
      if (this.advanceStep()) {
        break;
      }
    }

    // "reverse" board so that 1 represents available and 0 represents unavailable
    for (var i = 0; i < this.rows; i++) {
      for (var j = 0; j < this.cols; j++) {
        this.board[i][j] = this.board[i][j] ? 0 : 1;
      }
    }
    // delete this.board2
    this.board2 = undefined;

    return this;
  };

  // dungeon trimming and flood fill functions

  // total points with value "color".

  DungeonBoard.prototype.totalColorPoints = function totalColorPoints(color) {
    var total = 0;
    for (var i = 0; i < this.rows; i++) {
      for (var j = 0; j < this.cols; j++) {
        total += this.board[i][j] == color ? 1 : 0;
      }
    }return total;
  };

  // returns an array of coordinates representing everything that's being flooded, as well as a total number of filled points
  // "color" represents the color we are looking to fill. If we are looking for plain ground, use 0. If we are looking for unavailable blockades, use 1.

  DungeonBoard.prototype.floodFill = function floodFill(startI, startJ, color) {
    // this is a list of painted coordinates
    var coordinates = [];
    // this is a queue for the algorithm
    var queue = [[startI, startJ]];
    var index = 0; // starting index of queue

    // go through the flood coordinates, tacking on new points to coordinates.
    var totalPoints = this.rows * this.cols;
    for (var protectIndex = 0; protectIndex < totalPoints; protectIndex++) {
      // if we're at the end of the array-queue, we're finished.
      if (index == queue.length) break;

      // if already flooded, move on.
      var I = queue[index][0],
          J = queue[index][1];
      if (this.board[I][J] == -1) {
        index++;
        continue;
      }

      // set initial point to be flooded
      this.board[I][J] = -1;
      coordinates.push([I, J]);

      // expand north and south, filling out nodes between north and south
      var n = I,
          s = I;
      while (n > 0) {
        if (this.board[n - 1][J] == color) {
          this.board[n - 1][J] = -1;
          coordinates.push([n - 1, J]);
        } else break;

        n--;
      }
      while (s < this.rows - 1) {
        if (this.board[s + 1][J] == color) {
          this.board[s + 1][J] = -1;
          coordinates.push([s + 1, J]);
        } else break;

        s++;
      }

      // add nodes to the left and right to the end of the array-queue if necessary.
      for (var i = n; i <= s; i++) {
        if (J > 0 && this.board[i][J - 1] == color) {
          queue.push([i, J - 1]);
        }
        if (J < this.cols - 1 && this.board[i][J + 1] == color) {
          queue.push([i, J + 1]);
        }
      }

      // move on to the next part of the queue
      index++;
    }

    return coordinates;
  };

  // remove either inaccessible land areas or interior holes (depending on color 1 or 0), returning a dungeon
  // color: 1 or 0. threshold: a function of land-mass size and totalColor i.e. (size, totalColor) => (size < thresholdConstant or size < totalColor / 2).

  DungeonBoard.prototype.removeColors = function removeColors(color, minThreshold, maxThreshold, maximumIter) {
    var oppositeColor = color == 1 ? 0 : 1;

    var floodI = 0,
        floodJ = -1;

    // only iterate at a maximum number
    for (var protectIndex = 0; protectIndex < maximumIter; protectIndex++) {
      // total color spaces
      var totalColor = this.totalColorPoints(color);

      // update the starting point to flood-fill
      floodJ++;
      if (floodJ == this.cols) {
        if (floodI == this.rows - 1) {
          return this;
        } else {
          floodJ = 0;
          floodI++;
        }
      }

      var floodPointFound = false;
      var i = floodI,
          j = floodJ;
      while (i < this.rows) {
        if (j == this.cols) {
          j = 0;
          i++;
        }

        if (this.board[i][j] == color) {
          floodI = i;
          floodJ = j;
          // "break"
          floodPointFound = true;
          break;
        }

        j++;
      }
      if (!floodPointFound) return this;

      // flood fill
      var floodCoordinates = this.floodFill(floodI, floodJ, color);

      // if no "cut out" needed, just return the board
      if (floodCoordinates.length == totalColor) {
        return this;
      }
      // if flood is small to within the minThreshold, remove. this is the only case where we need to try another flooding.
      if (minThreshold(floodCoordinates.length, totalColor)) {
        for (var _i = 0; _i < floodCoordinates.length; _i++) {
          this.board[floodCoordinates[_i][0]][floodCoordinates[_i][1]] = oppositeColor; // removal means setting to opposite color
        }
      }
      // flood is large by above a maxThreshold
      else if (maxThreshold(floodCoordinates.length, totalColor)) {
          // set opposite entire board
          for (var _i2 = 0; _i2 < this.rows; _i2++) {
            for (var _j = 0; _j < this.cols; _j++) {
              this.board[_i2][_j] = oppositeColor;
            }
          }

          // make flood colored
          for (var _i3 = 0; _i3 < floodCoordinates.length; _i3++) {
            this.board[floodCoordinates[_i3][0]][floodCoordinates[_i3][1]] = color;
          }

          return this;
        }
    }

    return this;
  };

  DungeonBoard.prototype.healBoard = function healBoard(color) {
    for (var i = 0; i < this.rows; i++) {
      for (var j = 0; j < this.cols; j++) {
        if (this.board[i][j] == -1) this.board[i][j] = color;
      }
    }

    return this;
  };

  DungeonBoard.prototype.removeInaccessibleLand = function removeInaccessibleLand() {
    return this.removeColors(1, function (size, totalColor) {
      return size < totalColor / 2;
    }, function (size, totalColor) {
      return size >= totalColor / 2;
    }, 5).healBoard(1);
  };

  DungeonBoard.prototype.removeInteriorHoles = function removeInteriorHoles() {
    return this.removeColors(0, function (size, totalColor) {
      return size <= 16;
    }, function (size, totalColor) {
      return false;
    }, this.rows * this.cols).healBoard(0);
  };

  return DungeonBoard;
}();

// player/item/enemy initialization, and player stats code

var ItemProperty = function ItemProperty() {
  _classCallCheck(this, ItemProperty);

  // random index: either a weapon or a health
  if (Math.random() > 0.5) {
    Object.assign(this, ItemProperty.healthItemsData[Math.floor(Math.random() * ItemProperty.healthItemsData.length)]);
  } else {
    Object.assign(this, ItemProperty.weaponItemsData[Math.floor(Math.random() * ItemProperty.weaponItemsData.length)]);
  }
};

ItemProperty.healthItemsData = [{ name: "Red Potion", healthValue: 20 }, { name: "Green Potion", healthValue: 40 }, { name: "Blue Potion", healthValue: 60 }];
ItemProperty.healthItemsData = ItemProperty.healthItemsData.map(function (healthItem) {
  return Object.assign(healthItem, { type: "health" });
});
ItemProperty.weaponItemsData = ["Iron Shortsword", "Iron Longsword", "Steel Shortsword", "Steel Longsword", "Platinum Shortsword", "Platinum Longsword"];
ItemProperty.weaponItemsData = ItemProperty.weaponItemsData.map(function (weaponItem, index) {
  return { name: weaponItem, weaponLevel: index, type: "weapon" };
});

var EnemyProperty = function EnemyProperty() {
  _classCallCheck(this, EnemyProperty);

  // random index: dictates what kind of enemy
  var index = undefined;
  var random = Math.random();
  if (random < 0.5) index = 0;else if (random < 0.75) index = 1;else if (random < 0.9) index = 2;else index = 3;

  Object.assign(this, EnemyProperty.enemyData[index]);
};

EnemyProperty.enemyData = [["Basic Enemy", 300, 10, 8000], ["Standard Enemy", 450, 15, 12000], ["Advanced Enemy", 600, 20, 17000], ["Expert Enemy", 750, 25, 23000]].map(function (dataArray) {
  return { name: dataArray[0], health: dataArray[1], attack: dataArray[2], experience: dataArray[3] };
});

var PlayerStatsData = function () {
  function PlayerStatsData() {
    _classCallCheck(this, PlayerStatsData);

    this.level = 1;
    this.maxHealth = this.evaluateMaxHealth();
    this.weapon = ItemProperty.weaponItemsData[0];

    this.health = this.maxHealth;
    this.experience = 0;
    this.experienceToLevel = this.evaluateExperienceToLevel();

    this.attack = this.evaluateAttack();
    this.recentMessage = "";
  }

  PlayerStatsData.prototype.evaluateMaxHealth = function evaluateMaxHealth() {
    return 100 + 30 * (this.level - 1);
  };

  PlayerStatsData.prototype.evaluateExperienceToLevel = function evaluateExperienceToLevel() {
    return 10000 + 3000 * this.level;
  };

  PlayerStatsData.prototype.collectHealth = function collectHealth(itemProperty) {
    this.health += itemProperty.healthValue;
    if (this.health > this.maxHealth) {
      this.health = this.maxHealth;
    }

    this.recentMessage = "Health obtained: " + itemProperty.name;
  };

  PlayerStatsData.prototype.collectWeapon = function collectWeapon(itemProperty) {
    if (itemProperty.weaponLevel > this.weapon.weaponLevel) {
      this.weapon = itemProperty;
      this.attack = this.evaluateAttack();
      this.recentMessage = "Weapon obtained: " + itemProperty.name;
    } else {
      this.recentMessage = "Weapon obtained not better than current";
    }
  };

  PlayerStatsData.prototype.contactEnemy = function contactEnemy(enemyProperty) {
    var result = {};

    this.health -= enemyProperty.attack;

    if (this.health <= 0) {
      result.playerDeathQ = true;
      this.health = 0;
    } else {
      result.playerDeathQ = false;
    }

    enemyProperty.health -= this.attack;
    if (enemyProperty.health <= 0 && result.playerDeathQ == false) {
      this.recentMessage = enemyProperty.name + " defeated";
      this.experience += enemyProperty.experience;
      if (this.experience >= this.experienceToLevel) {
        this.levelUp(1);
      }
      result.enemyDefeatedQ = true;
    } else {
      this.recentMessage = enemyProperty.name + " health: " + enemyProperty.health;
      result.enemyDefeatedQ = false;
    }

    return result;
  };

  PlayerStatsData.prototype.levelUp = function levelUp(count) {
    // level up... given that we are, in fact, leveling up.
    // update level, maxHealth, health (depending on how much maxHealth increased), experience, experienceToLevel, and attack.
    this.level++;

    var newMaxHealth = this.evaluateMaxHealth();
    this.health = newMaxHealth - this.maxHealth + this.health;
    this.maxHealth = newMaxHealth;

    this.experience = this.experience - this.experienceToLevel;
    this.experienceToLevel = this.evaluateExperienceToLevel();
    this.attack = this.evaluateAttack();

    this.recentMessage += count == 1 ? " Level up!" : " (x" + count + ")";

    if (this.experience >= this.experienceToLevel) {
      this.levelUp(2);
    }
  };

  PlayerStatsData.prototype.evaluateAttack = function evaluateAttack() {
    // attack power from weapon and level...
    return 100 + 30 * (this.level - 1) + 50 * this.weapon.weaponLevel;
  };

  PlayerStatsData.prototype.updatePlayerStats = function updatePlayerStats(itemData) {
    // generic function for picking up an item
    if (itemData.type == "weapon") {
      this.collectWeapon(itemData);
    } else if (itemData.type == "health") {
      this.collectHealth(itemData);
    }
  };

  return PlayerStatsData;
}();

// enemy reachable squares class

var ReachableSquares = function ReachableSquares(dungeon, position, radius) {
  var _this3 = this;

  _classCallCheck(this, ReachableSquares);

  var initialTime = performance.now();

  this.dungeon = dungeon;
  this.centralPositionString = position[0] + " " + position[1];
  this.radius = radius;

  this.bulkSquares = new Set();
  this.recentSquares = new Set([this.centralPositionString]);

  var coordinateIncrementArray = [[-1, 0], [0, 1], [1, 0], [0, -1], [-1, 1], [1, 1], [1, -1], [-1, -1]];
  for (var k = 0; k <= radius; k++) {
    this.newRecentSquares = new Set();

    this.recentSquares.forEach(function (positionString) {
      // set up position
      var position = positionString.split(" ");
      var i = parseInt(position[0], 10),
          j = parseInt(position[1], 10);

      // we need to check up on N-E-S-W, then check diagonal directions NE-SE-SW-NW.
      var directionApproval = [false, false, false, false];
      for (var a = 0; a < 8; a++) {
        if (a >= 4) if (!(directionApproval[a - 4] || directionApproval[(a - 3) % 4])) continue;

        var I = i + coordinateIncrementArray[a][0],
            J = j + coordinateIncrementArray[a][1];
        if (!(dungeon.board[I] && dungeon.board[I][J])) {
          // if dungeon.board[I][J] not both defined and 1, then continue
          continue;
        } else {
          if (a < 4) directionApproval[a] = true; // we CAN move either N, E, S, or W, so approve the direction
        }

        var newPositionString = I + " " + J;
        if (!_this3.bulkSquares.has(newPositionString)) {
          // if this square hasn't been seen in the bulk squares, add it to newRecentSquares
          _this3.newRecentSquares.add(newPositionString); // this will only add to newRecentSquares if it is a unique value
        }
      }
    });

    this.recentSquares.forEach(this.bulkSquares.add, this.bulkSquares);
    this.recentSquares = this.newRecentSquares;
  }

  this.recentSquares.forEach(this.bulkSquares.add, this.bulkSquares);
  this.radiusSquares = this.bulkSquares;

  // end of constructor
  // this.largeRadiusSquares contains the necessary data.

  var elapsedTime = performance.now() - initialTime;
  console.log("enemy milliseconds ellapsed: " + elapsedTime);
};

// enemy and enemy reachable squares

var GameElements =
// this class is designed to construct:
// enemies, enemies.dungeon, and enemies.properties
// items, items.dungeon, and items.properties
function GameElements(dungeon) {
  var _this4 = this;

  _classCallCheck(this, GameElements);

  // set up available squares
  var availableSquares = new Set();
  for (var i = 0; i < dungeon.rows; i++) {
    for (var j = 0; j < dungeon.cols; j++) {
      if (dungeon.board[i][j]) {
        availableSquares.add(i + " " + j);
      }
    }
  }

  // one by one, take a square out from random from the available squares and create an enemy
  this.enemies = {};
  this.enemies.dungeon = new DungeonBoard(dungeon.rows, dungeon.cols, function () {
    return 0;
  });
  this.enemies.properties = new Map();

  var availableDungeonBoard = [];
  dungeon.board.forEach(function (row) {
    availableDungeonBoard.push(row.slice());
  });

  var _loop = function _loop(i) {
    // number of enemies
    // generate an enemy position

    // SET -> ARRAY
    var availableSquaresArray = Array.from(availableSquares);
    var enemyPositionString = availableSquaresArray[Math.floor(availableSquaresArray.length * Math.random())];
    var enemyPosition = enemyPositionString.split(" ").map(function (char) {
      return parseInt(char, 10);
    });

    // generate an enemy's radius squares set
    var radiusSquares = new ReachableSquares(dungeon, enemyPosition, 10).radiusSquares;
    _this4.enemies.properties.set(enemyPositionString, { radiusSquares: radiusSquares, centralPosition: enemyPosition, currentPosition: enemyPosition.slice(), enemyProperty: new EnemyProperty() });
    // set enemies.dungeon appearance
    radiusSquares.forEach(function (coordinateString) {
      var coordinate = coordinateString.split(" ").map(function (char) {
        return parseInt(char, 10);
      });
      _this4.enemies.dungeon.board[coordinate[0]][coordinate[1]] = { square: 1, centralPositionString: enemyPositionString };
      availableDungeonBoard[coordinate[0]][coordinate[1]] = 0;
    });
    _this4.enemies.dungeon.board[enemyPosition[0]][enemyPosition[1]].square = 2;

    // remove available squares, overestimating the range of influence of an enemy.
    for (var _i4 = enemyPosition[0] - 23; _i4 <= enemyPosition[0] + 23; _i4++) {
      for (var j = enemyPosition[1] - 23; j <= enemyPosition[1] + 23; j++) {
        availableSquares.delete(_i4 + " " + j);
      }
    }
  };

  for (var i = 0; i < 20; i++) {
    _loop(i);
  }

  console.log("enemies dungeon board: " + JSON.stringify(this.enemies.dungeon.board));

  // hashmap of enemy central position string keys and other values that represent states and actions of currently active enemies
  this.enemies.activeEnemies = new Map();

  // define both the items and the player
  // set up remaining available squares as an array
  var remainingAvailableSquares = [];
  availableDungeonBoard.forEach(function (row, indexI) {
    row.forEach(function (element, indexJ) {
      if (element == 1) remainingAvailableSquares.push([indexI, indexJ]);
    });
  });

  // take a random sample, in order to generate items
  var itemCount = 20;
  var squaresSample = _.sample(remainingAvailableSquares, itemCount + 2);

  // player and items.
  this.player = {};
  this.player.position = squaresSample[0];

  this.newFloor = {};
  this.newFloor.position = squaresSample[1];

  var itemPositions = squaresSample.slice(2, itemCount + 2);

  this.items = {};
  this.items.dungeon = new DungeonBoard(dungeon.rows, dungeon.cols, function () {
    return 0;
  });
  itemPositions.forEach(function (position) {
    _this4.items.dungeon.board[position[0]][position[1]] = 1;
  });

  this.items.properties = new Map();
  itemPositions.forEach(function (position) {
    var key = position[0] + " " + position[1];
    _this4.items.properties.set(key, new ItemProperty());
  });
};

// react-konva code

var _ReactKonva = ReactKonva;
var Layer = _ReactKonva.Layer;
var Stage = _ReactKonva.Stage;
var Group = _ReactKonva.Group;
var Rect = _ReactKonva.Rect;

/*

  <Stage height={this.state.dungeon.rows * PIXEL_SIZE} width={this.state.dungeon.cols * PIXEL_SIZE}>
    <Layer ref={this.layerRefCallback} />
    <ItemSquares itemProperties={this.state.items.properties} />
    <EnemySquares enemyProperties={this.state.enemies.properties} />
    <PlayerSquare player={this.state.player} />
  </Stage>

*/

var ItemSquares = function (_React$Component) {
  _inherits(ItemSquares, _React$Component);

  // props: itemProperties -> key-value pairs, with keys for the position and values for the item properties
  // props: updateItemsQ

  function ItemSquares(props) {
    _classCallCheck(this, ItemSquares);

    var _this5 = _possibleConstructorReturn(this, _React$Component.call(this, props));

    _this5.rectangles = _this5.generateRectangles(props);
    return _this5;
  }

  ItemSquares.prototype.generateRectangles = function generateRectangles(newProps) {
    var itemPositionsColors = [];

    newProps.itemProperties.forEach(function (value, key) {
      itemPositionsColors.push({ position: key.split(" ").map(function (numString) {
          return parseInt(numString, 10);
        }), type: value.type });
    });

    return itemPositionsColors.map(function (data) {
      console.log("item rectangle created");

      return React.createElement(Rect, {
        x: data.position[1] * PIXEL_SIZE,
        y: data.position[0] * PIXEL_SIZE,
        width: PIXEL_SIZE,
        height: PIXEL_SIZE,
        fill: data.type == "health" ? "green" : "purple",
        key: data.position
      });
    });
  };

  ItemSquares.prototype.shouldComponentUpdate = function shouldComponentUpdate(nextProps, nextState) {
    return nextProps.updateItemsQ; // if updateItemsQ is true, then update
  };

  ItemSquares.prototype.componentWillUpdate = function componentWillUpdate(nextProps, nextState) {
    this.rectangles = this.generateRectangles(nextProps);
  };

  ItemSquares.prototype.render = function render() {
    return React.createElement(
      Layer,
      null,
      this.rectangles
    );
  };

  return ItemSquares;
}(React.Component);

var EnemySquare = function (_React$Component2) {
  _inherits(EnemySquare, _React$Component2);

  // props: position, updateQ

  function EnemySquare(props) {
    _classCallCheck(this, EnemySquare);

    return _possibleConstructorReturn(this, _React$Component2.call(this, props));
  }

  EnemySquare.prototype.shouldComponentUpdate = function shouldComponentUpdate() {
    return this.props.updateQ;
  };

  EnemySquare.prototype.render = function render() {
    console.log("creating enemy rectangle...");

    return React.createElement(Rect, {
      x: this.props.position[1] * PIXEL_SIZE,
      y: this.props.position[0] * PIXEL_SIZE,
      width: PIXEL_SIZE,
      height: PIXEL_SIZE,
      fill: "red"
    });
  };

  return EnemySquare;
}(React.Component);

var EnemySquares = function (_React$Component3) {
  _inherits(EnemySquares, _React$Component3);

  // props: enemyProperties -> key-value pairs, just use the keys for the position
  // props: updateEnemiesQ
  // props: activeEnemies

  function EnemySquares(props) {
    _classCallCheck(this, EnemySquares);

    var _this7 = _possibleConstructorReturn(this, _React$Component3.call(this, props));

    _this7.rectangles = _this7.generateRectangles(props);
    return _this7;
  }

  EnemySquares.prototype.generateRectangles = function generateRectangles(newProps) {
    var enemyPositions = [];

    newProps.enemyProperties.forEach(function (value, key) {
      // key: centralPositionString, value: includes currentPosition
      enemyPositions.push({ position: value.currentPosition, updateQ: newProps.activeEnemies.has(key) ? true : false });
    });

    return enemyPositions.map(function (data) {
      return React.createElement(EnemySquare, { position: data.position, updateQ: data.updateQ, key: data.position });
    });
  };

  EnemySquares.prototype.shouldComponentUpdate = function shouldComponentUpdate(nextProps, nextState) {
    return nextProps.updateEnemiesQ;
  };

  EnemySquares.prototype.componentWillUpdate = function componentWillUpdate(nextProps, nextState) {
    this.rectangles = this.generateRectangles(nextProps);
  };

  EnemySquares.prototype.render = function render() {
    return React.createElement(
      Layer,
      null,
      this.rectangles
    );
  };

  return EnemySquares;
}(React.Component);

var PlayerSquare = function PlayerSquare(props) {
  // props: player -> position as an array

  return React.createElement(
    Layer,
    null,
    React.createElement(Rect, {
      x: props.player.position[1] * PIXEL_SIZE,
      y: props.player.position[0] * PIXEL_SIZE,
      width: PIXEL_SIZE,
      height: PIXEL_SIZE,
      fill: "yellow"
    })
  );
};

var NewFloorSquare = function (_React$Component4) {
  _inherits(NewFloorSquare, _React$Component4);

  // props: newFloor -> position as an array

  function NewFloorSquare(props) {
    _classCallCheck(this, NewFloorSquare);

    return _possibleConstructorReturn(this, _React$Component4.call(this, props));
  }

  NewFloorSquare.prototype.shouldComponentUpdate = function shouldComponentUpdate() {
    return false;
  };

  NewFloorSquare.prototype.render = function render() {
    return React.createElement(
      Layer,
      null,
      React.createElement(Rect, {
        x: this.props.newFloor.position[1] * PIXEL_SIZE,
        y: this.props.newFloor.position[0] * PIXEL_SIZE,
        width: PIXEL_SIZE,
        height: PIXEL_SIZE,
        fill: "gray"
      })
    );
  };

  return NewFloorSquare;
}(React.Component);

var MainStage = function (_React$Component5) {
  _inherits(MainStage, _React$Component5);

  // props functions: updatePlayerStats, contactEnemy, moveUpFloor
  // props number: floor

  function MainStage(props) {
    _classCallCheck(this, MainStage);

    var _this9 = _possibleConstructorReturn(this, _React$Component5.call(this, props));

    var dungeon = DungeonBoard.generateDungeon();

    // GameElements contains raw data info for the player, items, and enemies.
    var gameElements = new GameElements(dungeon);

    // AStar helper factory
    _this9.aStarFactory = new AStarCalculator(dungeon);

    _this9.layerRefCallback = _this9.layerRefCallback.bind(_this9);
    _this9.movePlayer = _this9.movePlayer.bind(_this9);

    _this9.state = { dungeon: dungeon, player: gameElements.player, items: gameElements.items, newFloor: gameElements.newFloor, enemies: gameElements.enemies, updateItemsQ: true, updateEnemiesQ: true, updateStageQ: true };
    return _this9;
  }

  MainStage.prototype.layerRefCallback = function layerRefCallback(layer) {
    var _this10 = this;

    // upon unoumnt
    if (layer === null) return;

    // add dungeon map squares directly to Konva
    for (var i = 0; i < this.state.dungeon.rows; i++) {
      for (var j = 0; j < this.state.dungeon.cols; j++) {
        var rect = new Konva.Rect({
          x: j * PIXEL_SIZE,
          y: i * PIXEL_SIZE,
          width: PIXEL_SIZE,
          height: PIXEL_SIZE,
          fill: this.state.dungeon.board[i][j] ? "darkblue" : "black"
        });

        layer.add(rect);
      }
    }

    // add enemy region squares directly to Konva
    if (DISPLAY_ENEMY_ZONES) {
      (function () {
        var enemyRegions = [];

        _this10.state.enemies.properties.forEach(function (value, key) {
          // key: centralPositionString, value: radiusSquares set
          enemyRegions.push({ centralPositionString: key, neighborPositions: [] });

          value.radiusSquares.forEach(function (positionString) {
            enemyRegions[enemyRegions.length - 1].neighborPositions.push(positionString);
          });
        });

        enemyRegions.forEach(function (enemyAreaData) {
          enemyAreaData.neighborPositions.forEach(function (positionString) {
            var position = positionString.split(" ").map(function (numString) {
              return parseInt(numString, 10);
            });

            console.log("enemy zone created");

            var rect = new Konva.Rect({
              x: position[1] * PIXEL_SIZE,
              y: position[0] * PIXEL_SIZE,
              width: PIXEL_SIZE,
              height: PIXEL_SIZE,
              fill: "orange"
            });

            layer.add(rect);
          });
        });
      })();
    }
  };

  MainStage.prototype.componentDidMount = function componentDidMount() {
    // player movement
    window.addEventListener('keydown', this.movePlayer);

    // enemy movement
    this.timerID = setInterval(this.moveEnemies.bind(this), 1000);
  };

  MainStage.prototype.componentWillUnmount = function componentWillUnmount() {
    // get rid of event listener
    window.removeEventListener('keydown', this.movePlayer);

    // get rid of enemy movement
    clearInterval(this.timerID);
  };

  MainStage.prototype.movePlayer = function movePlayer(event) {
    console.log("key pressed");

    var deltaI = 0,
        deltaJ = 0;

    switch (event.keyCode) {
      case 37:
        // left arrow
        deltaJ = -1;
        break;
      case 39:
        // right arrow
        deltaJ = 1;
        break;
      case 38:
        // up arrow
        deltaI = -1;
        break;
      case 40:
        // down arrow
        deltaI = 1;
        break;
      default:
        return; // don't do anything
    }

    var oldI = this.state.player.position[0];
    var oldJ = this.state.player.position[1];
    var newI = this.state.player.position[0] + deltaI;
    var newJ = this.state.player.position[1] + deltaJ;

    var row = this.state.dungeon.board[newI];
    if (row && row[newJ]) {
      // if the position is available, move to it
      // check for changes involving enemies. either entering or leaving an enemy territory will activate/deactivate enemies
      var newPoint = this.state.enemies.dungeon.board[newI][newJ];
      var newPointValue = (typeof newPoint === "undefined" ? "undefined" : _typeof(newPoint)) == "object" ? newPoint.square : newPoint;
      var oldPoint = this.state.enemies.dungeon.board[oldI][oldJ];
      var oldPointValue = (typeof oldPoint === "undefined" ? "undefined" : _typeof(oldPoint)) == "object" ? oldPoint.square : oldPoint;

      console.log(newPoint);
      console.log(newPointValue);

      if (newPointValue != oldPointValue) {
        // if we bump into an enemy, disallow moving into the enemy
        if (newPointValue == 2) {
          this.setState({ updateItemsQ: false, updateEnemiesQ: false });
        }
        // if we enter an enemy territory, activate the enemy to set sights on player
        else if (newPointValue == 1) {
            var centralPositionString = newPoint.centralPositionString;
            this.state.enemies.activeEnemies.set(centralPositionString, { enemyData: this.state.enemies.properties.get(centralPositionString), playerQ: true });

            this.state.player.position[0] = newI;
            this.state.player.position[1] = newJ;
            this.setState({ player: this.state.player, updateItemsQ: false, updateEnemiesQ: false });
          }
          // if we leave an enemy territory, set the enemy to return back to its central position
          else {
              var centralPositionString = oldPoint.centralPositionString;
              this.state.enemies.activeEnemies.set(centralPositionString, { enemyData: this.state.enemies.properties.get(centralPositionString), playerQ: false });

              this.state.player.position[0] = newI;
              this.state.player.position[1] = newJ;
              this.setState({ player: this.state.player, updateItemsQ: false, updateEnemiesQ: false });
            }
      }
      // check for item
      else if (this.state.items.dungeon.board[newI][newJ]) {
          var itemData = this.state.items.properties.get(newI + " " + newJ);

          // do stuff depending on itemData.
          this.props.updatePlayerStats(itemData);

          this.state.items.dungeon.board[newI][newJ] = 0;
          this.state.items.properties.delete(newI + " " + newJ);

          this.state.player.position[0] = newI;
          this.state.player.position[1] = newJ;
          this.setState({ player: this.state.player, items: this.state.items, updateItemsQ: true, updateEnemiesQ: false });
        }
        // check for newFloor
        else if (this.state.newFloor.position[0] == newI && this.state.newFloor.position[1] == newJ) {
            this.props.moveUpFloor();
          }
          // no items, no enemy interactions or territory changes
          else {
              this.state.player.position[0] = newI;
              this.state.player.position[1] = newJ;
              this.setState({ player: this.state.player, updateItemsQ: false, updateEnemiesQ: false });
            }
    }
  };

  // move enemies functions

  // helper function to advance enemy

  MainStage.prototype.advanceEnemy = function advanceEnemy(coord0, coord1, centralPosition) {
    // adjust 2d dungeon array
    this.state.enemies.dungeon.board[coord0[0]][coord0[1]] = 1;
    this.state.enemies.dungeon.board[coord1[0]][coord1[1]] = 2;

    // adjust current position in enemy data
    var centralPositionString = centralPosition[0] + " " + centralPosition[1];
    var enemyData = this.state.enemies.properties.get(centralPositionString);
    enemyData.currentPosition[0] = coord1[0];
    enemyData.currentPosition[1] = coord1[1];
  };

  MainStage.prototype.moveEnemies = function moveEnemies() {
    var _this11 = this;

    var enemyMovedQ = false;

    this.state.enemies.activeEnemies.forEach(function (value, key, hashMap) {
      var path = undefined;
      if (value.playerQ) {
        // if player is on stage, generate a path
        console.log(JSON.stringify(value.enemyData.currentPosition));
        console.log(JSON.stringify(_this11.state.player.position));

        path = _this11.aStarFactory.calculatePath(value.enemyData.currentPosition, _this11.state.player.position);
      }

      if (path && path.length <= 8) {
        // move forwards to player
        value.pathBackwards = undefined;

        // if player is one step away, do damage!
        if (path.length == 2) {
          var contactResults = _this11.props.contactEnemy(value.enemyData.enemyProperty);
          // enemydefeatedQ, playerDeathQ

          if (contactResults.playerDeathQ) {
            _this11.props.playerDefeated();
          }

          if (contactResults.enemyDefeatedQ) {
            value.enemyData.radiusSquares.forEach(function (positionString) {
              var position = positionString.split(" ").map(function (char) {
                return parseInt(char, 10);
              });
              _this11.state.enemies.dungeon.board[position[0]][position[1]] = 0;
            });

            _this11.state.enemies.properties.delete(value.enemyData.centralPosition[0] + " " + value.enemyData.centralPosition[1]);

            hashMap.delete(key);

            enemyMovedQ = true;
          }
        }
        // otherwise, move towards the player
        else {
            console.log(JSON.stringify(path[0]) + " " + JSON.stringify(path[1]));
            _this11.advanceEnemy(path[0], path[1], value.enemyData.centralPosition);
            enemyMovedQ = true;
          }
      } else {
        // move backwards to centralPosition
        console.log("moving backwards");
        if (value.enemyData.centralPosition[0] == value.enemyData.currentPosition[0] && value.enemyData.centralPosition[1] == value.enemyData.currentPosition[1]) {
          if (!value.playerQ) {
            hashMap.delete(key);
          } else {
            value.pathBackwards = undefined;
          }
        } else {
          if (!value.pathBackwards) {
            value.pathBackwards = _this11.aStarFactory.calculatePath(value.enemyData.currentPosition, value.enemyData.centralPosition);
          }

          console.log(JSON.stringify(value.pathBackwards[0]) + " " + JSON.stringify(value.pathBackwards[1]));
          _this11.advanceEnemy(value.pathBackwards[0], value.pathBackwards[1], value.enemyData.centralPosition);
          value.pathBackwards.shift();
          enemyMovedQ = true;
        }
      }
    });

    if (enemyMovedQ) {
      this.setState({ enemies: this.state.enemies, updateItemsQ: false, updateEnemiesQ: true });
    }
  };

  MainStage.prototype.render = function render() {
    // ItemSquares, EnemySquares, and PlayerSquare are all Layers.
    return React.createElement(
      Stage,
      { height: this.state.dungeon.rows * PIXEL_SIZE, width: this.state.dungeon.cols * PIXEL_SIZE, key: this.props.floor },
      React.createElement(Layer, { ref: this.layerRefCallback }),
      React.createElement(PlayerSquare, { player: this.state.player }),
      React.createElement(ItemSquares, { itemProperties: this.state.items.properties, updateItemsQ: this.state.updateItemsQ }),
      React.createElement(NewFloorSquare, { newFloor: this.state.newFloor }),
      React.createElement(EnemySquares, { enemyProperties: this.state.enemies.properties, updateEnemiesQ: this.state.updateEnemiesQ, activeEnemies: this.state.enemies.activeEnemies })
    );
  };

  return MainStage;
}(React.Component);

var PlayerStats = function PlayerStats(props) {
  // props: playerStats, floor, style
  /*
    floor
    level
    maxHealth
    weapon
    health
    experience
    experienceToLevel
    attack
    recentMessage
  */

  return React.createElement(
    "div",
    { style: props.style },
    React.createElement(
      "p",
      null,
      "Floor " + props.floor
    ),
    React.createElement(
      "p",
      null,
      "Level " + props.playerStats.level
    ),
    React.createElement(
      "p",
      null,
      "Health " + props.playerStats.health + "/" + props.playerStats.maxHealth
    ),
    React.createElement(
      "p",
      null,
      "Experience " + props.playerStats.experience + "/" + props.playerStats.experienceToLevel
    ),
    React.createElement(
      "p",
      null,
      "Weapon " + props.playerStats.weapon.name
    ),
    React.createElement(
      "p",
      null,
      "Attack " + props.playerStats.attack
    ),
    React.createElement(
      "p",
      null,
      props.playerStats.recentMessage
    )
  );
};

var CompleteGame = function (_React$Component6) {
  _inherits(CompleteGame, _React$Component6);

  function CompleteGame(props) {
    _classCallCheck(this, CompleteGame);

    var _this12 = _possibleConstructorReturn(this, _React$Component6.call(this, props));

    var playerStats = new PlayerStatsData();

    _this12.updatePlayerStats = _this12.updatePlayerStats.bind(_this12);
    _this12.contactEnemy = _this12.contactEnemy.bind(_this12);
    _this12.moveUpFloor = _this12.moveUpFloor.bind(_this12);
    _this12.gameComplete = _this12.gameComplete.bind(_this12);
    _this12.specialDisplay = _this12.specialDisplay.bind(_this12);
    _this12.playerDefeated = _this12.playerDefeated.bind(_this12);
    _this12.restartGame = _this12.restartGame.bind(_this12);

    _this12.state = { playerStats: playerStats, floor: 1, stageDisplayQ: true };
    return _this12;
  }

  CompleteGame.prototype.updatePlayerStats = function updatePlayerStats(itemData) {
    this.state.playerStats.updatePlayerStats(itemData);
    this.setState({ playerStats: this.state.playerStats });
  };

  CompleteGame.prototype.contactEnemy = function contactEnemy(enemyData) {
    var returnValue = this.state.playerStats.contactEnemy(enemyData);
    this.setState({ playerStats: this.state.playerStats });

    return returnValue;
  };

  CompleteGame.prototype.moveUpFloor = function moveUpFloor() {
    var _this13 = this;

    if (this.state.floor < 2) {
      this.setState({ stageDisplayQ: false }, function () {
        _this13.setState({ floor: _this13.state.floor + 1, stageDisplayQ: true });
      });
    } else {
      this.gameComplete();
    }
  };

  CompleteGame.prototype.playerDefeated = function playerDefeated() {
    var _this14 = this;

    this.setState({ stageDisplayQ: false }, function () {
      _this14.setState({ specialState: "death" });
    });
  };

  CompleteGame.prototype.gameComplete = function gameComplete() {
    this.setState({ stageDisplayQ: false, specialState: "complete" });
  };

  CompleteGame.prototype.specialDisplay = function specialDisplay() {
    if (this.state.specialState === "death") {
      return React.createElement(
        "div",
        null,
        React.createElement(
          "p",
          null,
          "Game Lost"
        ),
        React.createElement(
          "button",
          { onClick: this.restartGame },
          "Restart"
        )
      );
    } else if (this.state.specialState === "complete") {
      return React.createElement(
        "div",
        null,
        React.createElement(
          "p",
          null,
          "Game Complete"
        ),
        React.createElement(
          "button",
          { onClick: this.restartGame },
          "Restart"
        )
      );
    }
  };

  CompleteGame.prototype.restartGame = function restartGame() {
    var playerStats = new PlayerStatsData();
    this.setState({ playerStats: playerStats, floor: 1, stageDisplayQ: true });
  };

  CompleteGame.prototype.render = function render() {
    console.log(this.state.stageDisplayQ);

    return React.createElement(
      "div",
      { style: { position: "relative" } },
      this.state.stageDisplayQ ? React.createElement(MainStage, { updatePlayerStats: this.updatePlayerStats, contactEnemy: this.contactEnemy, moveUpFloor: this.moveUpFloor, playerDefeated: this.playerDefeated, floor: this.state.floor }) : this.specialDisplay(),
      React.createElement(PlayerStats, { playerStats: this.state.playerStats, style: { position: "absolute", left: COLS * PIXEL_SIZE, top: 0 }, floor: this.state.floor })
    );
  };

  return CompleteGame;
}(React.Component);

ReactDOM.render(React.createElement(CompleteGame, null), document.getElementById("main"));
document.getElementById("main").autofocus = true;