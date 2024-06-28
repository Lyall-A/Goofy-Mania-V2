const fs = require("fs");
const path = require("path");

const quaverToGoofyMania = require("./quaverToGoofyMania");

const quaverMapsPath = process.argv[2] || "./Example Quaver Maps";
const goofyManiaMapsPath = process.argv[3] || "./maps";


fs.readdirSync(quaverMapsPath)
    .filter(i => fs.lstatSync(path.join(quaverMapsPath, i)).isDirectory())
    .forEach(quaverMapPath => quaverToGoofyMania(path.join(quaverMapsPath, quaverMapPath), path.join(goofyManiaMapsPath, `Quaver - ${quaverMapPath}`)));