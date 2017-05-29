import test from 'ava';
import LogSuppress from 'log-suppress';
import r from 'randomstring';
import async from 'async';

const environment = r.generate();
let { PendingBalancedRequester, Responder } = require('../')({ environment });

LogSuppress.init(console);

test('Supports environment', (t) => {
    t.is(PendingBalancedRequester.environment, `${environment}:`);
    t.is(Responder.environment, `${environment}:`);
});

test.cb('Supports simple req&res', (t) => {
    t.plan(1);

    let requester = new PendingBalancedRequester({ name: `${t.title}: simple requester` });
    let responder = new Responder({ name: `${t.title}: simple responder` });

    requester.send({ type: 'test', args: [1, 2, 3] });

    responder.on('test', (req) => {
        t.deepEqual(req.args, [1, 2, 3]);
        t.end();
    });
});

test.cb('Supports keys', (t) => {
    let key = r.generate();

    let requester = new PendingBalancedRequester({ name: `${t.title}: keyed requester`, key });
    let responder = new Responder({ name: `${t.title}: keyed responder`, key });

    requester.send({ type: 'test', args: [1, 2, 4] });

    responder.on('test', (req) => {
        t.deepEqual(req.args, [1, 2, 4]);
        t.end();
    });
});

test.cb('Supports namespaces', (t) => {
    let namespace = r.generate();

    let requester = new PendingBalancedRequester({ name: `${t.title}: ns requester`, namespace });
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

    let requester = new PendingBalancedRequester({ name: `PBR ${t.title}: kns requester`, key, namespace });
    let responder = new Responder({ name: `PBR ${t.title}: kns responder`, key, namespace });

    requester.send({ type: 'test', args: [1, 2, 6] });

    responder.on('test', (req) => {
        t.deepEqual(req.args, [1, 2, 6]);
        t.end();
    });
});

test.cb('Supports request balancing', (t) => {
    let key = r.generate();
    let namespace = r.generate();

    t.plan(30);

    let requester = new PendingBalancedRequester({ name: `PBR ${t.title}: kns requester`, key, namespace });
    let responder = new Responder({ name: `PBR ${t.title}: kns responder`, key, namespace });
    let responder2 = new Responder({ name: `PBR ${t.title}: kns responder 2`, key, namespace });
    let responder3 = new Responder({ name: `PBR ${t.title}: kns responder 3`, key, namespace });

    const responders = [responder, responder2, responder3];

    responders.forEach((r) => r.on('test', (req, cb) => {
        setTimeout(() => cb(req.args), Math.random() * 1000 + 50);
    }));

    async.timesLimit(30, 5,
        (time, done) => {
            requester.send({ type: 'test', args: [3, 2, time] }, (res) => {
                t.deepEqual(res, [3, 2, time]);

                done();
            });
        },
        (err, results) => {
            t.end();
        });
});
