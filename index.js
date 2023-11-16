
class Game {
    constructor() {
        this.field = document.querySelector('.field');
        this.gamefieldSize = {rows: 24, columns: 40};
        this.gameFieldTiles = [];
        this.emptyTiles = [];
        this.player = [0,0];
        this.playerMeleeAttack = 35;
        this.enemyAttack = 20;
        this.enemies= [];
    }

    init() {
        this.createGameField(this.gameFieldTiles);
        this.generateRooms();
        this.generateHalls();
        this.spawnAll();
        this.movePlayer();
    }

    createTile(elemClassName) { //Создание одного тайла
        const tile = document.createElement('div');
        tile.className = elemClassName;
        return tile;
    }

    createGameField(coordsArray) { //Создание поля, заполнение его стеной
        const {rows, columns} = this.gamefieldSize;
        for (let i = 0; i < rows * columns; i++) {
            const tile = this.createTile('tileW');
            this.field.appendChild(tile);
            const row = Math.floor(i / columns);
            const column = i % columns;
            coordsArray.push({tile: tile, cords: [row, column]});
        }
    }

    getTileIndexFromPosition([x, y]) { //Получение индекса тайла через координаты
        return x * this.gamefieldSize.columns + y;
    }

    getTileFromCoords(coords) { //Получение тайла (HTML-элемент) через координаты
        return this.gameFieldTiles[this.getTileIndexFromPosition(coords)].tile;
    }

