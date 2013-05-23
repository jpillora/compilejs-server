var express = require('express');
var request = require('request').defaults({pool: {maxSockets: 50}});

//500Kb
var MAX_SIZE = 500*1024;

var app = express();

app.use(app.router);

//file retriever via jsonp proxy
app.get('/retrieve', function(req, res) {
  var callback = req.query.callback || 'callback';

  var url = req.query.url;
  if(!url)
    return res.send(400,'No URL\n');
  var r = null;
  try {
    r = request(url);
  } catch(e) {
    return res.send(400,'Invalid URL\n');
  }

  var total = 0;
  res.write(callback+'("');
  r.on('data', function(chunk) {
    total += chunk.length;
    if(total > MAX_SIZE) {
      res.end('>>>>> SIZE EXCEEDED!!!');
      r.abort();
      return;
    }
    res.write(chunk.toString()
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
    );
  });
  r.on('end', function() {
    res.end('");\n');
  });
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

app.listen(3000);
console.log("Listening 3000");
