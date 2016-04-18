#!/usr/bin/env node
"use strict"
const exec = require("child_process").exec;
const fs = require("fs");
const tmp = require("tmp");
const path = require("path");
const readPkg = require("read-package-json");

process.stdin.on("data", (chunk) => {
  // node foo.js "/dest"
  if (process.argv.length < 3) {
    console.error("Please specify a directory");
    process.exit(1);
  }
  const dest = process.argv[2];
  // TODO: Make dir if not exists.  mkdirp
  process.cwd(dest);
  
  const data = JSON.parse(chunk);
  const source = data.source || {};
  const version = data.version;
  
  const registry = removeQuotes(source.registry || null);
  const pkg = removeQuotes(source["package"] || null);
  
  if (typeof pkg !== "string") {
    console.error("Please specify `source.package`");
    process.exit(1);
  }
  
  let cmdLine = 'npm install --quiet';
  
  // FIXME: This does not work.  Still installs target under node_modules.
  let topLevel = data.params && data.params.topLevel;
  if (topLevel) {
    cmdLine += ' --prefix \"' + dest + '\"';
  }
  
  if (registry) {
    cmdLine += ' --registry \"' + registry + '\"'; 
  }
  
  // TODO: param to explicitly enable/disable devDependencies
  
  cmdLine += ' \"' + pkg + '\"';
  
  console.log(cmdLine);
  exec(cmdLine, {cwd: dest}, (err, stdout, stderr) => {
    if (err) {
      console.error(err.stack);
      process.exit(1);
    }
    // Can't do this, as npm logs WARN to stderr
    // TODO: Need to check exit code, which needs something other than exec.
    // if (stderr !== null && stderr !== "") {
    //   // Assume error comes after out I suppose
    //   //  should stream this so we can interlace them.
    //   console.error(stdout);
    //   console.error(stderr);
    //   process.exit(1);
    // }
    
    let pkgJsonPath;
    if (topLevel) {
      pkgJsonPath = path.join(dest, "package.json");
    }
    else {
      // TODO: How does case sensitivity work in node modules.  If not case sensitive,
      //  this will cause issues.
      pkgJsonPath = path.join(dest, "node_modules", pkg, "package.json");
    }
        
    // Query the package.json for version info.
    //  We may want to npm info the package for version metadata later.
    const pkgContents = readPkg(pkgJsonPath, (err, data) => {
      if (err) {
        console.error(err.stack);
        process.exit(1);
      }
      
      const result = { };
      if (typeof data.version !== "undefined") {
        result.version = data.version;
      }
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    });
  });
});

function removeQuotes(str) {
  if (typeof str === "string") {
    return str.replace("\"", "");
  }
  return null;
}