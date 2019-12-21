// replays responses in the order that requests were recorded.

const express = require('express');
const fs = require('fs');
const http = require('http');
const util = require('util');
const recordUtil = require('./src/util');
const bodyParser = require('body-parser');
const cfg = require('./config');
const dataPath = cfg.dataPath + '/' + cfg.targetHost;
const manifestPath = dataPath + '/MANIFEST.txt';

const app = express();
const port = cfg.port;
const targetHost = cfg.targetHost;

const reloadData = function(path) {
  console.log('reloading replay data: ' + manifestPath);
  return fs.readFileSync(manifestPath).toString().split('\n');

}

let replayFileList = reloadData(manifestPath);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// reload the manifest (resets global var replayFileList)
app.get('/reload', function(req, res) {
  replayFileList = reloadData();
  res.sendStatus(200);
});

// just replay responses in the order we originally recorded them.
app.use('/', function(req, res) {
  console.log('url requested: ' + req.url);
  const replayFile = replayFileList.shift();
  if (!replayFile) {
    let msg = 'replay file empty. try GET /reload?';
    console.log(msg);
    res.set('content-type', 'text/html');
    res.status(404);
    res.send(msg);
    return;
  }
  if (!replayFile.includes(recordUtil.buildFilename(req.url, req.method) + '.')) {
    msg = req.method + ' request ' + req.url + ' did not match the next replay ' + replayFile;
    res.set('content-type', 'text/html');
    console.log(msg);
    res.status(404);
    res.send(msg);
    return;
  }
  const mockFile = dataPath + '/' + replayFile;
  console.log('file: ' + mockFile);

  fs.readFile(mockFile, 'utf8', function(err, file) {
    if (err) {
      console.log(err);
      res.set('content-type', 'text/html');
      res.status(404);
      res.send(err);
      return;
    } else {
      const mock = JSON.parse(file);

      res.set(mock.headers);
      res.set('content-encoding', 'identity');
      res.status(mock.statusCode);
      let data = mock.data;
      if (typeof data === 'object') {
        data = JSON.stringify(data);
      }
      // delay the response
      setTimeout( function(){
        res.send(data);
      }, cfg.delayMs);

    }

  });

});

app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.type('text/plain');
  res.status(500);
  res.send('500 - Server Error');
});

console.log('start server');
// HTTP
http.createServer(app).listen(port);
