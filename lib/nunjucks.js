const crypto = require('crypto')
const feather = require('feather-icons')
const fs = require('fs')
const markdown = require('nunjucks-markdown')
const marked = require('marked')
const nunjucks = require('nunjucks')
const nunjucksDate = require('nunjucks-date')
const yaml = require('js-yaml')

nunjucksDate.setDefaultFormat('YYYY-MM-DD hh:mm')

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

markdown.register(nunjucksEnv, marked)

let sourceData = null

const hash = crypto
    .createHash('md5')
    .update('marlinf@datashaman.com')
    .digest('hex')
const gravatar = `https://gravatar.com/avatar/${hash}`
const domain = 'datashaman.com'
const link = process.env.LINK

module.exports = {
    author: {
        link: 'https://datashaman.com/',
        name: 'Marlin Forbes',
        email: 'marlinf@datashaman.com',
        gravatar,
    },
    site: {
        id: '61fe02fd-9f59-4b20-88e1-d202dd9b8e06',
        domain,
        title: 'datashaman',
        subtitle: 'Freelance developer. Open-source solutions. Wannabe writer.',

        // Do not put a slash at the end here, it's added in views
        link: process.env.LINK || `https://${domain}`,
    },
    nunjucksEnv,
}
