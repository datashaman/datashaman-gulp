const through = require('through2')

module.exports = () => {
    return through.obj((file, encoding, cb) => {
        const contents = file.isBuffer()
            ? file.contents.toString()
            : file.contents
        const parts = contents.split(/\s*\<!--more--\>/)

        if (parts.length > 1) {
            file.data.summary = parts[0]
        }

        cb(null, file)
    })
}
