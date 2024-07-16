
class Game {
    constructor(game, map, level, user, gameSettings) {
        this.game = game;
        this.map = map;
        this.level = level;
        this.user = user;
        this.gameSettings = gameSettings;
    }

    init() {
        if (this.hasInit) throw new Error("Already initialized!");

        this.deltaTimeMultiplier = 1; // Used to fuck up the game.

        // Set variables
        if (!this.gameSettings) this.gameSettings = {
            // TODO: simplify comments
            captureFps: true, // Capture FPS
            logFps: false, // Log FPS
            maxMultiplier: 4, // Max multiplier
            maxHealth: 100, // Max health
            defaultHealth: 50, // Default health
            minSpeed: 0.5, // Modifier: Speed
            maxSpeed: 2, // Modifier: Speed
            speedRound: 0.05, // Round speed to nearest 0.05
            maxScrollSpeed: 40, // Maximum scroll speed
            minScrollSpeed: 5, // Minimum scroll speed
            scrollSpeedRound: 1, // Round scroll speed to nearest 1
            multiplierChange: 1000, // Double the multiplier every x points
            maxAudio: 10, // Max amount of audios that can play at once
            defaultScrollSpeed: 20,
            sliderPoints: true, // Should points be added at end of slider
            sliderComboIncrementInterval: 0, // TODO: its fucked, i kinda want this but idk its jank af
            noteDirection: 1, // 1: DOWN, 2: UP
            fpsUpdateInterval: 500, // How often FPS should be updated
            minStartDelay: 2500,
            minWidth: 720,
            minHeight: 720,
        };

        this.scrollSpeed = Math.max(this.gameSettings.minScrollSpeed, Math.min(this.gameSettings.maxScrollSpeed, Math.round((this.user.settings.scrollSpeed || (this.user.settings.forceScrollSpeed ? this.level.scrollSpeed : 0) || this.gameSettings.defaultScrollSpeed) / this.gameSettings.scrollSpeedRound) * this.gameSettings.scrollSpeedRound));
        this.speed = this.user.modifiers.speed ? Math.max(this.gameSettings.minSpeed, Math.min(this.gameSettings.maxSpeed, Math.round(this.user.modifiers.speed / this.gameSettings.speedRound) * this.gameSettings.speedRound)) : 1;

        this.notesReady = null;
        this.startTime = null;
        this.running = null;
        this.notesToSpawn = [...this.level.data];
        this.startDelay = Math.max(0, this.gameSettings.minStartDelay - (this.beatToMs(this.notesToSpawn[0][2] / this.speed) + this.map.offset));
        this.offset = this.map.offset + this.startDelay;
        this.runningTime = 0;
        this.lanes = [];
        this.intervals = [];
        this.timeouts = [];
        this.urls = {};
        this.elements = {};
        this.hitScores = this.user.skin.hitScores[1];
        this.defaultHitScore = this.user.skin.hitScores[0];
        this.notesHit = 0; // Total amount of notes hit
        this.slidersFinished = 0;
        this.audiosPlaying = 0; // Current amount of audios playing
        this.noteMoveAmount = (this.scrollSpeed / 10) * this.game.offsetHeight / 1000; // How much the note should move down each frame
        // this.noteMoveAmount = (this.scrollSpeed / 10); // How much the note should move down each frame
        this.pointDistanceMultiplier = this.noteMoveAmount / 1.5; // This is to make points easier/harder depending on noteMoveAmount (scroll speed) // TODO (maybe???): change depending on note size?
        this.fpsHistory = [];

        this.gameSettings.points = [
            { distance: 50 * this.pointDistanceMultiplier, points: 300 }, // Good 👍👍
            { distance: 100 * this.pointDistanceMultiplier, points: 200 }, // Alright
            { distance: 150 * this.pointDistanceMultiplier, points: 100 }, // Meh
            { distance: 175 * this.pointDistanceMultiplier, points: 50 }, // SHIT
            { distance: 250 * this.pointDistanceMultiplier, points: 0, isBadHit: true }, // this one is genuinely hard to get
        ];

        this.pointRange = Math.max(...this.gameSettings.points.map(i => i.distance));

        this.health = this.gameSettings.defaultHealth;
        this.score = 0;
        this.multiplier = 1;
        this.combo = 0;
        this.maxCombo = 0;
        this.badHits = 0;
        this.misses = 0;
        this.accuracy = 100.00;
        this.givenPoints = {};
        this.scoreNoMultiplier = 0;

        // Set CSS variables
        this.game.style.setProperty("--game-width", `${Math.max(this.gameSettings.minWidth, this.game.offsetWidth)}px`);
        this.game.style.setProperty("--game-height", `${Math.max(this.gameSettings.minHeight, this.game.offsetHeight)}px`);

        // Change CSS
        this.game.style.width = "var(--game-width)";
        this.game.style.height = "var(--game-height)";

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

            this.lanes.push({ elements: { lane: laneElement, notes: notesElement, key: keyElement }, notesSpawned: 0, keyPressed: false, notes: new Set() });
        }

