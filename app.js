
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path')
  , cons = require('consolidate')
  , tcxParser = require('tcxparse')
  , fs = require('fs')
;

var app = express()
  , secrets = JSON.parse(fs.readFileSync("secret.json", "utf8"))
;

app.locals.secrets = secrets;

// all environments
app.engine('dust', cons.dust);
app.set('port', process.env.EX_PORT || 80);
app.set('host', process.env.EX_HOST || 'dashr.net');
app.set('views', __dirname + '/views');
app.set('view engine', 'dust');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', function(req, res){ 
  res.render('index'); 
});

app.post('/uploadTCX', function(req, res) {
    //console.log(req.files);
    var file = req.files.tcx.path;
    if (!file) {
        file = req.files.tcx[req.files.tcx.length-1].path;
    }
    tcxParser.parseFile(file, function(err, tcx) {
        var details = tcx.getFootpodDetails();
        res.json(JSON.stringify(details));
        fs.unlinkSync(file);
    });
});

// run from command line or loaded as a module (for testing)
if (require.main === module) {
    var server = http.createServer(app);
    server.listen(app.get('port'), app.get('host'), function() {
        console.log('Express server listening on port ' + app.get('port'));
    });
} else {
    exports = module.exports = app;
}
