var path = require("path")
var fs = require("fs")
var loaderUtils = require("loader-utils")

var defaults = {
    json: "package.json",
    encoding: "utf8",
    require: "require($1)"
}

module.exports = function(content) {
    // flag as cacheable, as long as the dependencies do not change -> no need
    // to re-invoke this loader
    this.cacheable()

    // read config
    var config = loaderUtils.getLoaderConfig(this, "parcelifyLoader")
    config.json = config.json || defaults.json
    config.encoding = config.encoding || defaults.encoding
    config.require = config.require || defaults.require
    config.lineBreakSeq = config.lineBreakSeq || defaults.lineBreakSeq

    // check recursively if there is a `package.json` in the module path or it's ancestors
    //NOTE: I need to find a package.json not only to read loader configs, but also to know the 
    //      module's' root path in order to resolve style paths, and the main script path so we only
    //      add styles from this main script and ignore every other script in the module. 
    var packageJsonDir = this.context;
    var packageJsonContent;
    while(!packageJsonContent) {
        var packageJson = path.resolve(packageJsonDir, config.json)
        try {
            packageJsonContent = fs.readFileSync(packageJson, config.encoding)
        } catch (readFileSyncError) {
            var parent = path.resolve(packageJsonDir, '..')
            if(parent === packageJsonDir) return content; //we have reached the root path
            else packageJsonDir = parent
            continue
        }
    }

    // parse JSON
    try {
        packageJsonContent = JSON.parse(packageJsonContent)
    } catch (parseError) {
        //module._processed.push(packageJsonDir)
        console.error(packageJson + " parsing failed: " + parseError)
        return content
    }

    //Look for the module main script
    var mainScript = path.resolve(packageJsonDir, (packageJsonContent.main || 'index.js'))

    //we only want to require styles once from the main script and not from every script in the module
    //also we need to be sure we found the right package.json and main script of this module 
    //so we only proceed if the path of the module being requested is the same as the main script path 
    //we calculated
    if(path.resolve(mainScript.replace(/\.js$/, '')) !== path.resolve(this.resourcePath.replace(/\.js$/, '')))
        return content

    //Look for module styles specified in config
    var styleFiles = []
    var configStyles = this.data.styles
    if(configStyles[this.resourcePath]) {
        styleFiles = configStyles[this.resourcePath]
    }
    //Look for a "style" field in package.json
    else if (packageJsonContent.style) { 
        styleFiles = packageJsonContent.style
    } 
    else return content;


    //Convert to absolute path/s.
    //NOTE: "style" field could be a file path string or an array of file paths
    //so we normalize to array
    styleFiles = [].concat(styleFiles).map(function(styleFile){
        return path.resolve(packageJsonDir, styleFile)
    })

    //ensure paths are valid files
    for(var i = 0; i < styleFiles.length; i++) {
        try {
            fs.accessSync(styleFiles[i])
        } catch (accessSyncError) {
            console.error("Cannot find " + styleFiles[i] + ": " + accessSyncError)
            return content
        }
    }

    //all good so far, add styleFiles to this loader's dependency
    for(var i = 0; i < styleFiles.length; i++) {
        this.dependency(styleFiles[i])

        // Finally, append `import` statement at the end of the original content
        // NOTE: this only adds the statement to the in-mem version of this content
        // file, the original file is NEVER altered
        var require = config.require
        require = require.replace("$1", JSON.stringify(styleFiles[i]))
        content = content + '\n' + require
    }

    return content;
}

//Resolve paths to modules with styles set in the config
module.exports.pitch = function(remainingRequest, precedingRequest, data) {

    var self = this
    //We need to resolve path to modules set in config only once and cache the result
    //in a variable 
    if(module._styles) {
        data.styles = module._styles
        return undefined
    }
    var callback = self.async()
    var config = loaderUtils.getLoaderConfig(self, "parcelifyLoader")
    var configStyles = config.styles || {}
    var resolveJobs = []
    //fill resolveJobs with resolve closures
    for(var styledMod in configStyles) {
        resolveJobs.push((function(styledMod) {
            return function(obj, done) {
                self.resolve(self.context, styledMod, function(err, styleModResolved){
                    if(styleModResolved) {
                        obj[styleModResolved] = configStyles[styledMod]
                        done()
                    }
                    else
                        done(new Error('Module with styles "' + styledMod + 
                            '" not found, please check the parcelify-loader configuration'))
                });
            }
        })(styledMod))
    }

    var result = {}
    var i = 0;
    function done(err){
        if(err) {
            console.warn(err.message)
            return;
        }
        
        if(resolveJobs.length > i+1) 
            resolveJobs[++i](result, done)
        else {
            module._styles = result
            data.styles = module._styles 
            callback()
        }
    }

    //Start resolving paths 
    resolveJobs[0](result, done)
}