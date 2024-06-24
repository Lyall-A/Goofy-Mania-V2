class Game {
    constructor(gameContainer, map, level, userSettings, gameSettings = {
        globalSpeed: 1,
        logFps: false,
        logDeltaTime: false,
        dontCheckIfNotesOffScreen: true,
        points: [
            { distance: 25, points: 350 },
            { distance: 50, points: 300 },
            { distance: 100, points: 200 },
            { distance: 150, points: 100 },
            { distance: 175, points: 50 },
            { distance: 200, points: 0, isBadHit: true },
        ]
    }) {
        this.gameContainer = gameContainer;
        this.map = map;
        this.level = level;
        this.userSettings = userSettings;
        this.gameSettings = gameSettings;

        this.notesReady = null;
        this.startTime = null;
        this.running = false;
        this.msToKey = 500; // TODO: add ms to key to spawn keys early
        this.notesToSpawn = this.level.data;
        this.runningTime = 0;
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
        // Pause game when document is hidden (TODO)

        // Game loop
        this.gameLoop(async (deltaTime, loop, fps) => {
            this.runningTime += deltaTime;

            if (!this.running) {
                // First run
                document.onvisibilitychange = () => {
                    if (document.hidden) this.stop();
                }

                setTimeout(() => this.notesReady = true, this.map.offset);
                // TODO: make neater
                if (this.map.backgroundData) {
                    const backgroundURL = URL.createObjectURL(this.map.backgroundData);
                    this.backgroundElement.style.backgroundImage = `url("${backgroundURL}")`;
                }
                const audioURL = URL.createObjectURL(this.map.audioData);
                this.audio = new Audio(audioURL);
                this.audio.onloadeddata = () => URL.revokeObjectURL(audioURL);
                this.audio.onended = () => this.stop();
                this.audio.volume = 0.25; // kill oyurself
                // this.audio.playbackRate = this.gameSettings.globalSpeed;
                await this.audio.play().catch(err => console.log("For some reason the Audio API errors sometimes but does actually work, I write good code.", err));
                this.startTime = Date.now();
                this.running = true;
            }

            // Spawn notes
            if (this.notesReady) {
                for (const i in { ...this.notesToSpawn }) { // the fuck?
                    const noteToSpawn = this.notesToSpawn[0];
                    if (this.beatToMs(noteToSpawn[2]) + this.map.offset >= this.runningTime + this.msToKey) break; // TODO: is this right?
                    this.spawnNote(noteToSpawn[0], noteToSpawn[1]);
                    this.notesToSpawn.shift();
                }
            }

            // Move notes down/despawn when off screen
            this.lanes.forEach((lane, laneIndex) => {
                lane.notes.forEach(note => {
                    note.top += 1 * deltaTime * this.gameSettings.globalSpeed * ((this.userSettings.scrollSpeed || this.level.scrollSpeed) / 10);
                    note.noteElement.style.top = `${note.top}px`;
                    if (!this.gameSettings.dontCheckIfNotesOffScreen && note.noteElement.getBoundingClientRect().y >= document.body.offsetHeight) {
                        if (!lane.notesElement.contains(note.noteElement)) return;
                        this.removeNote(laneIndex, note);
                    }
                });
            });

            if (this.gameSettings.logFps) console.log(`FPS: ${fps}`);
            if (this.gameSettings.logDeltaTime) console.log(`Delta Time: ${deltaTime}`);

            loop();
        });
    }

    msToBeat(ms, bpm = this.map.bpm) {
        return parseFloat(ms.toFixed(10)) / (60 * 1000 / bpm);
    }

    beatToMs(beat, bpm = this.map.bpm) {
        return parseFloat(((beat / bpm) * 60 * 1000).toFixed(10));
    }

    spawnNote(laneNum, sliderHeight = 0) {
        const laneIndex = laneNum - 1;
        const lane = this.lanes[laneIndex];
        let top = 0;
        const noteElement = document.createElement("div");
        noteElement.classList.add("note");
        noteElement.style.top = `${top}px`;
        lane.notesSpawned++;
        lane.notes.push({ top, noteElement, id: lane.notesSpawned, slider: sliderHeight ? true : false });
        lane.notesElement.appendChild(noteElement);
        // TODO: slider height is in beats, gota calcualte somehow
        noteElement.style.height = sliderHeight ? `calc(${noteElement.offsetHeight}px * (1 + ${sliderHeight}))` : "auto";
    }

    removeNote(laneIndex, note) {
        const lane = this.lanes[laneIndex];
        lane.notes.splice(lane.notes.findIndex(i => i.id == note.id), 1);
        note.noteElement.remove();
    }

    onKeyPress(laneIndex) {
        this.lanes[laneIndex].keyElement.classList.toggle("pressed");

        if (this.lanes[laneIndex].notes[0]) this.hitNote(laneIndex);
    }

    onKeyRelease(laneIndex) {
        this.lanes[laneIndex].keyElement.classList.toggle("pressed");
    }

    stop() {
        this.running = false;
        this.audio.pause();
        this.audio.remove();
        this.gameContainer.style = "";
        this.gameContainer.innerHTML = "";
        this.onstop();
    }

    hitNote(laneIndex) {
        // const closestNote = this.lanes[laneIndex].notes[0].noteElement;
        const lane = this.lanes[laneIndex];
        const keyY = lane.keyElement.offsetTop + lane.keyElement.offsetHeight;
        const closestNote = lane.notes.reduce((prev, curr) => {
            const currDistance = Math.max(curr.top - keyY, keyY - curr.top);
            const prevDistance = Math.max(prev.top - keyY, keyY - prev.top);
            return currDistance < prevDistance ? curr : prev;
        });

        const distance = Math.max(closestNote.top - keyY, keyY - closestNote.top);

        if (distance > this.gameSettings.points[this.gameSettings.points.length - 1].distance) return;

        // TODO: add points
        this.removeNote(laneIndex, closestNote);
    }

    init() {
        // Create game
        this.gameElement = document.createElement("div");
        this.gameElement.classList.add("game");

        // Create background
        this.backgroundElement = document.createElement("background");
        this.backgroundElement.classList.add("background");

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

            this.lanes.push({ laneElement, notesElement, notesSpawned: 0, keyElement, keyPressed: false, notes: [] });
        }

        // Append to game container
        this.gameContainer.appendChild(this.gameElement);
        this.gameContainer.appendChild(this.backgroundElement);

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

    // Game events
    onstop() { }
}