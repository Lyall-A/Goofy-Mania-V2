class Game {
    constructor(gameContainer, map, level, userSettings, gameSettings = {
        globalSpeed: 1,
        points: [
            { distance: 25, points: 350 },
            { distance: 50, points: 300 },
            { distance: 100, points: 200 },
            { distance: 150, points: 100 },
            { distance: 175, points: 50 },
            { distance: 200, points: 0, isBad: true },
        ]
    }) {
        this.gameContainer = gameContainer;
        this.map = map;
        this.level = level;
        this.userSettings = userSettings;
        this.gameSettings = gameSettings;

        this.msToKey = 700; // TODO: add ms to key to spawn keys early
        this.lanes = [];

        this.points = 0;
        this.multiplier = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.misses = 0;
        this.accuracy = 100.00;
        this.givenPoints = {};
    }

    async start() {
        // Game loop
        this.gameLoop((deltaTime, loop, fps) => {
            this.lanes.forEach((lane, laneIndex) => {
                lane.notes.forEach(note => {
                    note.top += 1 * deltaTime * this.gameSettings.globalSpeed * ((this.userSettings.scrollSpeed || this.level.scrollSpeed) / 10);
                    note.noteElement.style.top = `${note.top}px`;
                    if (note.noteElement.getBoundingClientRect().y >= screen.availHeight) {
                        if (!lane.notesElement.contains(note.noteElement)) return;
                        this.removeClosestNote(laneIndex);
                    }
                });
            });

            loop();
        });

        // THIS IS JUST TEMP SHIT FRRRRRR IMA MAKE THIS BETTER (PROBABLY NOT)
        if (this.map.backgroundData) {
            const backgroundURL = URL.createObjectURL(this.map.backgroundData);
            this.gameContainer.style.backgroundImage = `url("${backgroundURL}")`;
        }
        const audioURL = URL.createObjectURL(this.map.audioData);
        const audio = new Audio(audioURL);
        audio.onloadeddata = () => URL.revokeObjectURL(audioURL);
        audio.volume = 0.25; // kill oyurself
        audio.playbackRate = this.gameSettings.globalSpeed;
        await audio.play();

        setTimeout(() => {
            let lastBeat = 0;
            const getNextNote = index => {
                const nextNote = this.level.data[index];
                if (!nextNote) return;
                const lane = nextNote[0];
                const sliderHeight = nextNote[1];
                const beat = nextNote[2];

                setTimeout(() => {
                    lastBeat = beat;
                    this.spawnNote(lane, sliderHeight);
                }, (((beat - lastBeat) / this.map.bpm) * 60 * 1000) - this.msToKey);

                getNextNote(index + 1);
            }
            getNextNote(0);
        }, this.map.offset);
    }

    // ----

    msToBeat(ms, bpm = this.map.bpm) {
        return ms / (60 * 1000 / bpm);
    }

    beatToMs(beat, bpm = this.map.bpm) {
        return (beat / bpm) * 60 * 1000;
    }

    spawnNote(laneNum, sliderHeight = 0) {
        const laneIndex = laneNum - 1;
        let top = 0;
        const noteElement = document.createElement("div");
        noteElement.classList.add("note");
        noteElement.style.top = `${top}px`;
        this.lanes[laneIndex].notes.push({ top, noteElement, slider: sliderHeight ? true : false });
        this.lanes[laneIndex].notesElement.appendChild(noteElement);
        // TODO: slider height is in beats, gota calcualte somehow
        noteElement.style.height = sliderHeight ? `calc(${noteElement.offsetHeight}px * (1 + ${sliderHeight}))` : "auto";
    }

    removeClosestNote(laneIndex) {
        if (!this.lanes[laneIndex].notes.length) return;
        this.lanes[laneIndex].notes[0].noteElement.remove();
        this.lanes[laneIndex].notes.splice(0, 1);
    }

    onKeyPress(laneIndex) {
        this.lanes[laneIndex].keyElement.classList.toggle("pressed");

        if (this.lanes[laneIndex].notes[0]) this.hitNote(laneIndex);
    }

    onKeyRelease(laneIndex) {
        this.lanes[laneIndex].keyElement.classList.toggle("pressed");
    }

    stop() {

    }

    hitNote(laneIndex) {
        const closestNote = this.lanes[laneIndex].notes[0].noteElement;
        const closestNoteY = closestNote.offsetTop;
        const keyY = this.lanes[laneIndex].keyElement.offsetTop + this.lanes[laneIndex].keyElement.offsetHeight;

        const distance = Math.max(closestNoteY - keyY, keyY - closestNoteY);

        if (distance > this.gameSettings.points[this.gameSettings.points.length - 1].distance) return;

        // TODO: add points
        this.removeClosestNote(laneIndex);
    }

    init() {
        // Create game
        this.gameContainer.innerHTML = "";
        this.gameElement = document.createElement("div");
        this.gameElement.classList.add("game");
        this.gameContainer.appendChild(this.gameElement);

        // Create lanes
        const lanesElement = document.createElement("div");
        lanesElement.classList.add("lanes");
        this.gameElement.appendChild(lanesElement);

        for (let i = 0; i < this.level.keys; i++) {
            const laneElement = document.createElement("div");
            laneElement.classList.add("lane");
            lanesElement.appendChild(laneElement);

            const notesElement = document.createElement("div");
            notesElement.classList.add("notes");
            laneElement.appendChild(notesElement);

            const keyElement = document.createElement("div");
            keyElement.classList.add("key");
            laneElement.appendChild(keyElement);

            this.lanes.push({ laneElement, notesElement, keyElement, keyPressed: false, notes: [] });
        }

        // Create events
        // Key pressed
        document.body.onkeydown = ev => {
            const index = this.userSettings.keybinds[`${this.level.keys}-keys`]?.findIndex(i => i == ev.key);
            if (index >= 0 && !this.lanes[index].keyPressed) {
                this.lanes[index].keyPressed = true;
                this.onKeyPress(index);
            }
        }
        // Key released
        document.body.onkeyup = ev => {
            const index = this.userSettings.keybinds[`${this.level.keys}-keys`]?.findIndex(i => i == ev.key);
            if (index >= 0 && this.lanes[index].keyPressed) {
                this.lanes[index].keyPressed = false;
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