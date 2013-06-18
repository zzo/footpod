var http = require('http')
    , fs   = require('fs')
    , webdriverjs = require('webdriverjs')
    , assert = require('assert')
;

//
// 1. Get client-side CC 
// 2. POST it back to /coverage/client
// 3. GET & save /coverage/object
// 4. When all tests are done 'instanbul report ...' them
function saveCoverage(client) {
    client.url(function(err, url) {
        console.log('GOT URL: ' + url);
    });
    client.execute("return JSON.stringify(__coverage__);" , null, function(err, result) {
        if (err) return;  // guess they don't got coverage

        // now post the client-side coverage back to '/client'
                //  there MUST be a better way to get this
        var options = {
                hostname: process.env.EX_HOST
                , port: process.env.EX_PORT
                , path: '/coverage/client'
                , method: 'POST'
                , headers: {
                    'Content-type': 'application/json'
                }
            }
            , req = http.request(options, function(res) {
                // now download full CC
                options.method = 'GET';
                options.headers = {};
                options.path = '/coverage/object';
                var dlReq = http.request(options, function(res) {
                      var output = fs.createWriteStream(outputTmpl + currentX++ + '.json');
                      res.pipe(output);
                });
                dlReq.end();
            });

        req.end(result.value); // POST client code coverage
    });
}


describe('login tests', function() {
    var client = {};

    jasmine.DEFAULT_TIMEOUT_INTERVAL = 9999999;

    beforeEach(function(done) {
        client = webdriverjs.remote({ desiredCapabilities: {browserName: 'firefox'} });
        client.init().url("http://" + process.env.EX_HOST + ":" + process.env.EX_PORT, done);
    });

    afterEach(function(done) {
        if (process.env.COVERAGE) {
            saveCoverage(client);
        }
        client.end(done);
    });

    it("lets me submit a file", function(done) {
        client
            .pause(500)
            .click('.btn-file')
            .pause(6000)
            .setValue('.fileupload-preview', 'foobie')
            .call(done)
        ;
    });
});
