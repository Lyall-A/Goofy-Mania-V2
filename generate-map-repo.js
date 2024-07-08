const fs = require("fs");
const path = require("path");

const mapsDir = process.argv[2] || "maps";

if (!mapsDir) return console.log("no");

const maps = [ ]
fs.readdirSync(mapsDir).filter(i => fs.lstatSync(path.join(mapsDir, i)).isDirectory()).forEach(map => {
    maps.push({
        ...JSON.parse(fs.readFileSync(path.join(mapsDir, map, "map.gmm"), "utf-8")),
        path: map
    });
});

fs.writeFileSync(path.join(mapsDir, "repo.gmr"), `{\n  "maps": [\n    ${maps.map(i => JSON.stringify(i)).join(",\n    ")}\n  ]\n}`);
console.log("done")