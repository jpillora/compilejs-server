var express = require('express');
var request = require('request').defaults({pool: {maxSockets: 50}});

//500Kb
var MAX_SIZE = 500*1024;

var app = express();

app.use(express.logger("dev"));
app.use(app.router);

//file retriever via jsonp proxy
app.get('/retrieve', function(req, res) {
  var callback = req.query.callback || 'callback';

  res.write(callback+'({"body": "');

  var r = null, error = null, url = req.query.url;

  if(!url) error = 'No URL';

  try {
    r = request(url);
  } catch(err) {
    error = err.toString();
  }

  var total = 0;

  var kill = function(err) {
    error = err;
    end();
    r.abort();
  };

  var add = function(obj) {

    total += obj.length;

    if(total > MAX_SIZE)
      return kill('max size exceeded ('+MAX_SIZE/1024+'Kb)');

    var json = JSON.stringify(obj.toString());

    res.write(json.substr(1,json.length-2));
  };

  var end = function() {
    res.end('", "error":'+ (error ? JSON.stringify(error) : 'null') + '});\n');
  };

  if(error) return end();

  r.on('error', kill);
  r.on('data', add);
  r.on('end', end);
});

//file downloader via post replay
app.post('/download', function(req, res) {
  var filename = req.query.filename || 'file.js';
  var total = 0;

  res.set('Content-Disposition','attachment; filename="'+filename+'"');

  req.on('data', function(chunk) {
    total += chunk.length;
    if(total > MAX_SIZE) {
      res.end('>>>>> SIZE EXCEEDED!!!');
      req.abort();
      return;
    }
    var data = chunk.toString();

    if(data.indexOf('__compilejsDownload=') === 0)
      data = data.substr(20);

    res.write(unescape(data.replace(/\+/g, ' ')));
  });

  req.on('end', function() {
    res.end();
  });

});

var port = process.env.PORT || 3000;
app.listen(port);
console.log("Listening on " + port);
