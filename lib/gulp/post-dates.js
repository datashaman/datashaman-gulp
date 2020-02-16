const log = require('fancy-log')
const plugins = require('gulp-load-plugins')()

module.exports = () => {
    return plugins.rename(path => {
        if (path.dirname === 'posts') {
            const result = path.basename.match(/^(?<year>[0-9]{4})-(?<month>[0-9]{2})-(?<day>[0-9]{2})-(?<slug>.*)$/)

            if (result) {
                const { groups: { year, month, day, slug }} = result

                path.dirname = `${year}/${month}/${day}/${slug}`
                path.basename = 'index'
                path.extname = '.md'
            }
        }
    })
}