        // TODO: create the shit like accuracy display etc
        // Create accuracy
        this.elements.accuracy = document.createElement("div");
        this.elements.accuracy.classList.add("accuracy");
        this.elements.accuracy.innerHTML = `${this.accuracy.toFixed(2)}%`;

        // Create hit score
        this.elements.hitScore = document.createElement("div");
        this.elements.hitScore.classList.add("hit-score");

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
        // SFX
        this.createUrl("hit", this.user.skin.sfx["hit"]?.data);
        this.createUrl("combo-break", this.user.skin.sfx["combo-break"]?.data);
        this.createUrl("bad-hit", this.user.skin.sfx["bad-hit"]?.data);
        this.createUrl("music", this.map.audio.data);
        // Object.entries(this.user.skin.sfx).filter(i => i[1].data).forEach(([key, value]) => this.createUrl(key, value.data));
        // Assets
        this.createUrl("background", this.map.background.data);
        if (this.defaultHitScore.data) this.createUrl("default-hit-score", this.defaultHitScore.data);
        Object.entries(this.hitScores).filter(i => i[1].data).forEach(([key, value]) => this.createUrl(`${key}-hit-score`, value.data));

        // Set background
        if (this.urls["background"]) this.elements.background.style.backgroundImage = `url("${this.urls["background"]}")`;

        // Append to game
        this.game.appendChild(this.elements.lanes);
        this.game.appendChild(this.elements.background);
        this.game.appendChild(this.elements.accuracy);
        this.game.appendChild(this.elements.hitScore);
        this.game.appendChild(this.elements.combo);
        this.game.appendChild(this.elements.score);
        this.game.appendChild(this.elements.health);

        // Create events
        if (!this.user.modifiers.auto) addEventListener("keydown", this.onKeyDown);
        if (!this.user.modifiers.auto) addEventListener("keyup", this.onKeyUp);
        document.addEventListener("visibilitychange", this.onVisibilityChange);

