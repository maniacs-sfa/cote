import test from 'ava';
import LogSuppress from 'log-suppress';
import r from 'randomstring';
import sinon from 'sinon';

let { Requester, Responder } = require('../')();

LogSuppress.init(console);

test('Has no environment', (t) => {
    t.is(Requester.environment, '');
    t.is(Responder.environment, '');
});

test.cb(`Ignore messages that don't include type`, (t) => {
    t.plan(1);

    let key = r.generate();

    let requester = new Requester({ name: `${t.title}: ignore requester`, key });
    let responder = new Responder({ name: `${t.title}: ignore responder`, key });

    requester.send('This should be ignored');

    responder.sock.on('message', (req) => {
        t.falsy(req.type);
        t.end();
    });
});

test.cb('Supports simple req&res', (t) => {
    t.plan(1);

    let requester = new Requester({ name: `${t.title}: simple requester` });
    let responder = new Responder({ name: `${t.title}: simple responder` });

    requester.send({ type: 'test', args: [1, 2, 3] });

    responder.on('test', (req) => {
        t.deepEqual(req.args, [1, 2, 3]);
        t.end();
    });
});

test.cb('Supports keys', (t) => {
    let key = r.generate();

    let requester = new Requester({ name: `${t.title}: keyed requester`, key });
    let responder = new Responder({ name: `${t.title}: keyed responder`, key });

    requester.send({ type: 'test', args: [1, 2, 4] });

    responder.on('test', (req) => {
        t.deepEqual(req.args, [1, 2, 4]);
        t.end();
    });
});

test.cb('Supports namespaces', (t) => {
    let namespace = r.generate();

    let requester = new Requester({ name: `${t.title}: ns requester`, namespace });
    let responder = new Responder({ name: `${t.title}: ns responder`, namespace });

    requester.send({ type: 'test', args: [1, 2, 5] });

    responder.on('test', (req) => {
        t.deepEqual(req.args, [1, 2, 5]);
        t.end();
    });
});

test.cb('Supports keys & namespaces', (t) => {
    let key = r.generate();
    let namespace = r.generate();

    let requester = new Requester({ name: `RR ${t.title}: kns requester`, key, namespace });
    let responder = new Responder({ name: `RR ${t.title}: kns responder`, key, namespace });

    requester.send({ type: 'test', args: [1, 2, 6] });

    responder.on('test', (req) => {
        t.deepEqual(req.args, [1, 2, 6]);
        t.end();
    });
});

test.cb('Responder throws unknown error', (t) => {
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

    let responder = new Responder({ name: `${t.title}: error throwing responder`, key });
    responder.sock.on('bind', () => responder.sock.server.emit('error', new Error('unknown error')));
});

test.cb('Does not try to reconnect twice to the same responder', (t) => {
    let key = r.generate();

    let requester = new Requester({ name: `${t.title}: keyed requester`, key });
    let responder = new Responder({ name: `${t.title}: keyed responder`, key });

    responder.sock.on('connect', () => {
        const stub = sinon.stub(responder.discovery, 'hello');

        setTimeout(() => {
            stub.restore();

            requester.on('cote:added', (obj) => {
                let alreadyConnected = requester.sock.socks.some((s) => s.adv.id == obj.id);
                t.true(alreadyConnected);
                t.end();
            });
        }, 8000);
    });
});
