const loadingTextElement = document.getElementById("loading-text");
const mapSelectElement = document.getElementById("map-select");
const mapsElement = document.getElementById("maps");
const levelSelectElement = document.getElementById("level-select");
const levelsElement = document.getElementById("levels");
const gameWrapper = document.getElementById("game-wrapper");
const gameElement = document.getElementById("game");
const fpsElement = document.getElementById("fps");

// Settings
const defaultSettings = {
    // Default settings
    scrollSpeed: 20,
    masterVolume: 15,
    musicVolume: 100,
    sfxVolume: 50,
    keybinds: {
        "skip": " ",
        "1-keys": "g".split(""),
        "2-keys": "gh".split(""),
        "3-keys": "f h".split(""),
        "4-keys": "dfjk".split(""),
        "5-keys": "df jk".split(""),
        "6-keys": "sdfjkl".split(""),
        "7-keys": "sdf jkl".split("")
    },
    repositories: [
        { name: "Main", path: "maps", file: "repo.gmr" },
        // { name: "Test", path: "test", file: "test_repo.gmr" }
    ]
}
let settings;
if (!localStorage.getItem("gm-settings")) localStorage.setItem("gm-settings", JSON.stringify(defaultSettings));
try { settings = JSON.parse(localStorage.getItem("gm-settings")) } catch (err) { settings = defaultSettings; saveSettings() };

// Repositories
const repositories = [];

// Variables
const maps = [];
let skin;
const modifiers = {};

(async () => {
    // Set loading screen
    setLoadingText("Loading default skin...");

    // Load default skin
    const defaultSkin = await getSkinData("skins/default", "skin.gms");
    loadDefaultSkin(defaultSkin);

    // TEMP
    skin = defaultSkin;
    // const testSkin = await getSkinData("skins/up-test", "skin.gms");
    // loadSkin(testSkin);

    if (settings.skin) {
        setLoadingText(`Loading skin '${settings.skin.name}'...`);
        // TODO: i cant be bothered
    }

    let reposLoaded = 0;
    // Load repositories
    for (const repoInfo of settings.repositories || []) {
        setLoadingText(`Loading repositories: ${settings.repositories.length - reposLoaded}`);
        const repo = await getRepository(repoInfo);
        repositories.push(repo);
        reposLoaded++;

        if (repo.data["maps"]) {
            // Repository of maps
            for (const repoData of repo.data["maps"]) {
                maps.push({
                    ...repoData,
                    fullPath: `${repo.path}/${repoData.path}`
                });
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

        if (map.cover?.file || map.background?.file) imgElement.src = encodeURIComponent(`${map.fullPath}/${map.cover?.file || map.background?.file}`);
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
        levelElement.onclick = () => startGame(map, level);

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

async function startGame(map, level) {
    setLoadingText(`Loading map '${map.name}'`);
    await getMapData(map);
    await getLevelData(map, level);

    const user = {
        settings,
        modifiers,
        skin
    }

    levelSelectElement.style.display = "none";
    if (settings.gameWidth) gameElement.style.width = `${settings.gameWidth}px`;
    if (settings.gameHeight) gameElement.style.height = `${settings.gameHeight}px`;
    gameElement.style.display = "";
    game = new Game(gameElement, map, level, user);
    setLoadingText();
    game.init();
    game.start();
    game.on("onFpsUpdate", fps => fpsElement.innerHTML = `FPS: ${fps}`);
    return game;
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
    level.data = await getData(map.fullPath, level, "json");

    return level;
}

async function getMapData(map) {
    map.audio.data = await getData(map.fullPath, map.audio);
    map.cover.data = await getData(map.fullPath, map.cover);
    map.background.data = await getData(map.fullPath, map.background);

    return map;
}

async function getSkinData(skinPath) {
    const skin = await fetch(`${skinPath}/skin.gms`).then(i => i.json());

    skin.style.data = await getData(skinPath, skin.style);
    for (const [key, value] of Object.entries(skin.sfx || { })) value.data = await getData(skinPath, value);
    for (const [key, value] of Object.entries(skin.hitScores?.[1] || { })) value.data = await getData(skinPath, value);
    if (skin.hitScores?.[0]) skin.hitScores[0].data = await getData(skinPath, skin.hitScores[0]);

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
    return obj.data || obj.file ? await fetch(encodeURIComponent(`${path ? `${path}/` : ""}${obj.file}`)).then(i => i[type || "blob"]()) : null;
}

function setLoadingText(text = "") {
    loadingTextElement.innerHTML = text;
    if (!text) loadingTextElement.style.display = "none"; else loadingTextElement.style.display = "";
}

// Electron stuff
if (typeof process != "undefined" && process.versions?.electron != undefined) {
    const { ipcRenderer } = require("electron");
}