        this.hasInit = true;
    }

    async start() {
        if (!this.hasInit) throw new Error("Not initialized!");
        if (this.running) throw new Error("Already started!");

        // Game loop
        this.gameLoop((deltaTime, loop, fps, time) => {
            deltaTime = deltaTime * this.deltaTimeMultiplier;
            this.runningTime += deltaTime;

            // TODO: better to run before or after?!?!?
            // Run timeouts
            for (const i in this.timeouts) {
                const timeout = this.timeouts[i];
                if (!timeout) continue;
                const { callback, ms, time } = timeout;
                if (this.runningTime >= time + ms) {
                    callback();
                    this.timeouts[i] = null;
                }
            }

            // Run intervals
            for (const i in this.intervals) {
                const interval = this.intervals[i];
                if (!interval) continue;
                const { callback, ms, time } = interval;
                if (this.runningTime >= time + ms) {
                    callback();
                    this.intervals[i].time = time + ms;
                }
            }

            // START GAME LOGIC
            if (this.running == null) {
                // First run
                this.gameTimeout(() => {
                    this.gameTimeout(() => this.notesReady = true, this.map.offset); // Start notes
                    this.gameTimeout(() => {
                        // Start audio
                        this.music = this.playAudio(this.urls["music"], {
                            volume: this.user.settings.musicVolume,
                            playbackRate: this.speed, // Modifier: Speed
                            changePitch: this.user.modifiers.pitch // Modifier: Pitch
                        });
                        this.music.onended = () => this.stop();
                    }, this.getMsToKey() + (this.user.settings.audioOffset || 0));
                }, this.startDelay);

                if (this.gameSettings.captureFps) this.gameInterval(() => {
                    const fps = Math.round((this.fpsHistory.reduce((prev, curr) => prev + curr) / this.fpsHistory.length) || 0)
                    if (this.gameSettings.logFps) console.log("FPS:", fps);
                    this.call("onFpsUpdate", fps);
                    this.fpsHistory = [];
                }, this.gameSettings.fpsUpdateInterval);

                this.startTime = Date.now();
                this.running = true;
            }

            // Spawn notes
            if (this.notesReady) {
                for (const i in { ...this.notesToSpawn }) { // the fuck?
                    const noteToSpawn = this.notesToSpawn[0];
                    if (this.beatToMs(noteToSpawn[2] / this.speed) + this.offset >= this.runningTime) break; // TODO: is this right?
                    const spawnedNote = this.spawnNote(noteToSpawn[0], this.user.modifiers.noSliders ? 0 : noteToSpawn[1]); // Modifier: No Sliders
                    this.notesToSpawn.shift();

                    // Modifier: Auto
                    if (this.user.modifiers.auto) this.gameTimeout(() => {
                        this.onKeyRelease(noteToSpawn[0] - 1);
                        this.onKeyPress(noteToSpawn[0] - 1);
                        this.gameTimeout(() => this.onKeyRelease(noteToSpawn[0] - 1), spawnedNote.isSlider ? (spawnedNote.height - spawnedNote.normalHeight) / this.noteMoveAmount : 20, `auto-key-${noteToSpawn[0]}-release`);
                    }, this.getMsToKey(noteToSpawn[0]));
                }
            }

            // Move notes down/despawn when off screen
            this.lanes.forEach((lane, laneIndex) => {
                lane.notes.forEach(note => {
                    if (this.gameSettings.noteDirection == 1 && this.getActualTop(note) > lane.elements.key.offsetTop) note.passedKey = true; // TODO: more directions?!?!?!?!?!?!
                    if (this.gameSettings.noteDirection == 2 && note.top > lane.elements.key.offsetTop) note.passedKey = true; // TODO: more directions?!?!?!?!?!?!

                    if (note.isSlider) {
                        if (this.gameSettings.noteDirection == 1 && this.getActualTop(note, true) > lane.elements.key.offsetTop) note.endPassedKey = true;
                        if (this.gameSettings.noteDirection == 2 && note.top > lane.elements.key.offsetTop) note.endPassedKey = true;
                    }

                    if (note.isSlider) {
                        // If note is slider
                        if (note.holding) {
                            if (note.height > note.normalHeight) {
                                // Simulate move down
                                note.height = Math.max(note.normalHeight, note.height - (this.noteMoveAmount * deltaTime));
                                note.element.style.height = `${Math.round(note.height)}px`;
                                const date = Date.now();
                                if (date > note.holdStart + this.gameSettings.sliderComboIncrementInterval && (date - note.holdStart) % this.gameSettings.sliderComboIncrementInterval <= deltaTime) this.updateCombo(); // TODO: pretty inaccurate and broken
                            } else
                                if (this.getNoteDistance(lane, note, true) > this.pointRange) {
                                    // Held too long
                                    this.miss();
                                    this.removeNote(lane, note);
                                } else {
                                    // Hide and move down like a regular note when height <= normal height
                                    note.element.style.display = "none";
                                    note.top = note.top + (this.noteMoveAmount * deltaTime); // Increment top/Y
                                    note.element.style.top = `${Math.round(note.top)}px`; // Set top
                                }
                        } else {
                            // Move slider
                            this.getNewNotePos(note, deltaTime);
                            note.element.style.top = `${Math.round(note.top)}px`; // Set top
                            // console.log(note.top)

                            if (note.passedKey && this.getNoteDistance(lane, note) > this.pointRange && !note.finished) {
                                // Missed slider
                                note.finished = true;
                                this.miss();
                            }
                        }

                        if (note.endPassedKey && this.getNoteDistance(lane, note, true) > this.pointRange) {
                            // End of slider passed
                            if (!note.finished) this.miss();
                            this.removeNote(lane, note);
                        }
                    } else {
                        // Move note
                        this.getNewNotePos(note, deltaTime);
                        note.element.style.top = `${Math.round(note.top)}px`; // Set top

                        if (this.getActualTop(note) >= this.game.offsetHeight || (note.passedKey && this.getNoteDistance(lane, note) > this.pointRange)) {
                            // Missed note
                            this.miss();
                            this.removeNote(lane, note);
                        }
                    }
                });
            });

            if (this.health <= 0) {
                // TODO: death.
                // console.log("DEATH")
            }

            this.updateAccuracy();
            // END GAME LOGIC

            if (this.gameSettings.captureFps) this.fpsHistory.push(fps);

            if (this.running) loop(); else this.call("onGameLoopStop");
        });

        this.call("onStart");
    }

    stop() {
        if (this.hasInit) {
            // Revoke URL's
            Object.entries(this.urls).forEach(([key, value]) => {
                URL.revokeObjectURL(value);
            });

            // Remove events
            removeEventListener("keyup", this.onKeyUp);
            removeEventListener("keydown", this.onKeyDown);
            document.removeEventListener("visibilitychange", this.onVisibilityChange);

            // Remove all elements
            Object.entries(this.elements).forEach(([key, value]) => {
                value.remove();
            });

            this.hasInit = false;
        }

        if (this.running) {
            this.music.pause();
            this.music.currentTime = 0;
            this.music.src = "";
            this.music.remove();

            // Stop game loop
            this.running = false;
        }

        // Call event
        this.call("onStopping");
    }

    pause() {
        // TODO
        this.stop();
    }

    spawnNote(laneNum, sliderHeight = 0) {
        const laneIndex = laneNum - 1;
        const lane = this.lanes[laneIndex];
        let top = this.gameSettings.noteDirection == 1 ?
            0 :
            this.gameSettings.noteDirection == 2 ?
                this.game.offsetHeight :
                null;
        const noteElement = document.createElement("div");
        noteElement.classList.add("note");
        noteElement.classList.add(`note-${this.lanes.length}-${laneNum}`);
        noteElement.style.top = `${top}px`;
        noteElement.style.transform = this.gameSettings.noteDirection == 1 ?
            "translateY(-100%)" :
            this.gameSettings.noteDirection == 2 ?
                "translateY(0%)" :
                null;
        lane.elements.notes.appendChild(noteElement);
        lane.notesSpawned++;
        const height = sliderHeight ? Math.max(noteElement.offsetHeight, (this.beatToMs(sliderHeight) * this.noteMoveAmount + noteElement.offsetHeight) / this.speed) : noteElement.offsetHeight;
        const note = { top, normalHeight: noteElement.offsetHeight, height, element: noteElement, id: lane.notesSpawned, isSlider: sliderHeight ? true : false, holding: false, holdStart: null };
        // lane.notes.push(note);
        lane.notes.add(note);
        noteElement.style.height = `${Math.round(height)}px`;
        // console.log(laneNum, height, top, Date.now());  
        return note;
    }

    getActualTop(note, useHeight) {
        return this.gameSettings.noteDirection == 1 ?
            note.top - (useHeight ? note.height : note.normalHeight) :
            this.gameSettings.noteDirection == 2 ?
                note.top :
                null;
    }

    getNewNotePos(note, deltaTime) {
        const newPos = {
            x: note.offsetLeft,
            y: this.gameSettings.noteDirection == 1 ?
                note.top + (this.noteMoveAmount * deltaTime):
                this.gameSettings.noteDirection == 2 ?
                    note.top - (this.noteMoveAmount * deltaTime):
                    null
        };
        // note.left = newPos.x;
        note.top = newPos.y;
        return newPos;
    }

    removeNote(lane, note) {
        lane.notes.delete(note);
        note.element.remove();
    }

    miss() {
        if (this.combo) this.playSfx("combo-break");
        this.misses++;
        this.health = Math.max(0, this.health - 1);
        this.updateCombo(0);
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

    calculateAccuracy() {
        if (!this.notesHit && !this.misses) return 100;
        return (this.scoreNoMultiplier / (Math.max(...this.gameSettings.points.map(i => i.points)) * (this.notesHit + this.slidersFinished + this.misses + this.badHits))) * 100;
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

    setHitScore(points) {
        this.elements.hitScore.removeAttribute("style");
        this.elements.hitScore.style.display = "none";
        this.gameTimeout(() => {
            const hitScore = { ...this.defaultHitScore, ...this.hitScores[points] };
            this.elements.hitScore.style.display = "";
            Object.entries(hitScore.styles || {}).forEach(([key, value]) => this.elements.hitScore.style[key] = value);

            if (hitScore.type == "text") {
                this.elements.hitScore.innerHTML = `<div>${hitScore.text}</div>`;
            } else if (hitScore.type == "image") {
                this.elements.hitScore.innerHTML = `<img src="${this.urls[`${points}-hit-score`] || this.urls["default-hit-score"]}">`
            } else this.elements.hitScore.innerHTML = "";
            this.gameTimeout(() => {
                this.elements.hitScore.style.display = "none";
                this.elements.hitScore.innerHTML = "";
            }, hitScore.hideAfter, "hitScoreHide");
        });
    }

    playSfx(sfx) {
        if (!this.urls[sfx]) return;
        this.playAudio(this.urls[sfx], { volume: this.user.settings.sfxVolume });
    }

    playAudio(url, options = {}) {
        if (!url || this.audiosPlaying >= this.gameSettings.maxAudio) return;
        const audio = new Audio(url);
        this.audiosPlaying++;
        audio.volume = (this.user.settings.masterVolume / 100) * (options.volume != undefined ? options.volume / 100 : 1);
        if (options.playbackRate) audio.playbackRate = options.playbackRate;
        if (options.changePitch) audio.preservesPitch = false;
        audio.onpause = e => audio.ended ? null : audio.play();
        audio.onended = () => this.audiosPlaying--;
        audio.onloadedmetadata = () => audio.play();
        return audio;
    }

    onKeyPress(laneIndex) {
        const lane = this.lanes[laneIndex];
        lane.elements.key.classList.add("pressed")

        this.playSfx("hit");
        // if (this.lanes[laneIndex].notes.length) this.hitNote(laneIndex);
        if (lane.notes.size) this.hitNote(lane);
    }

    onKeyRelease(laneIndex) {
        const lane = this.lanes[laneIndex];
        lane.elements.key.classList.remove("pressed");

        const note = lane.notes.values().next().value;
        if (note?.isSlider && note?.holding) this.releaseNote(lane);
    }

    getClosestNote(lane) {
        let closestNote = null;
        let distance = null;

        for (const note of lane.notes) {
            const noteDistance = this.getNoteDistance(lane, note);

            if (closestNote == null || noteDistance < distance) {
                closestNote = note;
                distance = noteDistance;
            }
        }

        return closestNote;
    }

    getNoteDistance(lane, note, isEnd) {
        const keyTop = lane.elements.key.offsetTop;
        const noteTop = this.getActualTop(note, isEnd);
        // console.log(noteTop - keyTop)
        return Math.max(noteTop - keyTop, keyTop - noteTop);
    }

    hitNote(lane) {
        const keyTop = lane.elements.key.offsetTop;
        const closestNote = this.getClosestNote(lane);
        const noteDistance = this.getNoteDistance(lane, closestNote);

        const closestNoteTop = this.getActualTop(closestNote);

        if (noteDistance > this.pointRange || closestNote.finished) return; // Ignore if closest note is still too far or has been finished
        const pointsToAdd = this.gameSettings.points.reduce((prev, curr) => Math.abs(curr.distance - noteDistance) < Math.abs(prev.distance - noteDistance) ? curr : prev);

        this.notesHit++;

        if (pointsToAdd.isBadHit) {
            this.playSfx("bad-hit");
            this.updateCombo(0);
            this.badHits++;
            this.health = Math.min(0, this.health - 1);
        } else {
            this.updateCombo();
            this.health = Math.min(this.gameSettings.maxHealth, this.health + 1);
        }

        this.setHitScore(pointsToAdd.points);
        this.scoreNoMultiplier += pointsToAdd.points;
        this.score += pointsToAdd.points * this.multiplier;
        this.givenPoints[pointsToAdd.points] = (this.givenPoints[pointsToAdd.points] || 0) + 1;
        closestNote.holding = true;
        if (closestNote.isSlider) {
            closestNote.holdStart = Date.now(); // For combo increments while holding
            // Force onto key
            closestNote.top = this.gameSettings.noteDirection == 1 ?
                keyTop + closestNote.normalHeight :
                this.gameSettings.noteDirection == 2 ?
                    keyTop :
                    null;
            closestNote.element.style.top = `${closestNote.top}px`;
            // Change note height depending on the distance when pressed
            closestNote.height += Math.abs(closestNoteTop - keyTop) > Math.abs(keyTop - closestNoteTop) ? closestNoteTop - keyTop : keyTop - closestNoteTop;
            closestNote.element.style.height = `${Math.round(closestNote.height)}px`;
        } else this.removeNote(lane, closestNote);
    }

    releaseNote(lane) {
        const foundNote = lane.notes.values().find(i => i.holding);
        if (!foundNote) return;
        foundNote.holding = false;
        if (foundNote.isSlider) {
            if (this.gameSettings.sliderPoints) {
                const noteDistance = this.getNoteDistance(lane, foundNote, true);
                if (noteDistance > this.pointRange) {
                    // Miss if still too far from end
                    foundNote.finished = true;
                    return this.miss();
                }

                const pointsToAdd = this.gameSettings.points.reduce((prev, curr) => Math.abs(curr.distance - noteDistance) < Math.abs(prev.distance - noteDistance) ? curr : prev);

                this.slidersFinished++;

                if (pointsToAdd.isBadHit) {
                    this.playSfx("bad-hit");
                    this.updateCombo(0);
                    this.badHits++;
                    this.health = Math.min(0, this.health - 1);
                } else {
                    this.health = Math.min(this.gameSettings.maxHealth, this.health + 1);
                }

                this.setHitScore(pointsToAdd.points);
                this.scoreNoMultiplier += pointsToAdd.points;
                this.score += pointsToAdd.points * this.multiplier;
                this.givenPoints[pointsToAdd.points] = (this.givenPoints[pointsToAdd.points] || 0) + 1;
            }
        }
        this.removeNote(lane, foundNote);
    }

    gameLoop(callback) {
        let prevTime = Date.now();
        let fps = 0;

        const loop = () => {
            const time = Date.now();
            const deltaTime = time - prevTime;
            if (deltaTime) fps = Math.round(1000 / deltaTime);
            prevTime = time;

            callback(deltaTime, () => requestAnimationFrame(loop), fps, time);
        }

        requestAnimationFrame(loop);
    }

    gameTimeout(callback, ms = 0, name) {
        const existingTimeout = this.timeouts.findIndex(i => name && i?.name == name);
        if (existingTimeout >= 0) this.timeouts[existingTimeout] = null;
        const index = this.timeouts.push({ callback, ms, time: this.runningTime || 0, name }) - 1;
        return () => this.timeouts[index] = null;
    }

    gameInterval(callback, ms = 0, name) {
        const existingInterval = this.intervals.findIndex(i => name && i?.name == name);
        if (existingInterval >= 0) this.intervals[existingInterval] = null;
        const index = this.intervals.push({ callback, ms, time: this.runningTime || 0, name }) - 1;
        return () => this.intervals[index] = null
    }

    removeGameTimeout(name) {
        const foundIndex = this.timeouts.findIndex(i => i?.name == name);
        if (foundIndex == -1) return false;
        this.timeouts[foundIndex] = null;
        return true;
    }

    removeGameInterval(name) {
        const foundIndex = this.intervals.findIndex(i => i?.name == name);
        if (foundIndex == -1) return false;
        this.intervals[foundIndex] = null;
        return true;
    }

    // Events
    onKeyDown = (ev) => {
        // TODO: seperate into key-4-2 or something similar instead of arrays, also we obviously want more stuff here
        const index = this.user.settings.keybinds[`${this.level.keys}-keys`]?.findIndex(i => i == ev.key);
        if (index >= 0 && !this.lanes[index].keyPressed) {
            this.lanes[index].keyPressed = true;
            this.onKeyPress(index);
        }
    }
    
    onKeyUp = (ev) => {
        // TODO: seperate into key-4-2 or something similar instead of arrays, also we obviously want more stuff here
        const index = this.user.settings.keybinds[`${this.level.keys}-keys`]?.findIndex(i => i == ev.key);
        if (index >= 0 && this.lanes[index].keyPressed) {
            this.lanes[index].keyPressed = false;
            this.onKeyRelease(index);
        }
    }

    onVisibilityChange = (ev) => document.hidden ? this.pause() : null;

    // Game events
    on(name, callback) {
        const func = this[name];
        this[name] = (...args) => { func?.(...args); callback(...args); }
    }

    once(name, callback) {
        const func = this[name];
        this[name] = (...args) => { func?.(...args); callback(...args); this[name] = func; }
    }

    removeAllEventCallbacks(name) {
        this[name] = null;
    }

    call(name, ...args) {
        this[name]?.(...args);
    }

    onStart() { }
    onStopping() { }
    onGameLoopStop() { }
    onFpsUpdate() { }
}