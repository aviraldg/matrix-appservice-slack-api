// @flow

import express from 'express';
import bodyParser from 'body-parser';
import marked from 'marked';
import {Cli, Bridge, AppServiceRegistration} from 'matrix-appservice-bridge';

let bridge = null;

new Cli({
    registrationPath: 'matrix-appservice-slack-api.yaml',
    generateRegistration: (reg: AppServiceRegistration, callback) => {
        reg.setId(AppServiceRegistration.generateToken());
        reg.setHomeserverToken(AppServiceRegistration.generateToken());
        reg.setAppServiceToken(AppServiceRegistration.generateToken());
        reg.setSenderLocalpart('slack-api');
        callback(reg);
    },
    run: (port, config) => {
        bridge = new Bridge({
            homeserverUrl: 'http://localhost:8008',
            domain: 'localhost',
            registration: 'matrix-appservice-slack-api.yaml',
            controller: {
                onEvent: (event) => {
                    console.log(event);
                },
                onUserQuery: () => {
                    return {};
                }
            }
        });
        bridge.run(port, config);
    }
}).run();


const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());


const LINK_REGEX = /<([^|]+)(\|([^>]+))?>/g;

function webhookHandler(request, response) {
    const {body, params} = request;
    const {roomId} = params;
    console.log(body);
    const {username, text, channel} = body.payload ? JSON.parse(body.payload) : body;

    const markdownBody = text.replace(LINK_REGEX, '[$3]($1)');
    const htmlBody = marked(markdownBody);

    const intent = bridge.getIntent();
    intent.sendMessage(roomId, {
        format: 'org.matrix.custom.html',
        formatted_body: htmlBody,
        body: markdownBody,
        msgtype: 'm.text'
    });

    response.json({
        markdownBody,
        htmlBody
    });
}

app.post('/hooks/:roomId', webhookHandler);
app.listen(8000);
