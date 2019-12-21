// a simple http -> https reverse proxy that records responses

const express = require('express');
const app = express();
const http = require('http');
const https = require('https');
const httpProxy = require('http-proxy');
const fs = require('fs');
const util = require('util');
const recordUtil = require('./src/util');
const path = require('path');
const mkpath = require('mkpath');
const bodyParser = require('body-parser');
const cfg = require('./config');

const port = cfg.port;

const target = cfg.targetHost;
const mockPath = cfg.dataPath + '/' + recordUtil.urlToFilename(target);
mkpath.sync(mockPath);

var agent = new https.Agent({
  maxSockets: 1,
  keepAlive: false
});

var proxy = httpProxy.createServer({
  secure: false,
  changeOrigin: true,
  agent: agent
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(function(req, res){
  console.log('url requested: ' + req.url);
  proxy.web(req, res, { target: 'https://' + target });
});

var transactionCounters = {}; // transactions that appear

proxy.on('error', function(err, req, res) {
  console.log('ERROR: ' + req.url);
  console.log(util.inspect(err));
});
proxy.on('proxyRes', function(proxyRes, req, res) {
  console.log('response code', proxyRes.statusCode);
  recordUtil.recordResponse(req, proxyRes, mockPath, transactionCounters);
});
proxy.on('proxyReq', function(proxyReq, req, res) {
  let bodyData = JSON.stringify(req.body);
  let requestRecord = {
    requestTime: new Date(),
    requestUrl: req.url,
    headers: req.headers,
    data: req.body
  };
  //console.log(new Date() + ' request: ' + JSON.stringify(requestRecord, null, 4));

  proxyReq.setHeader('Content-Type','application/json');
  proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
  req.headers.host = target;
  // stream the content
  proxyReq.write(bodyData);
  fs.appendFile(mockPath + '/requests.log', '\nrequest: ' + JSON.stringify(requestRecord, null, 4), function(err) {
    if(err) {
      console.log(err);
    }
  });
});

http.createServer(app).listen(port);
