const field = document.querySelector('.field');
const tiles = {
    wallTile: 'tileW',
    roomTile: 'tile',
    swordTile: 'tileSW',
    healthPotionTile: 'tileHP',
    playerTile: 'tileP',
    playerHealthBar: 'healthP',
    enemyHealthBar: 'healthE',
    enemyTile: 'tileE'
};
const generationArguments = {
    gameFieldSize: {rows: 24, columns: 40},
    roomsNumberMinMax: [5, 10],
    roomsSizeMinMax: [3, 8],
    hallsNumberMinMax: [3, 5]
}
const numberOf = {
    player: 1,
    enemy: 10,
    swords: 2,
    healthPotions: 10
}

class Game {
    player;
    constructor(generationArguments, field, tiles, numberOf) {
        this.gameFieldSize = generationArguments.gameFieldSize;
        this.gameFieldTiles = [];
        this.enemies = [];
        this.tiles = tiles;
        this.roomsNumberMinMax = generationArguments.roomsNumberMinMax;
        this.roomsSizeMinMax = generationArguments.roomsSizeMinMax;
        this.generationField = new GenerateField(generationArguments, field, this.gameFieldTiles, tiles.wallTile);
        this.generateRoom = new GenerateRoom(generationArguments, field, this.gameFieldTiles, tiles.roomTile);
        this.generateHalls = new GenerateHalls(generationArguments, field, this.gameFieldTiles, tiles.roomTile);
        this.spawn = new Spawn(numberOf, this.gameFieldSize);
    }
    init() {
        this.gameFieldTiles = this.generationField.createGameField(this.gameFieldTiles);
        this.generateHalls.generation();
        this.generateRoom.generation(this.roomsNumberMinMax, this.roomsSizeMinMax, this.gameFieldTiles);
        [this.player, this.enemies] = this.spawn.spawnAll(this.tiles, this.gameFieldTiles);
        this.player.movePlayer(this.enemies);
    }
}

class Generation {
    constructor(generationArguments, field, gameFieldTiles) {
        this.field = field;
        this.gameFieldTiles = gameFieldTiles;
        this.gameFieldSize = generationArguments.gameFieldSize;
        this.supportFunctions = new SupportFunctions();
    }
}

class GenerateField extends Generation {
    constructor(generationArguments, field, gameFieldTiles, elemClassName) {
        super(generationArguments, field, gameFieldTiles)
        this.className = elemClassName;
    }
    createTile(elemClassName) { //Создание одного тайла
        const tile = document.createElement('div');
        tile.className = elemClassName;
        return tile;
    }
    createGameField(coordsArray) { //Создание поля, заполнение его стеной
        this.field.style.gridTemplate = `repeat(${this.gameFieldSize.rows}, 1fr) / repeat(${this.gameFieldSize.columns}, 1fr)`;
        const {rows, columns} = this.gameFieldSize;
        for (let i = 0; i < rows * columns; i++) {
            const tile = this.createTile(this.className);
            this.field.appendChild(tile);
            const row = Math.floor(i / columns);
            const column = i % columns;
            coordsArray.push({tile: tile, cords: [row, column]});
        }
        return coordsArray;
    }
}

class GenerateRoom extends Generation {
    constructor(generationArguments, field, gameFieldTiles, elemClassName) {
        super(generationArguments, field, gameFieldTiles)
        this.roomsSizeMinMax = generationArguments.roomsSizeMinMax;
        this.className = elemClassName;
    }
    generateRoomSize(randomGen, minMax) {
        return [randomGen(minMax), randomGen(minMax)] //[По оси X, По оси Y]
    }

    generateRandomCords(roomSize, fieldSize) {
        let x = Math.floor(Math.random() * (fieldSize.rows - roomSize[0]));
        let y = Math.floor(Math.random() * (fieldSize.columns - roomSize[1]));
        return [x, y];
    }

    isSpawnValid(randomIndex, roomSize) { //Проверка на достижимость генерируемой комнаты
        let spawnCounter = false;
        let fovRandomIndex = randomIndex;
        let gameFieldSize = this.gameFieldSize;
        let counter = 0;
        let upSide = 0, rightSide = 0, leftSide = 0, downSide = 0;
        //4 флага для области видимости вокруг каждой генерируемой комнаты (1 клетка сверху, снизу, слева, справа).
        if (randomIndex > gameFieldSize.columns ) {
            upSide += 1;
            fovRandomIndex = randomIndex - gameFieldSize.columns;
        }
        if (!(randomIndex % gameFieldSize.columns === 0)) {
            leftSide += 1;
            fovRandomIndex = fovRandomIndex - 1;
        }
        if (!(randomIndex % gameFieldSize.columns === 39)) {
            rightSide += 1;
        }
        if (randomIndex < (gameFieldSize.rows - 1) * gameFieldSize.columns) {
            downSide += 1;
        }
        for (let j = 0; j < (roomSize[0] + upSide + downSide) * (roomSize[1] + rightSide + leftSide); j++) {
            if (this.gameFieldTiles[fovRandomIndex + j].tile.className === 'tile') {
                spawnCounter = true;
                break;
            }
            counter++;
            if (counter === roomSize[1] + rightSide + leftSide) {
                fovRandomIndex += gameFieldSize.columns - roomSize[1] - rightSide - leftSide;
                counter = 0;
            }
        }
        return spawnCounter;
    }

