const crypto = require('crypto')

const domain = 'datashaman.com'
const email = 'marlinf@datashaman.com'

const hash = crypto
    .createHash('md5')
    .update(email)
    .digest('hex')

module.exports = {
    author: {
        link: 'https://datashaman.com/',
        name: 'Marlin Forbes',
        email,
        gravatar: `https://gravatar.com/avatar/${hash}`,
    },
    site: {
        id: '61fe02fd-9f59-4b20-88e1-d202dd9b8e06',
        domain,
        title: 'datashaman',
        subtitle: 'Freelance developer. Open-source solutions. Wannabe writer.',

        // Do not put a slash at the end here, it's added in views
        link: process.env.LINK || `https://${domain}`,

        drafts: Boolean(JSON.parse(process.env.DRAFTS || 'false')),
    },
}
