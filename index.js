var path = require("path")
var fs = require("fs")
var loaderUtils = require("loader-utils")

var defaults = {
    json: "package.json",
    encoding: "utf8",
    require: "require($1)",
    lineBreakSeq: "\n"
}

module.exports = function(content) {
    // flag as cacheable, as long as the dependencies do not change -> no need
    // to re-invoke this loader
    this.cacheable()

    // read config
    var config = loaderUtils.getLoaderConfig(this, "parcelifyLoader");
    config.json = config.json || defaults.json
    config.encoding = config.encoding || defaults.encoding
    config.require = config.require || defaults.require
    config.lineBreakSeq = config.lineBreakSeq || defaults.lineBreakSeq

    // check recursively if there is a `package.json` in the module path or it's ancestors
    var packageJsonDir = this.context;
    var packageJsonContent;
    while(!packageJsonContent) {
        var packageJson = path.resolve(packageJsonDir, config.json)
        try {
            packageJsonContent = fs.readFileSync(packageJson, config.encoding)
        } catch (readFileSyncError) {
            var parent = path.resolve(packageJsonDir, '..');
            if(parent === packageJsonDir) break; //we have reached the root path
            else packageJsonDir = parent;
            continue;
        }
    }

    if(!packageJsonContent)
        // cannot read `package.json`, return
        return content

    // parse JSON
    try {
        packageJsonContent = JSON.parse(packageJsonContent)
    } catch (parseError) {
        console.log(packageJson+ " parsing failed: " + parseError)
        return content
    }
    
    // if there is a "style" property, ensure it is a file
    if (packageJsonContent.style === undefined) return content
    var styleFile = path.resolve(packageJsonDir, packageJsonContent.style)
    try {
        fs.accessSync(styleFile)
    } catch (accessSyncError) {
        console.log("Cannot find " + styleFile + ": " + accessSyncError)
        return content
    }

    // all good so far, add styleFile and to this loader's dependency
    this.dependency(styleFile)

    // Finally, add `import` statement to the original content
    // NOTE: this only adds the statement to the in-mem version of this content
    // file, the original file is NEVER altered
    var require = config.require
    require = require.replace("$1", JSON.stringify(styleFile))
    require += config.lineBreakSeq
    content = require + content

    return content
}