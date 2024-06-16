async function getLevelData(mapPath, level) {
    return level.data || await fetch(`${mapPath}/${level.file}`).then(i => i.json());
}

async function loadSkin(skinPath) {
    const skin = await fetch(`${skinPath}/skin.json`).then(i => i.json());

    const styleElement = document.getElementById("skin-style");
    styleElement.rel = "stylesheet";
    styleElement.href = `${skinPath}/${skin.styleFile}`;

    document.head.appendChild(styleElement);
}