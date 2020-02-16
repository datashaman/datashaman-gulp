const crypto = require('crypto')
const feather = require('feather-icons')
const fs = require('fs')
const markdown = require('nunjucks-markdown')
const marked = require('marked')
const nunjucks = require('nunjucks')
const nunjucksDate = require('nunjucks-date')
const yaml = require('js-yaml')

nunjucksDate.setDefaultFormat("YYYY-MM-DD hh:mm")

const nunjucksEnv = nunjucks.configure('./views')
nunjucksEnv.addFilter('date', nunjucksDate)

nunjucksEnv.addGlobal('document', id => {
    if (!loadedDocuments) {
        loadedDocuments = yaml.load(fs.readFileSync(__dirname + '/../var/documents.yml'))
    }

    return loadedDocuments[id]
})

nunjucksEnv.addGlobal('feather', id => {
    return feather.icons[id].toSvg()
})

markdown.register(nunjucksEnv, marked)

let sourceData = null

const hash = crypto.createHash('md5').update('marlinf@datashaman.com').digest("hex");
const gravatar = `https://gravatar.com/avatar/${hash}`

module.exports = {
    author: {
        link: process.env.LINK || 'https://datashaman.com/',
        name: 'Marlin Forbes',
        email: 'marlinf@datashaman.com',
        gravatar,
    },
    site: {
        title: 'datashaman',
        subtitle: 'Freelance developer. Open-source solutions. Wannabe writer.',
        link: process.env.LINK || 'https://datashaman.com',
    },
    nunjucksEnv,
}
