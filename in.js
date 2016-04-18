#!/usr/bin/env node
"use strict"
const exec = require("child_process").exec;
const fs = require("fs");
const path = require("path");

const readPkg = require("read-package-json");
const tmp = require("tmp");
const rimraf = require("rimraf");

tmp.setGracefulCleanup();


/*
TODO: When topLevel param is specified, we should download the package using http then run npm install on it.
  How will this integrate with auth and custom registries and such?
*/

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
    
  if (registry) {
    cmdLine += ' --registry \"' + registry + '\"'; 
  }
  
  // TODO: param to explicitly enable/disable devDependencies
  
  cmdLine += ' \"' + pkg + '\"';
  
  let topLevel = data.params && data.params.top_level;
  
  let installTo = dest;
  if (topLevel) {
    const dirData = tmp.dirSync();
    installTo = dirData.name;
  }
  
  exec(cmdLine, {cwd: installTo}, (err, stdout, stderr) => {
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
      // TODO: How does case sensitivity work in node modules.  If not case sensitive,
      //  using pkg in folder names will cause issues.
      
      
      // Copy specific package.
      // FIXME: This leaves behind bits in node_modules/.bin if the package
      //  defines any.
      const packagePath = path.join(installTo, "node_modules", pkg);
      moveAll(packagePath, dest);
      fs.rmdirSync(packagePath);
      
      // Copy rest of the dependencies.
      // TODO: May cause dependency clashes?  Shouldn't in npm 3,
      //  as it usually treats folder as cannon what we are installing, and clashes go into the dep's folder.
      //  Is this consistent?  Need to confirm...
      const depPath = path.join(installTo, "node_modules");
      moveAll(depPath, path.join(dest, "node_modules"));
    }
    
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

function moveAll(src, dest) {
  let destExists = false;
  try {
    if (fs.statSync(dest).isDirectory()) {
      destExists = true;
    }
  }
  catch(e) {
    if (e.code !== "ENOENT") {
      throw e;
    }
  }
  
  if (!destExists) {
    fs.mkdirSync(dest);
  }
  
  const targets = fs.readdirSync(src);
  for(let i = 0; i < targets.length; i++) {
    const target = targets[i];
    const p = path.join(src, target);
    const d = path.join(dest, target);
    fs.renameSync(p, d);
  }
}