async function getLevel(mapPath, level) {
    level.data = level.data || await fetch(`${mapPath}/${level.file}`).then(i => i.json());
    return level;
}

async function getMap(mapPath) {
    const map = await fetch(`${mapPath}/map.gmm`).then(i => i.json());
    map.audioData = map.audioData || map.audioFile ? await fetch(`${mapPath}/${map.audioFile}`).then(i => i.blob()) : null;
    map.coverData = map.coverData || map.coverFile ? await fetch(`${mapPath}/${map.coverFile}`).then(i => i.blob()) : null;
    map.backgroundData = map.backgroundData || map.backgroundFile ? await fetch(`${mapPath}/${map.backgroundFile}`).then(i => i.blob()) : null;
    return map;
}

async function loadDefaultSkin(skinPath) {
    const skin = await fetch(`${skinPath}/skin.gms`).then(i => i.json());

    const styleElement = document.getElementById("default-skin-style");
    styleElement.rel = "stylesheet";
    styleElement.href = `${skinPath}/${skin.styleFile}`;

    document.head.appendChild(styleElement);
}

async function loadSkin(skinPath) {
    const skin = await fetch(`${skinPath}/skin.gms`).then(i => i.json());

    const styleElement = document.getElementById("skin-style");
    styleElement.rel = "stylesheet";
    styleElement.href = `${skinPath}/${skin.styleFile}`;

    document.head.appendChild(styleElement);
}

function convertV1ToV2(v1, min) {
    const v2 = v1.map(i => ([i.notes, i.beat]));
    return min ? JSON.stringify(v2) : v2;
}