    generationRoom(minMaxRoomSize) {
        let roomSize = this.generateRoomSize(this.supportFunctions.randomGenerator, minMaxRoomSize);
        let counter = 0;
        let randomCord = this.generateRandomCords(roomSize, this.gameFieldSize);
        let randomIndex = this.supportFunctions.getTileIndexFromPosition(randomCord, this.gameFieldSize);
        let spawnValid = this.isSpawnValid(randomIndex, roomSize);
        if (spawnValid) {
            for (let i = 0; i < roomSize[0]  * roomSize[1]; i++) {
                this.gameFieldTiles[randomIndex + i].tile.className = 'tile';
                counter++;
                if (counter === roomSize[1]) {
                    randomIndex += this.gameFieldSize.columns - roomSize[1];
                    counter = 0;
                }
            }
        } else { //Если комната изолирована, запускается генерация новой комнаты заместо старой.
            this.generationRoom(minMaxRoomSize);
        }
    }
    generation(minMaxRooms, minMaxRoomSize, gameFieldTiles) {
        this.gameFieldTiles = gameFieldTiles;
        let numberOfRooms = this.supportFunctions.randomGenerator(minMaxRooms); //От 5 до 10 комнат
        for (let i = 0; i < numberOfRooms; i++) {
            this.generationRoom(minMaxRoomSize);
        }
    }
}

class GenerateHalls extends Generation {
    constructor(generationArguments, field, gameFieldTiles, elemClassName) {
        super(generationArguments, field, gameFieldTiles);
        this.hallsNumberMinMax = generationArguments.hallsNumberMinMax;
        this.className = elemClassName;
        this.supportFunctions = new SupportFunctions();
    }
    generateHall(generatingAxis) {
        let numberOfHalls = this.supportFunctions.randomGenerator(this.hallsNumberMinMax);
        let gameField;

        if (generatingAxis === 'x') { //Если генерируется по оси X, то все значения стандартны. Если по оси Y, меняем
            gameField = [this.gameFieldSize.rows, this.gameFieldSize.columns];  //значения местами
        } else {                                                               //(необходимо для формул генерации)
            gameField = [this.gameFieldSize.columns, this.gameFieldSize.rows];
        }

        let uniqueGeneration = [0, gameField[0] - 1];
        for (let i = 0; i < numberOfHalls; i++) {
            let axis = Math.floor(Math.random() * gameField[0]);

            if (!uniqueGeneration.includes(axis)) {
                uniqueGeneration.push(axis, axis + 1, axis - 1);
                for (let j = 0; j < gameField[1]; j++) {
                    let cords;
                    if (generatingAxis === 'x') {
                        cords = [axis, j]
                    } else {
                        cords = [j, axis];
                    }
                    let index = this.supportFunctions.getTileIndexFromPosition(cords, this.gameFieldSize);
                    this.gameFieldTiles[index].tile.className = this.className;
                }
            } else {
                numberOfHalls += 1;
            }
        }
    }
    generation() {
        this.generateHall('x');
        this.generateHall('y');
    }
}

class SupportFunctions {
    constructor() {
    }
    getTileIndexFromPosition([x, y], gameFieldSize) { //Получение индекса тайла через координаты
        return x * gameFieldSize.columns + y;
    }

    getTileFromCoords(coords, gameFieldTiles, gameFieldSize) { //Получение тайла (HTML-элемент) через координаты
        return gameFieldTiles[this.getTileIndexFromPosition(coords, gameFieldSize)].tile;
    }

    randomGenerator(minMax) { //Генерация случайных чисел
        return Math.floor(Math.random() * (minMax[1] - minMax[0] + 1) + minMax[0]);
    }
}

