const path = require("path");
const fs = require("fs");

const quaverMapPath = process.argv[2];
const goofyManiaMapPath = process.argv[3] || "./quaver-to-goofy-mania";

if (quaverMapPath && goofyManiaMapPath) quaverToGoofyMania(quaverMapPath, goofyManiaMapPath);

function quaverToGoofyMania(quaverMapPath, goofyManiaMapPath) {
    if (!fs.existsSync(goofyManiaMapPath)) fs.mkdirSync(goofyManiaMapPath);

    const map = {
        audio: { file: null },
        cover: { file: null },
        background: { file: null },
        name: null,
        artist: null,
        mappers: [],
        offset: 0,
        bpm: 0,
        levels: []
    }
    
    
    fs.readdirSync(quaverMapPath).forEach(file => {
        if (path.extname(file) != ".qua") return;
        const filePath = path.join(quaverMapPath, file);
        const parsedQuaverLevel = parseQuaverLevel(fs.readFileSync(filePath, "utf-8"));
        
        const audioFile = parsedQuaverLevel.AudioFile;
        const songPreviewTime = parsedQuaverLevel.SongPreviewTime;
        const backgroundFile = parsedQuaverLevel.BackgroundFile;
        const mapId = parsedQuaverLevel.MapId;
        const title = parsedQuaverLevel.Title;
        const artist = parsedQuaverLevel.Artist;
        const creator = parsedQuaverLevel.Creator;
        const difficultyName = parsedQuaverLevel.DifficultyName;
        const description = parsedQuaverLevel.Description;
        const mode = parsedQuaverLevel.Mode;
        const timingPoints = parsedQuaverLevel.TimingPoints;
        const hitObjects = parsedQuaverLevel.HitObjects;
        
        const bpm = timingPoints[0].Bpm; // TODO: probably bad
        
        const audioFilePath = path.join(quaverMapPath, audioFile);
        const backgroundFilePath = path.join(quaverMapPath, backgroundFile);
    
        if (!fs.existsSync(path.join(goofyManiaMapPath, audioFile))) copyFile(audioFilePath, goofyManiaMapPath);
        if (!fs.existsSync(path.join(goofyManiaMapPath, backgroundFile))) copyFile(backgroundFilePath, goofyManiaMapPath);
    
        const keys = Number(mode.split("Keys")[1]);
    
        map.audio.file = audioFile;
        map.background.file = backgroundFile;
        map.name = title;
        map.artist = artist;
        map.mappers.push({ name: creator });
        map.bpm = bpm;
        map.offset = 0;
        
        map.levels.push({
            scrollSpeed: 17, // TODO...
            name: difficultyName,
            keys,
            file: `${mapId}.gml`
        });
    
        const levelData = [];
        hitObjects.filter(i => i.Lane && i.StartTime).forEach(hitObject => levelData.push([hitObject.Lane, hitObject.EndTime ? msToBeat(hitObject.EndTime - hitObject.StartTime, bpm) : 0, msToBeat(hitObject.StartTime, bpm)]));
        
        fs.writeFileSync(path.join(goofyManiaMapPath, `${mapId}.gml`), JSON.stringify(levelData));
    });
    
    fs.writeFileSync(path.join(goofyManiaMapPath, "map.gmm"), JSON.stringify(map));
}

module.exports = quaverToGoofyMania;

function msToBeat(ms, bpm) {
    return ms / (60 * 1000 / bpm);
}

function parseQuaverLevel(level) {
    const parsed = { };
    const splitNewLines = level.split("\r\n").filter(i => i);
    let lastObject;
    let lastArray;
    splitNewLines.forEach(line => {
        const keyValueMatch = line.match(/^([^ ]*): (.*)/);
        if (keyValueMatch) {
            if (Object.keys(lastObject || {}).length && lastArray) lastArray.push(lastObject);
            lastObject = { };
            return parsed[keyValueMatch[1]] = parseString(keyValueMatch[2]);
        }

        const keyArrayMatch = line.match(/^([^ ]*):/);
        if (keyArrayMatch) {
            if (Object.keys(lastObject || {}).length && lastArray) lastArray.push(lastObject);
            lastObject = { };
            lastArray = [ ];
            return parsed[keyArrayMatch[1]] = lastArray;
        }

        const keyObjectMatch = line.match(/- (.*): (.*)/);
        if (keyObjectMatch) {
            if (Object.keys(lastObject || {}).length && lastArray) lastArray.push(lastObject);
            lastObject = { };
            return lastObject[keyObjectMatch[1]] = parseString(keyObjectMatch[2]);
        }

        const objectKeyValueMatch = line.match(/  (.*): (.*)/);
        if (objectKeyValueMatch) return lastObject[objectKeyValueMatch[1]] = parseString(objectKeyValueMatch[2]);
    });

    if (Object.keys(lastObject || {}).length && lastArray) lastArray.push(lastObject);
    lastObject = { };

    return parsed;
}

function parseString(string) {
    try {
        return JSON.parse(string);
    } catch (err) {
        return string;
    }
}

function copyFile(file, destination) {
    fs.copyFileSync(file, path.join(destination, path.basename(file)));
}