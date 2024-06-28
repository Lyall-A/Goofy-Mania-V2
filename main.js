async function getLevelData(mapPath, level) {
    level.data = await getData(mapPath, level, "json");
    
    return level;
}

async function getMapData(mapPath) {
    const map = await fetch(`${mapPath}/map.gmm`).then(i => i.json());
   
    map.audio.data = await getData(mapPath, map.audio);
    map.cover.data = await getData(mapPath, map.cover);
    map.background.data = await getData(mapPath, map.background);
   
    return map;
}

async function getSkinData(skinPath) {
    const skin = await fetch(`${skinPath}/skin.gms`).then(i => i.json());

    skin.style.data = await getData(skinPath, skin.style);
    for (const [key, value] of Object.entries(skin.sfx)) value.data = await getData(skinPath, value);
    for (const [key, value] of Object.entries(skin.hitScores[1])) value.data = await getData(skinPath, value);
    skin.hitScores[0].data = await getData(skinPath, skin.hitScores[0]);

    return skin;
}

function loadDefaultSkin(skin) {
    const style = document.getElementById("default-skin-style") || document.createElement("link");
    style.rel = "stylesheet";
    style.href = URL.createObjectURL(skin.style.data);
    style.id = "default-skin-style";

    document.head.appendChild(style);
}

function loadSkin(skin) {
    const style = document.getElementById("skin-style") || document.createElement("link");
    style.rel = "stylesheet";
    style.href = URL.createObjectURL(skin.style.data);
    style.id = "skin-style";

    document.head.appendChild(style);
}

async function getData(path, obj, type) {
    return obj.data || obj.file ? await fetch(`${path}/${obj.file}`).then(i => i[type || "blob"]()) : null;
}

// Electron stuff
if (typeof process != "undefined" && process.versions?.electron != undefined) {
    const { ipcRenderer } = require("electron");
}