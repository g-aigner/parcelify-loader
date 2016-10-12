# parcelify-loader

A simple [webpack](https://github.com/webpack/webpack) loader that mimicks
the function of [parcelify](https://github.com/rotundasoftware/parcelify).

## tl;dr

```
$ npm install --save-dev parcelify-loader
```
[Documentation: using loaders](http://webpack.github.io/docs/using-loaders.html)

## Why is this necessary?

Some [browserify](http://browserify.org/)-based projects are relying on 
[parcelify](https://github.com/rotundasoftware/parcelify) to bundle necessary 
module stylesheets by reading values from an additional `style` property in the 
component's `package.json` file. Webpack relies on CommonJS import/require 
syntax, so it does not read bundling information from a package file.

## How does this work?

The loader reads from `package.json`, parses the `style` attribute and adds a 
virtual `require()` for the stylesheet to the in-mem version of the loaded 
javascript file.

## Configuration

You will need to configure `parcelify-loader` for the javascript source files 
in your `webpack.config.js`.

**Note**: you will also need an appropriate stylesheet loader, read more about 
it [here](https://webpack.github.io/docs/stylesheets.html).

### parcelify-loader

Apply `parcelify-loader` to the desired filetypes (preferably as a preloader, 
so it runs before all other transformations):

```javascript
module: {
    preLoaders: [
        {
            test: /\.js$/,
            loader: path.join(__dirname, "parcelify-loader"),
            include: [
                path.resolve("./src"),
                path.resolve("./node_modules/your-browserify-components") // e.g.
            ]
        }
    ]
}       
```
Make sure you include your compoment's source directory in `include`; otherwise, 
native styles for components will not be included.

(*Optional*) Configure `parcelify-loader` with project specific settings:

```javascript
// after module {} section in your `webpack.config.js`
parcelifyLoader: {
    json: "component.json"
}
```

## parcelify-loader API

The following settings can be configured for `parcelify-loader`:

* `json` - the filename of your component's json file. Default:
```javascript
parcelifyLoader: {
    json: "package.json"
}
``` 
* `encoding` - the encoding of your component's json file. See 
[list of encodings](https://github.com/nodejs/node/blob/master/lib/buffer.js) 
for supported encodings. Default:
```javascript
parcelifyLoader: {
    encoding: "utf8"
}
``` 
* `require` - the statement to wrap the required style file in. Note that 
this setting **must** have a `$1` parameter to work. Default:
```javascript
parcelifyLoader: {
    require: "require($1)"
}
```
* `lineBreakSeq` - the character sequence to render after `require`. Typically,
you will not need anything but the linebreak. Default:
```javascript
parcelifyLoader: {
    lineBreakSeq: "\n"
}
```
