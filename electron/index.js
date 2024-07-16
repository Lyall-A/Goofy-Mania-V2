const { app, BrowserWindow } = require("electron/main");

function createWindow () {
    const window = new BrowserWindow({
        width: 1280,
        height: 730,
        icon: "../icon.ico",
        webPreferences: {
            nodeIntegration: true
        }
    });

    window.setMenuBarVisibility(false);

    window.loadFile("../index.html");
}

app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        if (!BrowserWindow.getAllWindows().length) createWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});