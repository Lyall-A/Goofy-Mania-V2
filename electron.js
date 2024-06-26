const { app, BrowserWindow } = require("electron");

function createWindow() {
    const window = new BrowserWindow({
        width: 1280,
        height: 720
    });

    window.loadFile("index.html");
}

app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => !BrowserWindow.getAllWindows().length ? createWindow() : null); // Create window when app is activated (mainly for macOS))
});

app.on("window-all-closed", () => process.platform != "darwin" ? app.quit() : null); // Since closing apps on macOS isn't really a thing