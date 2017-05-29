import test from 'ava';
import LogSuppress from 'log-suppress';
import r from 'randomstring';
import async from 'async';
// import stream from 'stream';
const environment = r.generate();

let { Requester, Responder, Monitor } = require('../')({ environment, statusInterval: 100 });

LogSuppress.init(console);

test.cb('Print to screen', (t) => {
    let requester = new Requester({ name: `${t.title}: monitor requester` });
    let responder = new Responder({ name: `${t.title}: monitor responder` });

    process.stdout.cork();

    let monitor = new Monitor({ name: `${t.title}: monitor` }, { interval: 100 });
    let monitor2 = new Monitor({ name: `${t.title}: monitor2` });

    monitor2.on('status', (s) => console.log(s));
    monitor.on('status', (s) => console.log(s));
    async.each(
        [monitor, monitor2],
        (m, done) => m.once('status', () => done()),
        () => t.end()
    );
});

test.cb('Monitor throws unknown error', (t) => {
    t.plan(1);

    let key = r.generate();

    const originalListeners = process.listeners('uncaughtException');

    process.removeAllListeners('uncaughtException');

    process.on('uncaughtException', function(err) {
        if (err.message != 'unknown error') {
            originalListeners.forEach((l) => process.on('uncaughtException', l));

            throw err;
        }

        t.pass();
        t.end();
    });

    let monitor = new Monitor({ name: `${t.title}: error throwing monitor`, key });
    monitor.sock.sock.on('bind', () => monitor.sock.sock.server.emit('error', new Error('unknown error')));
});