    randomGenerator(min, max) { //Генерация случайных чисел
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    generateRoom() { //Генерация одной комнаты
        function generateRoomSize(randomGen) {
            return [randomGen(3, 8), randomGen(3, 8)] //[По оси X, По оси Y]
            //От 3 до 8 размер комнат
        }
        function generateRandomCords(roomSize, fieldSize) {
            let x = Math.floor(Math.random() * (fieldSize.rows - roomSize[0]));
            let y = Math.floor(Math.random() * (fieldSize.columns - roomSize[1]));
            return [x, y];
        }

        let roomSize = generateRoomSize(this.randomGenerator);
        let counter = 0;
        let randomCord = generateRandomCords(roomSize, this.gamefieldSize);
        let randomIndex = this.getTileIndexFromPosition(randomCord);
        for (let i = 0; i < roomSize[0] * roomSize[1]; i++) {
            this.gameFieldTiles[randomIndex + i].tile.className = 'tile';
            counter++;
            if (counter === roomSize[1]) {
                randomIndex += this.gamefieldSize.columns - roomSize[1];
                counter = 0;
            }
        }
    }

    generateRooms() {
        let numberOfRooms = this.randomGenerator(5, 10); //От 5 до 10 комнат
        for (let i = 0; i < numberOfRooms; i++) {
            this.generateRoom();
        }
    }

    generateHall(generatingAxis) { //Генерация коридоров
        let numberOfHalls = this.randomGenerator(3, 5);
        let gameField;

        if(generatingAxis === 'x') { //Если генерируется по оси X, то все значения стандартны. Если по оси Y, меняем
            gameField= [this.gamefieldSize.rows, this.gamefieldSize.columns];  //значения местами
        } else {                                                               //(необходимо для формул генерации)
            gameField = [this.gamefieldSize.columns, this.gamefieldSize.rows];
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
                    let index = this.getTileIndexFromPosition(cords);
                    this.gameFieldTiles[index].tile.className = 'tile';
                }
            } else {
                numberOfHalls += 1;
            }
        }
    }

    generateHalls() {
        this.generateHall('x');
        this.generateHall('y');
    }

    createHealthBar(className, width) { //Создание полоски здоровья
        const health = document.createElement('div');
        health.className = className;
        health.style.width = width;
        return health;
    }

    spawn(className, howMany) {
        for (let i = 0; i < howMany; i++) {
            const randomIndex = Math.floor(Math.random() * this.emptyTiles.length);
            this.emptyTiles[randomIndex].tile.classList.toggle(className);
            if (className === 'tileP') {
                this.player = this.emptyTiles[randomIndex].cords;
                this.emptyTiles[randomIndex].tile.appendChild(this.createHealthBar("healthP", '100%'));
            }
            if (className === 'tileE') {
                this.enemies.push(this.emptyTiles[randomIndex].cords);
                this.emptyTiles[randomIndex].tile.appendChild(this.createHealthBar('healthE', '100%'));
            }
            this.emptyTiles.splice(randomIndex, 1);
        }
    }

    spawnAll() {
        this.emptyTiles = this.gameFieldTiles.filter((elem) => !elem.tile.classList.contains('tileW'));
        this.spawn('tileSW', 2); //Мечи
        this.spawn('tileHP', 10); //Банки здоровья
        this.spawn('tileP', 1); //Герой
        this.spawn('tileE', 10); //Враги
    }

    lookingForEnemy(cords) {
        let lookingForEnemyArray = [];
        for (let i = -1; i < 2; i++) {
            for (let j = -1; j < 2; j++) {
                if (cords[0] + i < 0 || cords[0] + i > this.gamefieldSize.rows ||
                    cords[1] + j < 0 || cords[1] + j > this.gamefieldSize.columns) {
                    continue;
                }
                lookingForEnemyArray.push([cords[0] + i, cords[1] + j]);
            }
        }
        return lookingForEnemyArray;
    }

    playerAttack(playerCords) { //Атака игроком
        let lookingForEnemy = this.lookingForEnemy(playerCords);
        lookingForEnemy.forEach((cords) => {
            let elem = this.getTileFromCoords(cords);
            if (elem.className.includes('tileE')) {
                let width = +elem.childNodes[0].style.width.slice(0, -1) - this.playerMeleeAttack;
                elem.removeChild(elem.childNodes[0]); //Нанесение урона по врагу
                if (width <= 0) {
                    for (let i = 0; i < this.enemies.length; i++) {
                        if (this.enemies[i][0] === cords[0] && this.enemies[i][1] === cords[1]) {
                            this.enemies.splice(i, 1);
                            if (this.enemies.length === 0) {
                                alert("You won! Congrats");
                                this.field.replaceChildren();
                            }
                            break;
                        }
                    }
                    elem.classList.toggle('tileE');
                } else {
                    elem.appendChild(this.createHealthBar('healthE', width + '%'));
                }
            }
        })
    }
    enemyAttack = setInterval(() => { //Атака врагом
        let lookingForPlayer = this.lookingForEnemy(this.player);
        let player = this.getTileFromCoords(this.player);
        lookingForPlayer.forEach((cords) => {
            let elem = this.getTileFromCoords(cords);
            if (elem.className.includes('tileE')) { //Если игрок рядом с врагом, игрок получает урон, равный атаке врага
                let width = player.childNodes[0].style.width.slice(0, -1) - this.enemyAttack;
                player.removeChild(player.childNodes[0]);
                if (width <= 0) {
                    alert('GAME OVER!');
                    this.field.replaceChildren();
                } else {
                    player.appendChild(this.createHealthBar('healthP', width + '%'));
                }
            }
        })
    }, 1000);

    isValidPosition(nextMovePosition, cords) {
        //проверяем ход на валидность (новая позиция больше 0 и меньше ширины/высоты поля)
        const xAxisIsValid = nextMovePosition[0] >= 0 && nextMovePosition[0] < this.gamefieldSize.rows;
        const yAxisIsValid = nextMovePosition[1] >= 0 && nextMovePosition[1] < this.gamefieldSize.columns;
        let isValid = xAxisIsValid && yAxisIsValid;

        if (!isValid) {
            return cords; //Не даём игроку переместиться за границу карты
        } else {
            return nextMovePosition;
        }
    }

    move(cords, className, nextMovePosition) {
        let nextMove = nextMovePosition;
        const actualTile = this.getTileFromCoords(cords); //Получаем текущую позицию игрока/врага.
        nextMove = this.isValidPosition(nextMovePosition, cords);
        let nextTile = this.getTileFromCoords(nextMove);
        actualTile.classList.toggle(className);                     //Прячем модельку игрока/врага на старой клетке
        let healthWidth = actualTile.childNodes[0].style.width; //Получаем информацию о его здоровье

        const isMoveValid = () => {
            if (nextTile.className === 'tileW'
                || nextTile.className.includes("tileE")
                || nextTile.className.includes('tileP')) {
                //Не даём игроку/врагу переместиться на блок со стеной или врагом
                nextMove = cords;
                nextTile = actualTile;
            } else if (nextTile.className.includes('tileHP')) {
                healthWidth = '100%';
                nextTile.classList.toggle('tileHP')
            } else if (nextTile.className.includes('tileSW')) {
                if (className === 'tileP') {
                    this.playerMeleeAttack += 15;
                } else if (className === 'tileE') {
                    this.enemyAttack += 15;
                }
                nextTile.classList.toggle('tileSW')
            }
        }
        isMoveValid();
        actualTile.removeChild(actualTile.childNodes[0]);              //Удаляем полоску здоровья
        nextTile.classList.toggle(className);                     //Перемещаем игрока/врага на новую клетку
        if (className === 'tileP') {
            nextTile.appendChild(this.createHealthBar('healthP', healthWidth));
            this.player = nextMove;       //Добавляем новую полоску здоровья и меняем координаты игрока
        } else if (className === 'tileE') {
            nextTile.appendChild(this.createHealthBar('healthE', healthWidth));
            return nextMove;
        }
    }

    movePlayer() {
        let nextMovePosition;
        document.onkeydown = (e) => {
            if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(e.code)) {
                if (e.code === 'KeyW') {
                    nextMovePosition = [this.player[0] + (-1), this.player[1]];
                } else if (e.code === 'KeyA') {
                    nextMovePosition = [this.player[0], this.player[1] + (-1)];
                } else if (e.code === 'KeyS') {
                    nextMovePosition = [this.player[0] + 1, this.player[1]];
                } else if (e.code === 'KeyD') {
                    nextMovePosition = [this.player[0], this.player[1] + 1];
                } else if (e.code === "Space") {
                    e.preventDefault();
                    this.playerAttack(this.player);
                }
                this.move(this.player, 'tileP',  nextMovePosition);
            }
        }
    }
    enemyMovement = setInterval(() => {
        this.enemies.forEach((cords, index) => {
            let nextMovePosition;
            let possibleDirections = ['a', 's', 'd', 'w'];
            let randomDirection = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];

            if (randomDirection === 'w') {
                nextMovePosition = [cords[0] + (-1), cords[1] + 0];
            } else if (randomDirection === 'a') {
                nextMovePosition = [cords[0] + 0, cords[1] + (-1)];
            } else if (randomDirection === 's') {
                nextMovePosition = [cords[0] + 1, cords[1] + 0];
            } else if (randomDirection === 'd') {
                nextMovePosition = [cords[0] + 0, cords[1] + 1];
            }
            //Обновляем позицию конуретного врага
            this.enemies[index] = this.move(cords, 'tileE', nextMovePosition);
        })
    }, 500);
}

let game = new Game();
game.init();