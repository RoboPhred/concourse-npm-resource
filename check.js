#!/usr/bin/env node


/*
TODO:
We should be checking versions against the passed in version.  Can use semver pkg for this.

Ignoring this for now, per the concourse docs:
[[
If your resource is unable to determine which versions are newer then the given version, then return the newest version of your resource.
]]
- https://concourse.ci/implementing-resources.html

*/

var exec = require("child_process").exec;

process.stdin.on("data", (chunk) => {
  const data = JSON.parse(chunk);
  const source = data.source || {};
  const version = data.version;
  
  const registry = removeQuotes(source.registry || null);
  const pkg = removeQuotes(source["package"] || null);
  
  if (typeof pkg !== "string") {
    console.error("Please specify `source.package`");
    process.exit(1);
  }
  
  var cmdLine = "npm info --json";
  
  if (registry) {
    cmdLine += ' --registry \"' + registry + '\"'; 
  }
  
  cmdLine += ' \"' + pkg + '\"';
  
  exec(cmdLine, (err, stdout, stderr) => {
    if (err) {
      console.error(err.stack);
      process.exit(1);
    }
    
    try {
      var info = JSON.parse(stdout);
    }
    catch(e) {
      console.error(e.stack);
      process.exit(1);
    }
    
    if (!Array.isArray(info.versions)) {
      console.error("no version information returned");
      process.exit(1);
    }
    
    var result = [];
    if (info.versions.length !== 0) {
      
      // HACK: Always return most recent until we support filtering by version number
      version = undefined;
      
      if (typeof version === "undefined") {
        // return most recent version
        var recent = info.versions[info.versions.length - 1];
        var result = [
          {"version": recent}
        ];
      }
      else {
        // Return list of versions from oldest to newest
        var filterNewer = newerThan.bind(null, version.version);
        result = info.versions.filter(filterNewer).map(x => { return {"version": x}});
      }
    }
    
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  });
});

// Returns true if target is newer than comparand.
function newerThan(comparand, target) {
  // TODO: use semvar
  return true;
}

function removeQuotes(str) {
  if (typeof str === "string") {
    return str.replace("\"", "");
  }
  return null;
}