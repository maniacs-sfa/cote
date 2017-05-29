import test from 'ava';
import LogSuppress from 'log-suppress';
import r from 'randomstring';
import async from 'async';

const environment = r.generate();
let { TimeBalancedRequester, Responder } = require('../')({ environment });

LogSuppress.init(console);

test('Supports environment', (t) => {
    t.is(TimeBalancedRequester.environment, `${environment}:`);
    t.is(Responder.environment, `${environment}:`);
});

test.cb('Supports simple req&res', (t) => {
    t.plan(1);

    let requester = new TimeBalancedRequester({ name: `${t.title}: simple requester` });
    let responder = new Responder({ name: `${t.title}: simple responder` });

    requester.send({ type: 'test', args: [1, 2, 3] });

    responder.on('test', (req) => {
        t.deepEqual(req.args, [1, 2, 3]);
        t.end();
    });
});

test.cb('Supports keys & namespaces', (t) => {
    let key = r.generate();
    let namespace = r.generate();

    let requester = new TimeBalancedRequester({ name: `TBR ${t.title}: kns requester`, key, namespace });
    let responder = new Responder({ name: `TBR ${t.title}: kns responder`, key, namespace });

    requester.send({ type: 'test', args: [1, 2, 6] });

    responder.on('test', (req) => {
        responder.close();
        requester.close();
        t.deepEqual(req.args, [1, 2, 6]);
        t.end();
    });
});

