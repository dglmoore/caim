const {app, dialog, BrowserWindow, Menu, ipcMain} = require('electron');
const fs = require('fs-extra');
const path = require('path');
const {Session, load_session} = require('./src/session');

let win = null;

function create_window() {
    win = new BrowserWindow();

    Menu.setApplicationMenu(new Menu.buildFromTemplate([
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Session',
                    id: 'new-session',
                    click: new_session_dialog
                },
                {
                    label: 'Open Session',
                    id: 'open-session',
                    click: open_session_dialog
                },
                {
                    label: 'Import Video',
                    id: 'import-video',
                    enabled: false,
                    click: import_video_dialog
                },
                {
                    label: 'Quit',
                    id: 'quit',
                    role: 'quit'
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Developer Tools',
                    id: 'devtools',
                    role: 'toggleDevTools'
                },
                {
                    label: 'Fullscreen',
                    id: 'fullscreen',
                    role: 'toggleFullScreen'
                }
            ]
        }
    ]));

    win.loadFile('assets/index.html');

    win.on('closed', () => win = null);
}

app.on('ready', create_window);

app.on('activate', function() {
    if (win === null) {
        create_window();
    }
});

app.on('window-all-closed', function() {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

let session = null;

function new_session_dialog(menuItem, browserWindow) {
    let session_path = dialog.showOpenDialog(browserWindow, {
        title: 'Choose New Session Directory',
        properties: [
            'openDirectory',
            'createDirectory',
            'promptToCreate'
        ]
    });

    if (session_path !== undefined) {
        if (session_path.length === 1) {
            session_path = session_path[0];

            fs.ensureDirSync(session_path);

            if (fs.readdirSync(session_path).length != 0) {
                error_dialog({
                    title: 'New Session Error',
                    message: `Requested session path (${session_path}) is not empty`,
                });
            } else {
                session = Session(session_path);
                session.save();

                app.getApplicationMenu().getMenuItemById('import-video').enabled = true;
                browserWindow.send('load-session', session.path, session.metadata.video);
            }
        } else {
            error_dialog({
                title: 'New Session Error',
                message: 'Too many paths selected, select only one'
            });
        }
    }
}

async function open_session_dialog(menuItem, browserWindow) {
    const session_file = dialog.showOpenDialog(browserWindow, {
        title: 'Choose a Caim Session File',
        buttonLabel: 'Open',
        filters: [
            {name: 'JSON', extensions: ['json']},
            {name: 'All Files', extensions: ['*']}
        ],
        properties: [
            'openFile'
        ]
    });

    if (session_file !== undefined) {
        if (session_file.length === 1) {
            try {
                const session_path = path.dirname(session_file[0]);
                session = await load_session(session_path);
                app.getApplicationMenu().getMenuItemById('import-video').enabled = true;
                browserWindow.send('load-session', session.path, session.data.video);
            } catch(err) {
                error_dialog({
                    title: 'Open Session Error',
                    message: 'Cannot open session file',
                    detail: err.toString()
                });
            }
        } else {
            error_dialog({
                title: 'Open Session Error',
                message: 'Too many paths selected, select only one'
            });
        }
    }
}

async function import_video_dialog(menuItem, browserWindow) {
    const video_path = dialog.showOpenDialog(browserWindow, {
        title: 'Choose a Video to Import',
        buttonLabel: 'Import',
        filters: [
            {name: 'Videos', extensions: ['mkv', 'avi', 'mp4']},
            {name: 'All Files', extensions: ['*']}
        ],
        properties: [
            'openFile'
        ]
    });

    if (video_path !== undefined) {
        if (video_path.length === 1) {
            try {
                await session.import_video(video_path[0]);
                browserWindow.webContents.send('load-selector');
            } catch (err) {
                error_dialog({
                    title: 'Import Video Error',
                    message: 'Failed to import video',
                    detail: err.toString()
                });
            }
        } else {
            error_dialog({
                title: 'Import Video Error',
                message: 'Too many paths selected, select only one'
            });
        }
    }
}

function error_dialog(options) {
    options = Object.assign({
        type: 'error',
        buttons: ['OK']
    }, options);

    dialog.showMessageBox(options);
}

ipcMain.on('new-session', function() {
    new_session_dialog(null, win);
});

ipcMain.on('open-session', function() {
    open_session_dialog(null, win);
});

ipcMain.on('import-video', function() {
    import_video_dialog(null, win);
});