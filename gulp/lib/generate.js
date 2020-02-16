const log = require('fancy-log')
const through = require('through2')
const Vinyl = require('vinyl')
const yaml = require('js-yaml')

module.exports = () => {
    return through.obj(function(file, encoding, cb) {
        const source = yaml.load(file.contents.toString())

        Object.keys(source).forEach(id => {
            const sourceFile = source[id]
            const data = {
                contents: Buffer.from(sourceFile.contents),
                data: sourceFile.data,
                extname: sourceFile.extname,
                path: sourceFile.path,
            }
            this.push(new Vinyl(data))
        })

        cb()
    })
}
