// helper functions to process requests/responses.

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

var exports = module.exports = {};

function uncompress(res, callback) {
  const contentEncoding = res.headers['content-encoding'];

  let stream = res;

  if (contentEncoding === 'gzip') {
    stream = zlib.createGunzip();
    res.pipe(stream);
  } else if (contentEncoding === 'deflate') {
    stream = zlib.createInflate();
    res.pipe(stream);
  }

  let buffer = [];
  stream.on('data', function(data) {
    buffer.push(data.toString());
  }).on('end', function() {
    callback(res, buffer.join(''));
  }).on('error', function(e) {
    console.error('An error occurred during decompression: ' + e);
  });
}

function parseJsonResponse(res, data) {
  const contentType = res.headers['content-type'];
  if (_.includes(contentType, 'json') || _.includes(contentType, 'javascript')) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Could not parse JSON for response of ' + res.req.path);
    }
  }
  return data;
}

/**
 * @param {Object} req
 * @param {Object} res
 * @param {String} prePath
 */
exports.recordResponse = function(req, res, prePath, transactionCounters) {
  uncompress(res, function(res, data) {
    let response = {
      requestUrl: res.req.path,
      headers: res.headers,
      statusCode: res.statusCode,
      data: parseJsonResponse(res, data)
    };

    let counter;
    const requestLabel = buildFilename(res.req.path, req.method);
    if (requestLabel in transactionCounters) {
      counter = transactionCounters[requestLabel] + 1;
    } else {
      counter = 1;
    }
    transactionCounters[requestLabel] = counter;

    const fileName = requestLabel + '.' + counter.toString();
    const filePath = path.join(prePath, fileName);
    const manifestPath = path.join(prePath, 'MANIFEST.txt');
    let respData = JSON.stringify(response, null, 2);
    //console.log('response: ' + respData);
    fs.appendFile(prePath + '/requests.log', '\nresponse: ' + JSON.stringify(response, null, 2), function(err) {
      if(err) {
        console.log(err);
      }
    });
    fs.writeFile(filePath, respData, function(err) {
      if(err) {
        console.log(err);
      }
      fs.appendFile(manifestPath, fileName + '\n', function(err) {
        if(err) {
          console.log(err);
        }
      });
    });

    console.error('Serialized response for ' + res.req.path + ' to ' + filePath);

  });
};

const buildFilename = function(url, method) {
  return method + urlToFilename(url);
};

const urlToFilename = function(url) {
  return url.replace(/[^A-Za-z0-9_.]/g, '_');
};

exports.buildFilename = buildFilename;
exports.urlToFilename = urlToFilename;
