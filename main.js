async function getLevelData(mapPath, level) {
    return level.data || await fetch(`${mapPath}/${level.file}`).then(i => i.json());
}

async function getMapData(mapPath) {
    const map = await fetch(`${mapPath}/map.json`).then(i => i.json());
    map.songData = map.songData || await fetch(`${mapPath}/${map.songFile}`).then(i => i.blob());
    map.coverData = map.coverData || await fetch(`${mapPath}/${map.coverFile}`).then(i => i.blob());
    return map;
}

async function loadSkin(skinPath) {
    const skin = await fetch(`${skinPath}/skin.json`).then(i => i.json());

    const styleElement = document.getElementById("skin-style");
    styleElement.rel = "stylesheet";
    styleElement.href = `${skinPath}/${skin.styleFile}`;

    document.head.appendChild(styleElement);
}