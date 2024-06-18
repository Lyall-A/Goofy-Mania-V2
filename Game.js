let globalSpeed = 1;

class Game {
    constructor(gameContainer, map, level, settings) {
        this.gameContainer = gameContainer;
        this.map = map;
        this.level = level;
        this.settings = settings;

        this.rows = [];

        this.points = 0;
        this.multiplier = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.misses = 0;
        this.accuracy = 100.00;
        this.givenPoints = {};
    }

    async start() {
        // THIS IS JUST TEMP SHIT FRRRRRR IMA MAKE THIS BETTER (PROBABLY NOT)
        if (this.map.backgroundData) {
            const backgroundURL = URL.createObjectURL(this.map.backgroundData);
            this.gameContainer.style.backgroundImage = `url("${backgroundURL}")`;
        }
        const audioURL = URL.createObjectURL(this.map.audioData);
        const audio = new Audio(audioURL);
        audio.onloadeddata = () => URL.revokeObjectURL(audioURL);
        audio.volume = 0.25; // kill oyurself
        audio.playbackRate = globalSpeed;
        await audio.play();

        setTimeout(() => {
            let lastBeat = 0;
            const getNextNote = index => {
                const nextNote = this.level.data[index];
                if (!nextNote) return;
                const row = nextNote[0];
                const sliderHeight = nextNote[1];
                const beat = nextNote[2];

                // TODO work
                // gameLoop((deltaTime, nextFrame, fps) => {
                //     if (Date.now() - time <= timeout) return nextFrame();
                //     lastBeat = beat;
                //     spawnNote(row, sliderHeight);
                //     getNextNote(index + 1);
                // });
                setTimeout(() => {
                    lastBeat = beat;
                    this.spawnNote(row, sliderHeight);
                    getNextNote(index + 1);
                }, ((beat - lastBeat) / this.map.bpm) * 60 * 1000);
            }
            getNextNote(0);
        }, this.map.offset);
    }

    // ----
    spawnNote(row, sliderHeight) {
        const noteElement = document.createElement("div");
        noteElement.classList.add("note");
        let top = 0;
        noteElement.style.top = `${top}px`;

        this.gameLoop((deltaTime, nextFrame, fps) => {
            top += 1 * deltaTime * globalSpeed * ((this.settings.scrollSpeed || this.level.scrollSpeed) / 10);
            noteElement.style.top = `${top}px`;
            if (top >= screen.availHeight) {
                if (!this.rows[row - 1].notesElement.contains(noteElement)) return;
                noteElement.remove();
            } else nextFrame();
        });

        this.rows[row - 1].notesElement.appendChild(noteElement);
    }

    onKeyPress(index) {
        this.rows[index].keyElement.classList.toggle("pressed");
        const closestNote = this.rows[index].notesElement.children[0];
        if (!closestNote) return;

        const closestNoteTop = closestNote.offsetTop - closestNote.clientHeight;
        const keyTop = this.rows[index].keyElement.offsetTop;

        const distance = Math.max(closestNoteTop - keyTop, keyTop - closestNoteTop);

        // points 
        if (distance <= 25) {
            console.log("VERY GOOD")
        } else if (distance <= 50) {
            console.log("GOOD")
        } else if (distance <= 100) {
            console.log("shit")
        } else if (distance <= 150) {
            console.log("miss")
        } else return;
        
        this.hitNote(closestNote);
    }

    onKeyRelease(index) {
        this.rows[index].keyElement.classList.toggle("pressed");
    }

    stop() {

    }

    hitNote(note) {
        note.remove();
    }

    init() {
        // Create game
        this.gameContainer.innerHTML = "";
        this.gameElement = document.createElement("div");
        this.gameElement.classList.add("game");
        this.gameContainer.appendChild(this.gameElement);

        // Create rows
        const rowsElement = document.createElement("div");
        rowsElement.classList.add("rows");
        this.gameElement.appendChild(rowsElement);

        for (let i = 0; i < this.level.keys; i++) {
            const rowElement = document.createElement("div");
            rowElement.classList.add("row");
            rowsElement.appendChild(rowElement);

            const notesElement = document.createElement("div");
            notesElement.classList.add("notes");
            rowElement.appendChild(notesElement);

            const keyElement = document.createElement("div");
            keyElement.classList.add("key");
            rowElement.appendChild(keyElement);

            this.rows.push({ rowElement, notesElement, keyElement });
        }

        // Create events
        // Key pressed
        document.body.onkeydown = ev => {
            const index = this.settings.keybinds[`${this.level.keys}-keys`]?.findIndex(i => i == ev.key);
            if (index >= 0 && !this.rows[index].pressed) {
                this.rows[index].pressed = true;
                this.onKeyPress(index);
            }
        }
        // Key released
        document.body.onkeyup = ev => {
            const index = this.settings.keybinds[`${this.level.keys}-keys`]?.findIndex(i => i == ev.key);
            if (index >= 0 && this.rows[index].pressed) {
                this.rows[index].pressed = false;
                this.onKeyRelease(index);
            }
        }
    }

    destroy() {
        this.gameContainer.innerHTML = "";
        // TODO: remove events etc
    }

    gameLoop(callback) {
        let prevTime;
        let fps = 0;

        const loop = () => {
            const time = Date.now();
            const deltaTime = time - (prevTime || time);
            if (deltaTime) fps = Math.round(1000 / deltaTime);
            prevTime = time;

            callback(deltaTime, () => requestAnimationFrame(loop), fps);
        }

        requestAnimationFrame(loop);
    }
}

