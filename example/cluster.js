var sticky = require('../');
var cluster = require('cluster');
var port = 3000;
var http = require('http');

var createServer = function () {
    return http.createServer(function(req, res) {
      var worker = "worker "+(cluster.isMaster ? 'master' : cluster.worker.id);
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('Hello World! From ' + worker
        + " x-forwarded-for=" + req.headers['x-forwarded-for']
        + ' with pid: ' + process.pid + ' \n');
      var msg = worker + ": x-forwarded-for=" + req.headers['x-forwarded-for'];
      console.log(msg);
    });
};

var stickyOptions = {
  num: 2,
  proxy: true //activate layer 4 patching
}

var server = sticky(stickyOptions, createServer).listen(port, function() {
    console.log('Sticky cluster worker '
      + (cluster.worker ? cluster.worker.id : 'master')
      + ' server listening on port ' + port);
});
