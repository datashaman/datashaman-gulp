const crypto = require('crypto')
const feather = require('feather-icons')
const fs = require('fs')
const nunjucks = require('nunjucks')
const nunjucksDate = require('nunjucks-date')
const yaml = require('js-yaml')


nunjucksDate.setDefaultFormat("YYYY-MM-DD hh:mm")

const nunjucksEnv = nunjucks.configure('./views')
nunjucksEnv.addFilter('date', nunjucksDate)

nunjucksEnv.addGlobal('document', id => {
    if (!loadedDocuments) {
        loadedDocuments = yaml.load(fs.readFileSync('documents.yml'))
    }

    return loadedDocuments[id]
})

nunjucksEnv.addGlobal('feather', id => {
    return feather.icons[id].toSvg()
})

let sourceData = null

const hash = crypto.createHash('md5').update('marlinf@datashaman.com').digest("hex");
const gravatar = `https://gravatar.com/avatar/${hash}`

module.exports = {
    author: {
        gravatar,
    },
    site: {
        title: 'datashaman',
        link: process.env.LINK || 'https://datashaman.com/',
    },
    nunjucksEnv,
}
