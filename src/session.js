const fs = require('fs-extra');
const path = require('path');

const Session = function(session_path, data={ }) {
    if (session_path === undefined || session_path === null || session_path.trim() === '') {
        throw new Error('session path is required');
    }

    const session = {
        path: session_path,
        data: data
    };

    session.save = function() {
        const session = this;
        const session_file = path.join(session.path, 'session.json');
        return new Promise(function(resolve, reject) {
            fs.writeFile(session_file, JSON.stringify(session.data), 'utf8',
                function(err) {
                    if (err !== null) {
                        reject(err);
                    } else {
                        resolve(session_file);
                    }
                }
            );
        });
    };

    return session;
};

const load_session = function(session_path) {
    const session_file = path.join(session_path, 'session.json');
    return new Promise(function(resolve, reject) {
        fs.readFile(session_file, function(err, data) {
            if (err !== null) {
                reject(err);
            } else {
                try {
                    resolve(Session(session_path, JSON.parse(data)));
                } catch (err) {
                    reject(err);
                }
            }
        });
    });
};

module.exports = {
    Session: Session,
    load_session: load_session
};
