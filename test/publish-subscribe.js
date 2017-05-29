import test from 'ava';
import LogSuppress from 'log-suppress';
import async from 'async';
import r from 'randomstring';
import sinon from 'sinon';

const { Publisher, Subscriber } = require('../')();

LogSuppress.init(console);

test('Has no environment', (t) => {
    t.is(Publisher.environment, '');
    t.is(Subscriber.environment, '');
});

test.cb('Supports simple pub&sub', (t) => {
    t.plan(2);

    const publisher = new Publisher({ name: `${t.title}: publisher` });
    const subscriber = new Subscriber({ name: `${t.title}: subscriber` });
    const subscriber2 = new Subscriber({ name: `${t.title}: subscriber2` });

    async.each(
        [subscriber, subscriber2],
        (s, done) => s.sock.sock.on('connect', () => done()),
        (_) => publisher.publish('test', { args: [1, 2, 3] })
    );

    const tester = (done, req) => {
        t.deepEqual(req.args, [1, 2, 3]);
        done();
    };

    async.each(
        [subscriber, subscriber2],
        (s, done) => s.on('test', tester.bind(null, done)),
        (_) => {
            [publisher, subscriber, subscriber2].forEach((c) => c.close());

            t.end();
        }
    );
});

test.cb('Supports keys', (t) => {
    const key = r.generate();

    t.plan(2);

    const publisher = new Publisher({ name: `${t.title}: keyed publisher`, key });
    const subscriber = new Subscriber({ name: `${t.title}: keyed subscriber`, key });
    const subscriber2 = new Subscriber({ name: `${t.title}: keyed subscriber2`, key });

    async.each(
        [subscriber, subscriber2],
        (s, done) => s.sock.sock.on('connect', () => done()),
        (_) => publisher.publish('test', { args: [1, 2, 4] })
    );

    const tester = (done, req) => {
        t.deepEqual(req.args, [1, 2, 4]);
        done();
    };

    async.each(
        [subscriber, subscriber2],
        (s, done) => s.on('test', tester.bind(null, done)),
        (_) => {
            [publisher, subscriber, subscriber2].forEach((c) => c.close());

            t.end();
        }
    );
});

test.cb('Supports namespaces', (t) => {
    let namespace = r.generate();

    t.plan(2);

    let publisher = new Publisher({ name: `${t.title}: ns publisher`, namespace });
    let subscriber = new Subscriber({ name: `${t.title}: ns subscriber`, namespace });
    let subscriber2 = new Subscriber({ name: `${t.title}: ns subscriber2`, namespace });

    async.each(
        [subscriber, subscriber2],
        (s, done) => s.sock.sock.on('connect', () => done()),
        (_) => process.nextTick(() => publisher.publish('test', { args: [1, 2, 5] }))
    );

    const tester = (done, req) => {
        t.deepEqual(req.args, [1, 2, 5]);

        done();
    };

    async.each(
        [subscriber, subscriber2],
        (s, done) => s.on('test', tester.bind(null, done)),
        (_) => {
            [publisher, subscriber, subscriber2].forEach((c) => c.close());

            t.end();
        }
    );
});

test.cb('Supports keys & namespaces', (t) => {
    let key = r.generate();
    let namespace = r.generate();

    t.plan(2);

    let publisher = new Publisher({ name: `${t.title}: kns publisher`, key, namespace });
    let subscriber = new Subscriber({ name: `${t.title}: kns subscriber`, key, namespace });
    let subscriber2 = new Subscriber({ name: `${t.title}: kns subscriber2`, key, namespace });

    async.each(
        [subscriber, subscriber2],
        (s, done) => s.sock.sock.on('connect', () => done()),
        (_) => publisher.publish('test', { args: [1, 2, 6] })
    );

    const tester = (done, req) => {
        t.deepEqual(req.args, [1, 2, 6]);

        done();
    };

    async.each(
        [subscriber, subscriber2],
        (s, done) => s.on('test', tester.bind(null, done)),
        (_) => {
            [publisher, subscriber, subscriber2].forEach((c) => c.close());

            t.end();
        }
    );
});

test.cb('Publisher throws unknown error', (t) => {
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

    let publisher = new Publisher({ name: `${t.title}: error throwing publisher`, key });
    publisher.sock.sock.on('bind', () => publisher.sock.sock.server.emit('error', new Error('unknown error')));
});

test.cb('Does not try to reconnect twice to the same publisher', (t) => {
    let key = r.generate();

    let subscriber = new Subscriber({ name: `${t.title}: keyed subscriber`, key });
    let publisher = new Publisher({ name: `${t.title}: keyed publisher`, key });

    publisher.sock.sock.on('connect', () => {
        const stub = sinon.stub(publisher.discovery, 'hello');

        setTimeout(() => {
            stub.restore();

            subscriber.on('cote:added', (obj) => {
                let alreadyConnected = subscriber.sock.sock.socks.some((s) => s.adv.id == obj.id);
                t.true(alreadyConnected);
                t.end();
            });
        }, 8000);
    });
});
