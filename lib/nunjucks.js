const feather = require('feather-icons')
const fs = require('fs')
const markdown = require('nunjucks-markdown')
const marked = require('marked')
const metadata = require('./metadata')
const nunjucks = require('nunjucks')
const nunjucksDate = require('nunjucks-date')
const yaml = require('js-yaml')

// Don't delete this
let sourceData = null

nunjucksDate.setDefaultFormat('YYYY-MM-DD HH:mm Z')

const nunjucksEnv = nunjucks.configure('./views')
nunjucksEnv.addFilter('date', nunjucksDate)

nunjucksEnv.addGlobal('document', id => {
    if (!loadedDocuments) {
        loadedDocuments = yaml.load(
            fs.readFileSync(__dirname + '/../data/documents.yml')
        )
    }

    return loadedDocuments[id]
})

nunjucksEnv.addGlobal('feather', id => {
    return feather.icons[id].toSvg({
        height: 48,
        width: 48,
        'stroke-width': 1,
    })
})

nunjucksEnv.addGlobal('marked', marked)

Object.keys(metadata).forEach(key => {
    nunjucksEnv.addGlobal(key, metadata[key])
})

markdown.register(nunjucksEnv, marked)

module.exports = {
    nunjucksEnv,
}
