var _ = require('lodash')
    , dropbox = require('dropbox')
    , http = require('http')
    , PATH = require('path')
    , URL = require('url')
    , q = require('q')
;
module.exports = {
    run: function(step, dexter) {
        var path = step.input('path').first()
            , urls = step.input('urls').toArray()
            , errors = []
            , self = this
        ;
        q.allSettled(_.map(urls, function(url) {
            var deferred = q.defer()
                , parsed = URL.parse(url)
                , name = PATH.basename(parsed.path)
                , finalPath = PATH.join(path, name)
                , request = http.get(url, function(resp) {
                    if(resp.statusCode < 400) {
                        deferred.resolve(self.files.put('dropbox', finalPath, resp))
                    } else {
                        deferred.reject(new Error('Invalid response for ' + url + ': ' + resp.statusCode));
                    }
                })
            ;
            request.on('error', function(err) {
                deferred.reject(err);
            });
            return deferred.promise; 
        }))
            .then(function(results) {
                var errors = [], successes = [];
                _.each(results, function(result) {
                    if(result.state == 'fulfilled') {
                        successes.push({ file: result.value });
                    } else {
                        if(result.reason instanceof Error) {
                            errors.push(result.reason.message);
                        } else {
                            errors.push(result.reason);
                        }
                    }
                });
                if(errors.length > 0) {
                    self.log('Failed uploading ' + errors.length + ' file(s)', {
                        errors: errors
                    });
                }
                self.complete(successes);
            })
            .fail(self.fail)
        ;
    }
};
