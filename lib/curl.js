/**
 * Created by Ralph Varjabedian on 3/19/16.
 */

module.exports = function(req) {
  const ignore = ["authorization", "host", "connection", "content-length", "origin", "user-agent", "dnt", "accept-encoding", "accept-language"];
  var curlCommand = "curl -X " + (req.method);
  for(var header in req.headers) {
    if(ignore.indexOf(header) !== -1) {
      continue;
    }
    curlCommand += ' -H "' + header + ":" + req.headers[header] + '"';
  }
  var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  curlCommand += ' "' + fullUrl + '"';
  if(req.body) {
    curlCommand += ' -d ' + "'" + JSON.stringify(req.body) + "'";
  }
  return curlCommand;
};
