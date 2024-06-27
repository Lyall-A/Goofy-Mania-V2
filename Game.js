class Game {
    constructor(game, map, level, user, gameSettings) {
        this.game = game;
        this.map = map;
        this.level = level;
        this.user = user;
        this.gameSettings = gameSettings;

        this.notesReady = null;
        this.startTime = null;
        this.running = null;
        this.notesToSpawn = this.level.data;
        this.runningTime = 0;
        this.lanes = [];
        this.urls = { },
        this.elements = { };
        this.notesRemoved = 0; // Total amount of notes removed/despawned
        this.audiosPlaying = 0; // Current amount of audios playing
        this.noteMoveAmount = (this.user.settings.scrollSpeed || this.level.scrollSpeed) / 10; // How much the note should move down each frame
        this.pointDistanceMultiplier = this.noteMoveAmount / 2; // This is to make points easier/harder to get depending on noteMoveAmount (scroll speed)
        
        this.health = 100;
        this.score = 0;
        this.multiplier = 1;
        this.combo = 0;
        this.maxCombo = 0;
        this.badHits = 0;
        this.misses = 0;
        this.accuracy = 100.00;
        this.givenPoints = {};
        this.scoreNoMultiplier = 0;

        if (!this.gameSettings) this.gameSettings = {
            // TODO: simplify comments
            logFps: false, // Log FPS
            logDeltaTime: false, // Log delta time
            dontCheckIfNotesOffScreen: false, // Don't check if notes off screen
            maxMultiplier: 4, // Max multiplier
            maxHealth: 100, // Max health
            defaultHealth: 50, // Default health
            multiplierChange: 1000, // Double the multiplier every x points
            maxAudio: 10, // Max amount of audios that can play at once
            points: [
                { distance: 25 * this.pointDistanceMultiplier, points: 300 },
                { distance: 75 * this.pointDistanceMultiplier, points: 200 },
                { distance: 125 * this.pointDistanceMultiplier, points: 100 },
                { distance: 150 * this.pointDistanceMultiplier, points: 50 },
                { distance: 250 * this.pointDistanceMultiplier, points: 0, isBadHit: true },
            ]
        }
    }

    async start() {
        setInterval(() => {
            console.clear();
            console.log("Health:", this.health);
            console.log("Score:", this.score);
            // console.log("Multiplier:", this.multiplier);
            console.log("Combo:", this.combo);
            console.log("Max Combo:", this.maxCombo);
            console.log("Bad hits:", this.badHits);
            console.log("Misses:", this.misses);
            console.log("Accuracy:", this.accuracy);
        }, 1000);
        
        // Game loop
        this.gameLoop(async (deltaTime, loop, fps) => {
            this.runningTime += deltaTime;

            if (this.running == null) {
                // First run
                document.onvisibilitychange = () => {
                    if (document.hidden) this.pause();
                }

                setTimeout(() => this.notesReady = true, this.map.offset);
                setTimeout(async () => {
                    this.music = await this.playAudio(this.urls["music"], { volume: this.user.settings.musicVolume });
                    this.music.onended = () => this.stop();
                    this.music.onplaying = () => console.log("WHY IS THIS HAPPENING!!!!!!!!!!!");
                }, this.getMsToKey());

                this.startTime = Date.now();
                this.running = true;
            }

            // Spawn notes
            if (this.notesReady) {
                for (const i in { ...this.notesToSpawn }) { // the fuck?
                    const noteToSpawn = this.notesToSpawn[0];
                    if (this.beatToMs(noteToSpawn[2]) + this.map.offset >= this.runningTime) break; // TODO: is this right?
                    this.spawnNote(noteToSpawn[0], noteToSpawn[1]);
                    this.notesToSpawn.shift();

                    // broken hax
                    setTimeout(() => {
                        this.onKeyPress(noteToSpawn[0] - 1);
                        setTimeout(() => this.onKeyRelease(noteToSpawn[0] - 1), 50);
                    }, this.getMsToKey() - 20);
                }
            }

            // Move notes down/despawn when off screen
            this.lanes.forEach((lane, laneIndex) => {
                lane.notes.forEach(note => {
                    note.top += this.noteMoveAmount * deltaTime;
                    note.element.style.top = `${note.top}px`;
                    if (!this.gameSettings.dontCheckIfNotesOffScreen && note.top - note.element.offsetHeight >= document.body.offsetHeight) {
                        if (!lane.elements.notes.contains(note.element)) return;
                        // Missed note
                        if (this.combo) this.playSfx("combo-break");
                        this.misses++;
                        this.updateCombo(0);
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

    getMsToKey(laneNum = 1) {
        const laneIndex = laneNum - 1;
        const lane = this.lanes[laneIndex];
        return (lane.elements.key.offsetTop + lane.elements.key.offsetHeight) / this.noteMoveAmount;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(() => resolve(), ms));
    }

    spawnNote(laneNum, sliderHeight = 0) {
        const laneIndex = laneNum - 1;
        const lane = this.lanes[laneIndex];
        let top = 0;
        const noteElement = document.createElement("div");
        noteElement.classList.add("note");
        noteElement.style.top = `${top}px`;
        lane.elements.notes.appendChild(noteElement);
        lane.notesSpawned++;
        lane.notes.push({ top, height: noteElement.offsetHeight, element: noteElement, id: lane.notesSpawned, slider: sliderHeight ? true : false });
        if (sliderHeight) noteElement.innerHTML = "<h1 style=\"position: absolute;\">no slider implementation :P</h1>" // TODO
        noteElement.style.height = sliderHeight ? `${noteElement.offsetHeight + (this.beatToMs(sliderHeight) * this.noteMoveAmount)}px` : "auto";
    }

    removeNote(laneIndex, note) {
        const lane = this.lanes[laneIndex];
        lane.notes.splice(lane.notes.findIndex(i => i.id == note.id), 1);
        this.notesRemoved++;
        this.updateAccuracy();
        note.element.remove();
    }

    updateAccuracy() {
        this.accuracy = this.calculateAccuracy();
        this.elements.accuracy.innerHTML = `${this.accuracy.toFixed(2)}%`;
    }

    updateCombo(newCombo) {
        this.combo = newCombo != undefined ? newCombo : this.combo + 1;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        this.elements.combo.innerHTML = `${this.combo}`;
    }

    playSfx(sfx) {
        if (!this.urls[sfx]) return;
        this.playAudio(this.urls[sfx], { volume: this.user.settings.sfxVolume });
    }

    async playAudio(url, options = { }) {
        if (!url || this.audiosPlaying >= this.gameSettings.maxAudio) return;
        const audio = new Audio(url);
        this.audiosPlaying++;
        audio.volume = (this.user.settings.masterVolume / 100) * (options.volume != undefined ? options.volume / 100 : 1);
        if (options.playbackRate) audio.playbackRate = options.playbackRate;
        audio.onpause = e => audio.ended ? null : audio.play();
        audio.onended = () => this.audiosPlaying--;
        await audio.play();
        return audio;
    }

    onKeyPress(laneIndex) {
        this.lanes[laneIndex].elements.key.classList.add("pressed")

        this.playSfx("hit");
        if (this.lanes[laneIndex].notes[0]) this.hitNote(laneIndex);
    }

    onKeyRelease(laneIndex) {
        this.lanes[laneIndex].elements.key.classList.remove("pressed");
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
        const keyTop = lane.elements.key.offsetTop;
        const closestNote = lane.notes.reduce((prev, curr) => {
            const currTop = curr.top - curr.height;
            const prevTop = prev.top - prev.height;
            const currDistance = Math.max(currTop - keyTop, keyTop - currTop);
            const prevDistance = Math.max(prevTop - keyTop, keyTop - prevTop);
            return currDistance < prevDistance ? curr : prev;
        });

        const closestNoteTop = closestNote.top - closestNote.height;
        const distance = Math.max(closestNoteTop - keyTop, keyTop - closestNoteTop);

        if (distance > Math.max(...this.gameSettings.points.map(i => i.distance))) return; // Ignore if closest note is still too far
        const pointsToAdd = this.gameSettings.points.reduce((prev, curr) => {
            return Math.abs(curr.distance - distance) < Math.abs(prev.distance - distance) ? curr : prev;
        });

        // TODO: SLIDERSSSS IT NEEDS TO BE HELD DOWN HOW TF AM I GONNA DOT AHT

        if (pointsToAdd.isBadHit) {
            this.updateCombo(0);
            this.badHits++;
        } else {
            this.updateCombo();
        }

        this.scoreNoMultiplier += pointsToAdd.points;
        this.score += pointsToAdd.points * this.multiplier;
        this.givenPoints[pointsToAdd.points] = (this.givenPoints[pointsToAdd.points] || 0) + 1;
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

        // TODO: create the shit like accuracy display etc
        // Create accuracy
        this.elements.accuracy = document.createElement("div");
        this.elements.accuracy.classList.add("accuracy");
        this.elements.accuracy.innerHTML = `${this.accuracy.toFixed(2)}%`;

        // Create combo
        this.elements.combo = document.createElement("div");
        this.elements.combo.classList.add("combo");
        this.elements.combo.innerHTML = `${this.combo}`;
        
        // Create score
        this.elements.score = document.createElement("div");
        this.elements.score.classList.add("score");
        
        // Create health
        this.elements.health = document.createElement("div");
        this.elements.health.classList.add("health");

        // Create URL's (TODO)
        this.createUrl("hit", this.user.skin.sfx["hit"].data);
        this.createUrl("combo-break", this.user.skin.sfx["combo-break"].data);
        this.createUrl("music", this.map.audio.data);
        this.createUrl("background", this.map.background.data);

        // Set background
        if (this.urls["background"]) this.elements.background.style.backgroundImage = `url("${this.urls["background"]}")`;
        
        // Append to game
        this.game.appendChild(this.elements.lanes);
        this.game.appendChild(this.elements.background);
        this.game.appendChild(this.elements.accuracy);
        this.game.appendChild(this.elements.combo);
        this.game.appendChild(this.elements.score);
        this.game.appendChild(this.elements.health);

        // Create events
        addEventListener("keydown", this.onKeyDown);
        addEventListener("keyup", this.onKeyUp);
    }

    gameLoop(callback) {
        let prevTime = Date.now();
        let fps = 0;

        const loop = () => {
            const time = Date.now();
            const deltaTime = time - prevTime;
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