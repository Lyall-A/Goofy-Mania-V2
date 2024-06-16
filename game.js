function startGame(gameElement, level) {
    gameElement.innerHTML = "";
    gameElement.id = "game";
    const gameChildren = { };

    // createChildren();

    function spawnKeys() {
        for (let i = 0; i < level.keys; i++) {

        }
    }

    function createChildren() {
        const maniaElement = document.createElement("div");
        maniaElement.id = "game-mania";
        gameChildren["mania"] = maniaElement;

        Object.values(gameChildren).forEach(i => gameElement.appendChild(i));
    }
}