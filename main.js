// Copyright 2018. Douglas G. Moore. All rights reserved.
//
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

// # The Caim UI
//
// Caim's UI is built on [electron](https://electronjs.org). This design
// decision was based on two factors:
//
// 1. Electron is a reasonable cross-platform UI toolkit
// 2. It is 100% Javascript + HTML + CSS
//
// The original version of [caim](https://github.com/elife-asu/caim-go)
// was written using a Server + Client architecture, with the front-end
// implemented with the standard web technologies. The hope is that this
// will make porting caim to a standalone application using electron fairly
// straitforward.
//
// To start, I get `app` and `BrowserWindow` from electron. The former
// will be our application object, and I'll use the latter to create
// windows.
const {app, BrowserWindow} = require('electron');

// ## Creating Windows
//
// I then need to create a global variable to keep track of our active
// window. Caim is to be designed as a single-window application, so I
// don't need `win` to be an array.
let win = null;

// From here I define a `createWindow` function will will take care of
// building a new Caim window.
function createWindow() {
    // This entails initializing `win` with a new `BrowserWindow`.
	win = new BrowserWindow();

	// I then load a dummy url (my personal github page) as a
	// placeholder for the future UI.

	win.loadURL('https://github.com/dglmoore');
	
	// I then register an `onclosed` event handler which sets our
	// `win` variable to `null` so it can be garbage collected.

	win.on('closed', () => win = null);
}

// ## Handling App Events
//
// I create a window in response two events:
//
// 1. when the app's `'ready'` event fires
// 2. when the application becomes activated and there is no window.
app.on('ready', createWindow);

app.on('activate', function() {
	if (win === null) {
		createWindow();
	}
});

// Finally, we quit the app if when the last window is close.
//
// **Note**: it is OS X standard operating procedure to keep the
// application running after the last window is closed. Users have to
// explictly quit the application.
app.on('window-all-closed', function() {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

// ## Conclusion
//
// That's all we need to create a basic UI with electron. As we develop
// the project further, we'll need to extend electron's base menus with
// options for loading videos and reloading sessions, but this is good
// for now.
