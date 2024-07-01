const { app, BrowserWindow, ipcMain } = require("electron");
const discordGameSDK = require("./discordGameSDK");

// const appId = "1021392767403966464";

// const { int: intType, void: voidType } = ref.types;

// const discordGameSdk = ffi.Library(path.resolve("discord_game_sdk", "lib", "x86_64", "discord_game_sdk.dll"), {
//     "DiscordCreate": ["pointer", ["int", "pointer"]],
//     "DiscordUpdateActivity": [voidType, ["pointer", "pointer"]],
// });

function createWindow() {
    const window = new BrowserWindow({
        width: 1280,
        height: 720,
        title: "Goofy Mania",
        icon: "icon.ico",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });

    window.setMenuBarVisibility(false)

    window.loadFile("index.html");
}

app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => !BrowserWindow.getAllWindows().length ? createWindow() : null); // Create window when app is activated (mainly for macOS)
});

app.on("window-all-closed", () => process.platform != "darwin" ? app.quit() : null); // Since closing apps on macOS isn't really a thing

ipcMain.on("update-discord-activity", (event, args) => {
    
});