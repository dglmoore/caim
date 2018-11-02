const {ipcRenderer} = require('electron');

const new_session = () => ipcRenderer.send('new-session');

const open_session = () => ipcRenderer.send('open-session');

const import_video = () => ipcRenderer.send('import-video');

ipcRenderer.on('load-session', function(event, path, video) {
    d3.select("#startup").style('display', 'none');
    d3.select("#session").style('display', 'block');
    d3.select("#session").select("h2")
        .text(() => `Session Path: ${path}`);
    if (video === undefined || video === null) {
        d3.select("#import-video").style('display', 'block');
    } else {
        d3.select("#selection").style('display', 'block')
    }
});

ipcRenderer.on('load-selector', async function(event, uri) {
    let background = new Image();

    background.addEventListener('load', function() {
        d3.select("#import-video").style('display', 'none');
        d3.select("#selection").style('display', 'block');

        let canvas = d3.select("#selection canvas").node(),
            context = canvas.getContext("2d");

        if (background.naturalHeight && background.naturalWidth) {
            canvas.width = background.naturalWidth;
            canvas.height = background.naturalHeight;
        } else {
            canvas.width = background.width;
            canvas.height = background.height;
        }

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(background, 0, 0);
    });

    background.src = uri;
});
