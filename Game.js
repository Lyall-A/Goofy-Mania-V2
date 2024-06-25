class Game {
    constructor(gameContainer, map, level, user, gameSettings = {
        globalSpeed: 1,
        logFps: false,
        logDeltaTime: false,
        dontCheckIfNotesOffScreen: false,
        maxMultiplier: 4,
        multiplierChange: 1000, // Double the multiplier every 1000 points
        points: [
            { distance: 25, points: 300 },
            { distance: 50, points: 200 },
            { distance: 125, points: 100 },
            { distance: 150, points: 50 },
            { distance: 250, points: 0, isBadHit: true },
        ]
    }) {
        this.gameContainer = gameContainer;
        this.map = map;
        this.level = level;
        this.user = user;
        this.gameSettings = gameSettings;

        this.notesReady = null;
        this.startTime = null;
        this.running = null;
        this.msToKey = 500; // TODO: add ms to key to spawn keys early
        this.notesToSpawn = this.level.data;
        this.runningTime = 0;
        this.lanes = [];
        this.urls = { },
        this.elements = { };
        this.notesRemoved = 0;

        this.health = 100;
        this.score = 0;
        this.scoreNoMultiplier = 0;
        this.multiplier = 1;
        this.combo = 0;
        this.maxCombo = 0;
        this.badHits = 0;
        this.misses = 0;
        this.accuracy = 100.00;
        this.givenPoints = {};
    }

    async start() {
        this.createUrl("hit", this.user.skin.sfx["hit"].data);
        this.createUrl("combo-break", this.user.skin.sfx["combo-break"].data);
        this.createUrl("music", this.map.audio.data);
        this.createUrl("background", this.map.background.data);
        
        // Game loop
        this.gameLoop(async (deltaTime, loop, fps) => {
            this.runningTime += deltaTime;

            if (this.running == null) {
                // First run
                document.onvisibilitychange = () => {
                    if (document.hidden) this.pause();
                }

                setTimeout(() => this.notesReady = true, this.map.offset);
                // TODO: make neater
                if (this.urls["background"]) this.elements.background.style.backgroundImage = `url("${this.urls["background"]}")`;
                this.music = await this.playAudio(this.urls["music"], { volume: this.user.settings.musicVolume });
                this.music.onended = () => this.stop();

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
                    note.top += 1 * deltaTime * this.gameSettings.globalSpeed * ((this.user.settings.scrollSpeed || this.level.scrollSpeed) / 10);
                    note.element.style.top = `${note.top}px`;
                    if (!this.gameSettings.dontCheckIfNotesOffScreen && note.element.getBoundingClientRect().top >= document.body.offsetHeight) {
                        if (!lane.elements.notes.contains(note.element)) return;
                        // Missed note
                        if (this.combo) this.playSfx("combo-break");
                        this.misses++;
                        this.combo = 0;
                        this.removeNote(laneIndex, note);
                    }
                });
            });

            if (this.gameSettings.logFps) console.log(`FPS: ${fps}`);
            if (this.gameSettings.logDeltaTime) console.log(`Delta Time: ${deltaTime}`);

            if (this.running) loop();
        });
    }

    createUrl(key, data) {
        try {
            this.urls[key] = URL.createObjectURL(data);;
            return this.urls[key];
        } catch (err) {
            return false;
        }
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
        lane.notes.push({ top, element: noteElement, id: lane.notesSpawned, slider: sliderHeight ? true : false });
        lane.elements.notes.appendChild(noteElement);
        // if (sliderHeight) noteElement.innerHTML = "<h1 style=\"position: absolute;\">no slider implementation :P</h1>"
        // TODO: slider height is in beats, gota calcualte somehow
        // noteElement.style.height = sliderHeight ? `calc(${noteElement.offsetHeight}px * (1 + ${sliderHeight}))` : "auto";
    }

    removeNote(laneIndex, note) {
        const lane = this.lanes[laneIndex];
        lane.notes.splice(lane.notes.findIndex(i => i.id == note.id), 1);
        this.notesRemoved++;
        this.accuracy = this.calculateAccuracy();
        note.element.remove();
    }

    playSfx(sfx) {
        if (!this.urls[sfx]) return;
        this.playAudio(this.urls[sfx], { volume: this.user.settings.sfxVolume });
    }

    async playAudio(url, options = { }) {
        if (!url) return;
        const audio = new Audio(url);
        // TODO: add master volume here
        if (options.volume) audio.volume = (this.user.settings.masterVolume / 100) * (options.volume != undefined ? options.volume / 100 : 1);
        if (options.playbackRate) audio.playbackRate = options.playbackRate;
        await audio.play();
        return audio;
    }

    onKeyPress(laneIndex) {
        this.lanes[laneIndex].elements.key.classList.toggle("pressed");

        this.playSfx("hit");
        if (this.lanes[laneIndex].notes[0]) this.hitNote(laneIndex);
    }

    onKeyRelease(laneIndex) {
        this.lanes[laneIndex].elements.key.classList.toggle("pressed");
    }

    pause() {
        this.stop(); // TODO
    }

    stop() {
        // Revoke URL's
        Object.entries(this.urls).forEach(([key, value]) => {
            URL.revokeObjectURL(value);
        });

        // Remove events
        removeEventListener("keyup", this.onKeyUp);
        removeEventListener("keydown", this.onKeyDown);

        // Stop game loop
        this.running = false;

        // TODO: better way?
        this.music.pause();
        this.music.remove();

        // Remove all elements
        Object.entries(this.elements).forEach(([key, value]) => {
            value.remove();
        });

        // Call event
        this.onstop();
    }

    calculateAccuracy() {
        return (this.scoreNoMultiplier / (Math.max(...this.gameSettings.points.map(i => i.points)) * this.notesRemoved)) * 100;
    }

    hitNote(laneIndex) {
        // const closestNote = this.lanes[laneIndex].notes[0].noteElement;
        const lane = this.lanes[laneIndex];
        const keyY = lane.elements.key.offsetTop + lane.elements.key.offsetHeight;
        const closestNote = lane.notes.reduce((prev, curr) => {
            const currDistance = Math.max(curr.top - keyY, keyY - curr.top);
            const prevDistance = Math.max(prev.top - keyY, keyY - prev.top);
            return currDistance < prevDistance ? curr : prev;
        });

        const distance = Math.max(closestNote.top - keyY, keyY - closestNote.top);

        if (distance > Math.max(...this.gameSettings.points.map(i => i.distance))) return; // Ignore if closest note is still too far
        const pointsToAdd = this.gameSettings.points.reduce((prev, curr) => {
            return Math.abs(curr.distance - distance) < Math.abs(prev.distance - distance) ? curr : prev;
        });

        if (pointsToAdd.isBadHit) {
            this.combo = 0;
            this.badHits++;
        } else {
            this.combo++;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        }

        this.scoreNoMultiplier += pointsToAdd.points;
        this.score += pointsToAdd.points * this.multiplier;
        this.removeNote(laneIndex, closestNote);
    }

    init() {
        // Create game
        this.elements.game = document.createElement("div");
        this.elements.game.classList.add("game");

        // Create background
        this.elements.background = document.createElement("div");
        this.elements.background.classList.add("background");

        // Create lanes
        this.elements.lanes = document.createElement("div");
        this.elements.lanes.classList.add("lanes");
        this.elements.game.appendChild(this.elements.lanes);

        for (let i = 0; i < this.level.keys; i++) {
            const laneElement = document.createElement("div");
            laneElement.classList.add("lane");
            
            const notesElement = document.createElement("div");
            notesElement.classList.add("notes");
            laneElement.appendChild(notesElement);
            
            const keyElement = document.createElement("div");
            keyElement.classList.add("key");
            laneElement.appendChild(keyElement);
            
            this.elements.lanes.appendChild(laneElement);

            this.lanes.push({ elements: { lane: laneElement, notes: notesElement, key: keyElement }, notesSpawned: 0, keyPressed: false, notes: [] });
        }

        // Append to game container
        this.gameContainer.appendChild(this.elements.game);
        this.gameContainer.appendChild(this.elements.background);

        // Create events
        addEventListener("keydown", this.onKeyDown);
        addEventListener("keyup", this.onKeyUp);
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

    // Events
    onKeyDown = (ev) => {
        const index = this.user.settings.keybinds[`${this.level.keys}-keys`]?.findIndex(i => i == ev.key);
        if (index >= 0 && !this.lanes[index].keyPressed) {
            this.lanes[index].keyPressed = true;
            this.onKeyPress(index);
        }
    }

    onKeyUp = (ev) => {
        const index = this.user.settings.keybinds[`${this.level.keys}-keys`]?.findIndex(i => i == ev.key);
        if (index >= 0 && this.lanes[index].keyPressed) {
            this.lanes[index].keyPressed = false;
            this.onKeyRelease(index);
        }
    }

    // Game events
    onstop() { }
}