const nunjucks = require('nunjucks')
const nunjucksDate = require('nunjucks-date')

nunjucksDate.setDefaultFormat("YYYY-MM-DD hh:mm")

const nunjucksEnv = nunjucks.configure('./views')
nunjucksEnv.addFilter('date', nunjucksDate)

module.exports = {
    site: {
        link: 'https://datashaman.com',
        title: 'datashaman',
    },
    nunjucksEnv,
}
