const loadingTextElement = document.getElementById("loading-text");
const mapSelectElement = document.getElementById("map-select");
const mapsElement = document.getElementById("maps");
const levelSelectElement = document.getElementById("level-select");
const levelsElement = document.getElementById("levels");
const gameElement = document.getElementById("game");

// Settings
const defaultSettings = {
    // Default settings
    scrollSpeed: 20,
    masterVolume: 15,
    musicVolume: 100,
    sfxVolume: 50,
    keybinds: {
        "4-keys": "dfjk".split(""),
        "7-keys": "sdf jkl".split("")
    },
    repositories: [
        { name: "Main", path: "maps", file: "repo.gmr" }
    ]
}
let settings;
if (!localStorage.getItem("gm-settings")) localStorage.setItem("gm-settings", JSON.stringify(defaultSettings));
try { settings = JSON.parse(localStorage.getItem("gm-settings")) } catch (err) { settings = defaultSettings; saveSettings() };

// Repositories
const repositories = [];

const maps = [];

let skin;

(async () => {
    // Set loading screen
    setLoadingText("Loading default skin...");
    
    // Load default skin
    const defaultSkin = await getSkinData("skins/default", "skin.gms");
    loadDefaultSkin(defaultSkin);

    // TEMP
    skin = defaultSkin;

    if (settings.skin) {
        setLoadingText(`Loading skin '${settings.skin.name}'...`);
        // TODO: i cant be bothered
    }

    setLoadingText(`Loading ${settings.repositories.length} repositories`);

    // Load repositories
    for (const repo of settings.repositories || []) {
        repositories.push(await getRepository(repo));
    }

    for (const repo of repositories) {
        if (repo.data["maps"]) {
            // Repository of maps
            for (const repoData of repo.data["maps"]) {
                if (typeof repoData == "string") {
                    // Is .gmm path, load it and add
                    maps.push({
                        ...await fetch(`${repo.path}/${repoData}`).then(i => i.json()),
                        path: `${repo.path}/${repoData}`
                    });
                } else {
                    // Is GMM object
                    maps.push({
                        ...repoData,
                        path: `${repo.path}/${repoData.path}`
                    });
                }
            }
        }
    }

    if (!maps.length) return setLoadingText("Can't finish loading as there is no maps!");
    setLoadingText();

    // Show map select
    maps.forEach(map => {
        const mapElement = document.createElement("div");
        mapElement.classList.add("map");
        mapElement.onclick = () => showLevels(map);

        const imgElement = document.createElement("img");
        const nameElement = document.createElement("div");
        const artistElement = document.createElement("div");
        const mappersElement = document.createElement("div");

        imgElement.src = encodeURIComponent(`${map.path}/${map.cover?.file || map.background?.file}`);
        nameElement.innerHTML = map.name;
        artistElement.innerHTML = map.artist;
        mappersElement.innerHTML = map.mappers.map(i => i.name).join(", ");

        mapElement.appendChild(imgElement);
        mapElement.appendChild(nameElement);
        mapElement.appendChild(artistElement);
        mapElement.appendChild(mappersElement);

        mapsElement.appendChild(mapElement);

    });
    mapSelectElement.style.display = "";
})();

function showLevels(map) {
    mapSelectElement.style.display = "none";
    
    map.levels.forEach(level => {
        const levelElement = document.createElement("div");
        levelElement.classList.add("level");
        levelElement.onclick = () => startMap(map, level);

        const nameElement = document.createElement("div");
        const keysElement = document.createElement("div");

        nameElement.innerHTML = level.name;
        keysElement.innerHTML = level.keys;

        levelElement.appendChild(nameElement);
        levelElement.appendChild(keysElement);

        levelsElement.appendChild(levelElement);
    });
    levelSelectElement.style.display = "";
}

async function startMap(map, level) {
    setLoadingText(`Loading map '${map.name}'`);
    const mapWithData = await getMapData(map);
    const levelData = await getLevelData(map, level);
    
    const user = {
        settings,
        modifiers: {
            auto: true,
            speed: 1.2,
            pitch: true
        },
        skin
    }

    levelSelectElement.style.display = "none";
    gameElement.style.display = "";
    const game = new Game(gameElement, map, level, user);
    setLoadingText();
    game.init();
    game.start();
}

async function getRepository(repo) {
    repo.data = await getData(repo.path, repo, "json");
    return repo;
}

function resetSettings() {
    settings = defaultSettings;
    saveSettings();
}

function saveSettings() {
    localStorage.setItem("gm-settings", JSON.stringify(settings));
}

async function getLevelData(map, level) {
    level.data = await getData(map.path, level, "json");

    return level;
}

async function getMapData(map) {
    map.audio.data = await getData(map.path, map.audio);
    map.cover.data = await getData(map.path, map.cover);
    map.background.data = await getData(map.path, map.background);

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
    return obj.data || obj.file ? await fetch(`${path ? `${path}/` : ""}${obj.file}`).then(i => i[type || "blob"]()) : null;
}

function setLoadingText(text = "") {
    loadingTextElement.innerHTML = text;
    if (!text) loadingTextElement.style.display = "none"; else loadingTextElement.style.display = "";
}

// Electron stuff
if (typeof process != "undefined" && process.versions?.electron != undefined) {
    const { ipcRenderer } = require("electron");
}