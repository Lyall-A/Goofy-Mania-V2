async function getLevelData(mapPath, level) {
    level.data = level.data || await fetch(`${mapPath}/${level.file}`).then(i => i.json());
    
    return level;
}

async function getMapData(mapPath) {
    const map = await fetch(`${mapPath}/map.gmm`).then(i => i.json());
   
    map.audio.data = map.audio.data || map.audio.file ? await fetch(`${mapPath}/${map.audio.file}`).then(i => i.blob()) : null;
    map.cover.data = map.cover.data || map.cover.file ? await fetch(`${mapPath}/${map.cover.file}`).then(i => i.blob()) : null;
    map.background.data = map.background.data || map.background.file ? await fetch(`${mapPath}/${map.background.file}`).then(i => i.blob()) : null;
   
    return map;
}

async function getSkinData(skinPath) {
    const skin = await fetch(`${skinPath}/skin.gms`).then(i => i.json());

    skin.style.data = skin.style.data || skin.style.file ? await fetch(`${skinPath}/${skin.style.file}`).then(i => i.blob()) : null;
    for (const [key, value] of Object.entries(skin.sfx)) value.data = value.data || value.file ? await fetch(`${skinPath}/${value.file}`).then(i => i.blob()) : null;

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