class Spawn {
    constructor(numberOf, gameFieldSize) {
        this.numberOf = numberOf;
        this.gameFieldSize = gameFieldSize;
    }
    spawnActivate(className, howMany, emptyTiles, tiles, gameFieldTiles) {
        let player;
        for (let i = 0; i < howMany; i++) {
            const randomIndex = Math.floor(Math.random() * emptyTiles.length);
            emptyTiles[randomIndex].tile.classList.toggle(className);
            if (className === tiles.playerTile) {
                player = new Player(emptyTiles[randomIndex].cords, tiles, this.gameFieldSize, gameFieldTiles);
                player.showHealthBar();
            }
            emptyTiles.splice(randomIndex, 1);
        }
        return player;
    }
    spawnEnemies(className, howMany, emptyTiles, tiles, gameFieldTiles, player) {
        let enemies = [];
        for (let i = 0; i < howMany; i++) {
            const randomIndex = Math.floor(Math.random() * emptyTiles.length);
            emptyTiles[randomIndex].tile.classList.toggle(className);
            let enemy = new Enemy(emptyTiles[randomIndex].cords, tiles, this.gameFieldSize, gameFieldTiles, player);
            enemies.push(enemy);
            enemy.showHealthBar();
            emptyTiles.splice(randomIndex, 1);
        }
        return enemies;
    }
    spawnAll(tiles, gameFieldTiles) {
        let checkingElem = tiles.wallTile;
        let emptyTiles = gameFieldTiles.filter((elem) => !elem.tile.classList.contains(checkingElem));
        this.spawnActivate(tiles.swordTile, this.numberOf.swords, emptyTiles, tiles, gameFieldTiles); //Мечи
        this.spawnActivate(tiles.healthPotionTile, this.numberOf.healthPotions, emptyTiles, tiles, gameFieldTiles); //Банки здоровья
        let player = this.spawnActivate(tiles.playerTile, this.numberOf.player, emptyTiles, tiles, gameFieldTiles); //Герой
        let enemies = this.spawnEnemies(tiles.enemyTile, this.numberOf.enemy, emptyTiles, tiles, gameFieldTiles, player);//Враги
        return [player, enemies];
    }
}

class Mob {
    className;
    healthBar;
    attack;
    constructor(cords, tiles, gameFieldSize, gameFieldTiles) {
        this.cords = cords;
        this.health = '100%';
        this.gameFieldSize = gameFieldSize;
        this.gameFieldTiles = gameFieldTiles;
        this.tiles = tiles;
        this.supportFunction = new SupportFunctions();
    }
    isValidPosition(nextMovePosition, gameFieldSize) {
        //проверяем ход на валидность (новая позиция больше 0 и меньше ширины/высоты поля)
        const xAxisIsValid = nextMovePosition[0] >= 0 && nextMovePosition[0] < gameFieldSize.rows;
        const yAxisIsValid = nextMovePosition[1] >= 0 && nextMovePosition[1] < gameFieldSize.columns;
        let isValid = xAxisIsValid && yAxisIsValid;

        if (!isValid) {
            return this.cords; //Не даём игроку переместиться за границу карты
        } else {
            return nextMovePosition;
        }
    }
    move(nextMovePosition) {
        let nextMove = nextMovePosition;
        const actualTile = this.supportFunction.getTileFromCoords(this.cords, this.gameFieldTiles, this.gameFieldSize); //Получаем текущую позицию игрока/врага.
        nextMove = this.isValidPosition(nextMovePosition, this.gameFieldSize);
        let nextTile = this.supportFunction.getTileFromCoords(nextMove, this.gameFieldTiles, this.gameFieldSize);
        actualTile.classList.toggle(this.className);                     //Прячем модельку игрока/врага на старой клетке

        const isMoveValid = () => {
            if (nextTile.className === this.tiles.wallTile
                || nextTile.className.includes(this.tiles.enemyTile)
                || nextTile.className.includes(this.tiles.playerTile)) {
                //Не даём игроку/врагу переместиться на блок со стеной или врагом
                nextMove = this.cords;
                nextTile = actualTile;
            } else if (nextTile.className.includes(this.tiles.healthPotionTile)) {
                this.health = '100%';
                nextTile.classList.toggle(this.tiles.healthPotionTile)
            } else if (nextTile.className.includes(this.tiles.swordTile)) {
                this.attack += 15;
                nextTile.classList.toggle(this.tiles.swordTile)
            }
        }
        isMoveValid();
        if (actualTile.childNodes.length > 0) {
            actualTile.removeChild(actualTile.childNodes[0]); //Удаляем полоску здоровья
        }

        nextTile.classList.toggle(this.className);
        nextTile.appendChild(this.createHealthBar(this.healthBar, this.health));//Перемещаем игрока/врага на новую клетку
        this.cords = nextMove;
    }

    createHealthBar(className) { //Создание полоски здоровья
        const health = document.createElement('div');
        health.className = className;
        health.style.width = this.health;
        return health;
    }
    showHealthBar() {
        let healthBar = this.createHealthBar(this.healthBar, this.health);
        let tile = this.supportFunction.getTileFromCoords(this.cords, this.gameFieldTiles, this.gameFieldSize);
        tile.appendChild(healthBar);
    }
    lookingForEnemy() {
        let lookingForEnemyArray = [];
        for (let i = -1; i < 2; i++) {
            for (let j = -1; j < 2; j++) {
                if (this.cords[0] + i < 0 || this.cords[0] + i > this.gameFieldSize.rows ||
                    this.cords[1] + j < 0 || this.cords[1] + j > this.gameFieldSize.columns) {
                    continue;
                }
                lookingForEnemyArray.push([this.cords[0] + i, this.cords[1] + j]);
            }
        }
        return lookingForEnemyArray;
    }
}

