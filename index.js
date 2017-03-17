const path = require("path")
const fs = require("fs")
const loaderUtils = require("loader-utils")

const defaults = {
    json: "package.json",
    encoding: "utf8",
    require: "require($1)",
    lineBreakSeq: "\n"
}

module.exports = function(source, map) {
    // make async
    const callback = this.async()
    if (typeof callback !== "function") {
        throw new Error("Synchronous compilation is not supported.")
    }

    // avoid context problems
    const self = this

    // flag as cacheable, as long as the dependencies do not change -> no need
    // to re-invoke this loader
    self.cacheable()

    // read config
    const config = loaderUtils.getOptions(self) || {}
    config.json = config.json || defaults.json
    config.encoding = config.encoding || defaults.encoding
    config.require = config.require || defaults.require
    config.lineBreakSeq = config.lineBreakSeq || defaults.lineBreakSeq

    // check if there is a `package.json` and read its content
    const packageJson = path.resolve(self.context, config.json)
    fs.readFile(packageJson, config.encoding, (err, packageJsonContent) => {
        if (err) {
            // cannot read or no `package.json`
            callback(null, source, map)
            return
        }

        try {
            packageJsonContent = JSON.parse(packageJsonContent)
        } catch (parseError) {
            // cannot parse JSON
            console.log(packageJson+ " parsing failed: " + parseError)
            callback(null, source, map)
            return
        }

        if (!packageJsonContent.style) {
            // no "style" property
            callback(null, source, map)
            return
        }

        const styleFile = path.resolve(self.context, packageJsonContent.style)
        fs.access(styleFile, (err) => {
            if (err) {
                // cannot find given style file
                console.log("Cannot find " + styleFile + ": " + accessSyncError)
                callback(null, source, map)
                return
            }

            // all good so far, add styleFile and to this loader's dependency
            self.addDependency(styleFile)

            // Finally, add `import` statement to the original content
            // NOTE: this only adds the statement to the in-mem version of the
            // content file, the original file is NEVER altered
            let require = config.require
            require = require.replace("$1", JSON.stringify(styleFile))
            require += config.lineBreakSeq
            source = require + source
            
            // finally return
            callback(null, source, map)
        })
    })
}