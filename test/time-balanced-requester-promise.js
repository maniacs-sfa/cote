import test from 'ava';
import LogSuppress from 'log-suppress';
import r from 'randomstring';
import async from 'async';

const environment = r.generate();
let { TimeBalancedRequester, Responder } = require('../')({ environment });

LogSuppress.init(console);

test.cb('Supports multiple responders with promise and disconnection', (t) => {
    let key = r.generate();

    let requester = new TimeBalancedRequester({ name: `${t.title}: keyed requester`, key });
    let responder = new Responder({ name: `${t.title}: keyed responder`, key });
    let responder2 = new Responder({ name: `${t.title}: keyed responder2`, key });
    let responder3 = new Responder({ name: `${t.title}: keyed responder3`, key });
    let responder4 = new Responder({ name: `${t.title}: keyed responder4`, key });

    requester.CALCULATION_TIMEOUT = 1000;

    const responders = [responder, responder2, responder3, responder4];

    responder4.sock.on('connect', () => {
        responder3.close();
    });

    responders.forEach((r) => r.on('test', (req) => {
        return new Promise((resolve, reject) => {
            let handler = resolve;
            if (req.args.slice(-1) % 3) handler = reject;

            setTimeout(() => handler(req.args), Math.random() * 1000 + 500);
        });
    }));

    async.timesLimit(30, 5, (time, done) => {
        if (time == 10) responder.close();

        requester.send({ type: 'test', args: [5, 2, time] })
            .then(() => done())
            .catch(() => done());
    }, (err, results) => {
        responders.forEach((r) => r.close());
        requester.close();
        t.end();
    });
});
