'use strict';

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _marked = require('marked');

var _marked2 = _interopRequireDefault(_marked);

var _matrixAppserviceBridge = require('matrix-appservice-bridge');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// @flow

var bridge = null;

new _matrixAppserviceBridge.Cli({
    registrationPath: 'matrix-appservice-slack-api.yaml',
    generateRegistration: function generateRegistration(reg /*: AppServiceRegistration*/, callback) {
        reg.setId(_matrixAppserviceBridge.AppServiceRegistration.generateToken());
        reg.setHomeserverToken(_matrixAppserviceBridge.AppServiceRegistration.generateToken());
        reg.setAppServiceToken(_matrixAppserviceBridge.AppServiceRegistration.generateToken());
        reg.setSenderLocalpart('slack-api');
        callback(reg);
    },
    run: function run(port, config) {
        bridge = new _matrixAppserviceBridge.Bridge({
            homeserverUrl: 'http://localhost:8008',
            domain: 'localhost',
            registration: 'matrix-appservice-slack-api.yaml',
            controller: {
                onEvent: function onEvent(event) {
                    console.log(event);
                },
                onUserQuery: function onUserQuery() {
                    return {};
                }
            }
        });
        bridge.run(port, config);
    }
}).run();

var app = (0, _express2.default)();
app.use(_bodyParser2.default.json());
app.use(_bodyParser2.default.urlencoded());

var LINK_REGEX = /<([^|]+)(\|([^>]+))?>/g;

function webhookHandler(request, response) {
    var body = request.body;
    var params = request.params;
    var roomId = params.roomId;

    console.log(body);

    var _ref = body.payload ? JSON.parse(body.payload) : body;

    var username = _ref.username;
    var text = _ref.text;
    var channel = _ref.channel;


    var markdownBody = text.replace(LINK_REGEX, '[$1]($2)');
    var htmlBody = (0, _marked2.default)(text);

    var intent = bridge.getIntent();
    intent.sendMessage(roomId, {
        format: 'org.matrix.custom.html',
        formatted_body: htmlBody,
        body: markdownBody,
        msgtype: 'm.text'
    });

    response.json({
        markdownBody: markdownBody,
        htmlBody: htmlBody
    });
}

app.post('/hooks/:roomId', webhookHandler);
app.listen(8000);