async function startGame(gameContainer, map, level, settings) {
    // Variables
    let gameElement;
    const recordedData = [];
    const rows = [];

    setupGame();
    createRows();
    createEvents();

    // gameLoop((deltaTime, nextFrame, fps) => {
    //     console.log("FPS:", fps);
    //     nextFrame();
    // });

    // THIS IS JUST TEMP SHIT FRRRRRR IMA MAKE THIS BETTER (PROBABLY NOT)
    let test = 0;
    if (map.backgroundData) {
        const backgroundURL = URL.createObjectURL(map.backgroundData);
        gameContainer.style.backgroundImage = `url("${backgroundURL}")`;
    }
    const audioURL = URL.createObjectURL(map.audioData);
    const audio = new Audio(audioURL);
    audio.onended = () => URL.revokeObjectURL(audioURL);
    audio.onloadeddata = () => console.log(audio.duration);
    audio.volume = 0.25; // kill oyurself
    audio.playbackRate = globalSpeed;
    await audio.play();

    setTimeout(() => {
        let lastBeat = 0;
        const getNextNote = index => {
            const nextNote = level.data[index];
            if (!nextNote) return;
            const row = nextNote[0];
            const sliderHeight = nextNote[1];
            const beat = nextNote[2];

            let time = Date.now();
            const timeout = ((beat - lastBeat) / map.bpm) * 60 * 1000;

            gameLoop((deltaTime, nextFrame, fps) => {
                if (Date.now() - time <= timeout) return nextFrame();
                lastBeat = beat;
                spawnNote(row, sliderHeight);
                getNextNote(index + 1);
            });
            // setTimeout(() => {
            //     lastBeat = beat;
            //     spawnNote(row, sliderHeight);
            //     getNextNote(index + 1);
            // }, ((beat - lastBeat) / map.bpm) * 60 * 1000);
        }
        getNextNote(0);
    }, map.offset);

    // ----

    function spawnNote(row, sliderHeight) {
        const noteElement = document.createElement("div");
        noteElement.classList.add("note");
        let top = 0;
        noteElement.style.top = `${top}px`;

        gameLoop((deltaTime, nextFrame, fps) => {
            test += deltaTime;
            top += 1 * deltaTime * globalSpeed * ((settings.scrollSpeed || level.scrollSpeed) / 10);
            noteElement.style.top = `${top}px`;
            if (top >= screen.availHeight) {
                if (!rows[row - 1].notesElement.contains(noteElement)) return;
                noteElement.remove();
            } else nextFrame();
        });

        rows[row - 1].notesElement.appendChild(noteElement);
    }

    function hitNote(note) {
        note.remove() // TODO: BLOW THE FUCK UP
    }

    function setupGame() {
        gameContainer.innerHTML = "";
        gameElement = document.createElement("div");
        gameElement.classList.add("game");
        gameContainer.appendChild(gameElement);
    }

    function createRows() {
        const rowsElement = document.createElement("div");
        rowsElement.classList.add("rows");
        gameElement.appendChild(rowsElement);

        for (let i = 0; i < level.keys; i++) {
            const rowElement = document.createElement("div");
            rowElement.classList.add("row");
            rowsElement.appendChild(rowElement);

            const notesElement = document.createElement("div");
            notesElement.classList.add("notes");
            rowElement.appendChild(notesElement);

            const keyElement = document.createElement("div");
            keyElement.classList.add("key");
            rowElement.appendChild(keyElement);

            rows.push({ rowElement, notesElement, keyElement });
        }
    }

    function createEvents() {
        // Key pressed
        document.body.onkeydown = ev => {
            const index = settings.keybinds[`${level.keys}-keys`]?.findIndex(i => i == ev.key);
            if (index >= 0 && !rows[index].pressed) {
                rows[index].pressed = true;
                onKeyPress(index);
            }
        }
        // Key released
        document.body.onkeyup = ev => {
            const index = settings.keybinds[`${level.keys}-keys`]?.findIndex(i => i == ev.key);
            if (index >= 0 && rows[index].pressed) {
                rows[index].pressed = false;
                onKeyRelease(index);
            }
        }
    }

    function onKeyPress(index) {
        rows[index].keyElement.classList.toggle("pressed");
        const closestNote = rows[index].notesElement.children[0];
        if (!closestNote) return;

        const closestNoteTop = closestNote.offsetTop - closestNote.clientHeight;
        const keyTop = rows[index].keyElement.offsetTop;

        const distance = Math.max(closestNoteTop - keyTop, keyTop - closestNoteTop);

        // points 
        if (distance <= 25) {
            console.log("VERY GOOD")
        } else if (distance <= 50) {
            console.log("GOOD")
        } else if (distance <= 100) {
            console.log("shit")
        } else if (distance <= 150) {
            console.log("miss")
        } else return;
        hitNote(closestNote)
    }

    function onKeyRelease(index) {
        rows[index].keyElement.classList.toggle("pressed");
    }

    function gameLoop(callback) {
        let prevTime;
        let fps = 0;

        const loop = () => {
            const time = Date.now();
            const deltaTime = time - (prevTime || time);
            if (deltaTime) fps = Math.round(1000 / deltaTime);
            prevTime = time;

            callback(deltaTime, () => requestAnimationFrame(loop), fps);
        }

        requestAnimationFrame(loop);
    }
}