// Объявляем класс Player, который наследуется от класса Mob
class Player extends Mob {
    constructor(cords, tiles, gameFieldSize, gameFieldTiles) {
        super(cords, tiles, gameFieldSize, gameFieldTiles);
        this.healthBar = tiles.playerHealthBar;
        this.className = tiles.playerTile;
        this.attack = 35;
    }
    movePlayer(enemies) {
        let nextMovePosition = [0,0];
        document.onkeydown = (e) => {
            if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(e.code)) {
                if (e.code === 'KeyW') {
                    nextMovePosition = [this.cords[0] + (-1), this.cords[1]];
                } else if (e.code === 'KeyA') {
                    nextMovePosition = [this.cords[0], this.cords[1] + (-1)];
                } else if (e.code === 'KeyS') {
                    nextMovePosition = [this.cords[0] + 1, this.cords[1]];
                } else if (e.code === 'KeyD') {
                    nextMovePosition = [this.cords[0], this.cords[1] + 1];
                } else if (e.code === "Space") {
                    e.preventDefault();
                    this.meleeAttack(enemies);
                }
                this.move(nextMovePosition);
            }
        }
    }
    meleeAttack(enemies) {
        let lookingForEnemy = this.lookingForEnemy();
        lookingForEnemy.forEach((cords) => {
            let elem = this.supportFunction.getTileFromCoords(cords, this.gameFieldTiles, this.gameFieldSize);
            if (elem.className.includes(this.tiles.enemyTile)) {
                for (let i = 0; i < enemies.length; i++) {
                    if (enemies[i].cords[0] === cords[0] && enemies[i].cords[1] === cords[1]) {
                        let enemy = enemies[i];
                        enemy.health = +enemy.health.slice(0, -1) - this.attack;
                        if (enemy.health <= 0) {
                            enemies.splice(i, 1);
                            elem.classList.toggle(this.tiles.enemyTile);
                            elem.removeChild(elem.childNodes[0]);
                            enemy.health = enemy.health + '%';
                            break;
                        } else {
                            enemy.health = enemy.health + '%';
                            elem.removeChild(elem.childNodes[0]);
                            enemy.showHealthBar();
                        }
                    }
                }
            }
        })
    }
}

// Объявляем класс Enemy, который наследуется от класса Mob
class Enemy extends Mob {
    constructor(cords, tiles, gameFieldSize, gameFieldTiles, player) {
        super(cords, tiles, gameFieldSize, gameFieldTiles);
        this.healthBar = tiles.enemyHealthBar;
        this.player = player;
        this.className = tiles.enemyTile;
        this.attack = 20;
    }
    enemyMovement = setInterval(() => {
        if (this.health.slice(0, -1) <= 0) {
            clearInterval(this.enemyMovement);
        } else {
            let nextMovePosition;
            let possibleDirections = ['a', 's', 'd', 'w'];
            let randomDirection = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];

            if (randomDirection === 'w') {
                nextMovePosition = [this.cords[0] + (-1), this.cords[1] + 0];
            } else if (randomDirection === 'a') {
                nextMovePosition = [this.cords[0] + 0, this.cords[1] + (-1)];
            } else if (randomDirection === 's') {
                nextMovePosition = [this.cords[0] + 1, this.cords[1] + 0];
            } else if (randomDirection === 'd') {
                nextMovePosition = [this.cords[0] + 0, this.cords[1] + 1];
            }
            this.move(nextMovePosition);
        }
    }, 500);
    enemyAttack = setInterval(() => {
        if (this.health.slice(0, -1) <= 0) {
            clearInterval(this.enemyAttack)
        } else {
            let lookingForEnemy = this.lookingForEnemy();
            lookingForEnemy.forEach((cords) => {
                let elem = this.supportFunction.getTileFromCoords(cords, this.gameFieldTiles, this.gameFieldSize);
                if (elem.className.includes(this.tiles.playerTile)) {
                    this.player.health = +this.player.health.slice(0, -1) - this.attack;
                    if (this.player.health <= 0) {
                        elem.classList.toggle(this.tiles.playerTile);
                        elem.removeChild(elem.childNodes[0]);
                        alert('You lost!');
                    } else {
                        elem.removeChild(elem.childNodes[0]);
                        this.player.health = this.player.health + '%';
                        this.player.showHealthBar();
                    }
                }
            })
        }

    }, 500)
}

let game = new Game(generationArguments, field, tiles, numberOf);
game.init();
