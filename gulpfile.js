require('dotenv').config()

const browserSync = require('browser-sync').create()
const collect = require('collect.js')
const del = require('del')
const fetch = require('node-fetch')
const fs = require('fs')
const generate = require('./lib/gulp/generate')
const gulp = require('gulp')
const gulpIf = require('gulp-if')
const log = require('fancy-log')
const metadata = require('./lib/metadata')
const more = require('./lib/gulp/more')
const nunjucks = require('./lib/nunjucks')
const path = require('path')
const plugins = require('gulp-load-plugins')()
const postDates = require('./lib/gulp/post-dates')
const sink = require('lead')
const through = require('through2')
const yaml = require('js-yaml')
const {v1: uuidv1} = require('uuid')

const paths = {
    documents: ['./src/**/*.md'],
    scripts: './src/scripts/main.js',
    styles: ['./src/styles/*.scss'],
}

const FEED_LIMIT = 30
const PAGE_LIMIT = 6
const TAGS_LIMIT = 1

function paginate(arr, perPage) {
    const pages = []
    const total = arr.length

    if (!metadata.site.drafts) {
        arr = arr.filter(post => post.draft !== true)
    }

    while (arr.length) {
        pages.push(arr.splice(0, perPage))
    }

    return {
        total,
        perPage,
        pages,
    }
}

const clean = () => {
    return del(['./build', './data/documents.yml'])
}

const scripts = () => {
    return gulp.src(paths.scripts).pipe(gulp.dest('./build/scripts'))
}

const styles = () => {
    return gulp
        .src(paths.styles)
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.sass())
        .pipe(plugins.cleanCss())
        .pipe(plugins.sourcemaps.write())
        .pipe(gulp.dest('./build/styles'))
        .pipe(browserSync.stream())
}

const mentions = cb => {
    const filename = './data/mentions.json'
    const token = process.env.WEBMENTION_TOKEN
    let url = `https://webmention.io/api/mentions.jf2?domain=${metadata.site.domain}&token=${token}`

    let mentions = fs.existsSync(filename)
        ? JSON.parse(fs.readFileSync(filename))
        : null

    let sinceId = mentions ? collect(mentions.children).max('wm-id') : null

    if (sinceId) {
        url += `&since_id=${sinceId}`
    }

    fetch(url)
        .then(res => {
            if (res.ok) {
                return res
            }

            throw Error(res.statusText)
        })
        .then(res => res.json())
        .then(responseMentions => {
            if (mentions) {
                mentions.children = mentions.children.concat(
                    responseMentions.children
                )
            } else {
                mentions = responseMentions
            }

            fs.writeFile(filename, JSON.stringify(mentions, null, 2), cb)
        })
        .catch(err => {
            log.error(err)

            cb(err, null)
        })
}

const documents = () => {
    // Don't remove this, see lib/nunjucks.js
    loadedDocuments = null

    let documents = {}
    let feed = []
    let mentions = collect(
        JSON.parse(fs.readFileSync('./data/mentions.json')).children
    ).sortByDesc(child => child.published)
    let tags = {}
    let urls = []

    return gulp
        .src(paths.documents)
        .pipe(
            plugins.frontMatter({
                property: 'data',
                remove: true,
            })
        )
        .pipe(more())
        .pipe(postDates())
        .pipe(
            through.obj((file, encoding, cb) => {
                file.data = Object.assign(
                    {url: '/' + file.relative.replace(/index\..+$/, '')},
                    file.data || {}
                )
                cb(null, file)
            })
        )
        .pipe(
            sink(
                through.obj(
                    (file, encoding, cb) => {
                        uid = uuidv1()

                        if (!file.data.category) {
                            file.data.category = []
                        }

                        if (!Array.isArray(file.data.category)) {
                            file.data.category = [file.data.category]
                        }

                        file.data.category = file.data.category.map(category =>
                            category.toLowerCase()
                        )

                        if (file.data.published) {
                            file.data.published = new Date(file.data.published)
                        } else {
                            file.data.published = new Date()
                        }

                        if (file.data.type === 'page') {
                            urls.push({
                                uid,
                                priority: '0.8000',
                            })
                        }

                        if (file.data.type === 'entry') {
                            feed.push({
                                uid,
                                published: file.data.published,
                            })
                            urls.push({
                                uid,
                                priority: '0.6000',
                            })

                            const url = `${metadata.site.link}${file.data.url}`

                            file.data.mentions = mentions
                                .where('wm-target', url)
                                .all()
                        }

                        documents[uid] = {
                            uid,
                            extname: file.extname,
                            path: file.path.replace(file.base + '/', ''),
                            data: file.data,
                            contents: file.contents.toString().trim(),
                        }

                        file.data.category.forEach(tag => {
                            if (typeof tags[tag] === 'undefined') {
                                tags[tag] = []
                            }

                            tags[tag].push({
                                published: file.data.published,
                                uid,
                            })
                        })

                        cb(null, file)
                    },
                    function(cb) {
                        Object.keys(tags).forEach(tag => {
                            tags[tag].sort((a, b) => b.published - a.published)
                            let pagination = paginate(
                                tags[tag].map(defn => defn.uid),
                                PAGE_LIMIT
                            )

                            pagination.pages.forEach((page, index) => {
                                const pageUid = uuidv1()

                                documents[pageUid] = {
                                    uid: pageUid,
                                    extname: '.md',
                                    path: index
                                        ? `tags/${tag}/page/${index +
                                              1}/index.md`
                                        : `tags/${tag}/index.md`,
                                    data: {
                                        posts: {
                                            items: page,
                                            total: pagination.total,
                                            currentPage: index + 1,
                                            lastPage: pagination.pages.length,
                                            perPage: pagination.perPage,
                                        },
                                        tag,
                                        title: tag,
                                        url: index
                                            ? `/${tag}/page/${index + 1}/`
                                            : `/${tag}/`,
                                        type: 'tag',
                                    },
                                    contents: '',
                                }

                                urls.push({
                                    uid: pageUid,
                                    priority: '0.7000',
                                })
                            })

                            pagination = paginate(
                                tags[tag].map(defn => defn.uid),
                                TAGS_LIMIT
                            )

                            tags[tag] = {
                                items: pagination.pages[0],
                                lastPage: pagination.pages.length,
                                total: pagination.total,
                            }
                        })

                        let pageUid = uuidv1()

                        tags = Object.keys(tags)
                            .sort()
                            .reduce((acc, tag) => {
                                acc[tag] = tags[tag]

                                return acc
                            }, {})

                        documents[pageUid] = {
                            uid: pageUid,
                            extname: '.md',
                            path: 'tags/index.md',
                            data: {
                                tags,
                                title: 'Tags',
                                url: '/tags/',
                                type: 'tags',
                            },
                            contents: '',
                        }

                        urls.push({
                            uid: pageUid,
                            priority: '0.8000',
                        })

                        feed = feed
                            .sort((a, b) => b.published - a.published)
                            .map(post => post.uid)

                        pageUid = uuidv1()

                        documents[pageUid] = {
                            uid: pageUid,
                            extname: '.xml',
                            path: 'feed.xml',
                            data: {
                                entries: feed.slice(0, FEED_LIMIT),
                                url: '/feed.xml',
                                type: 'feed',
                            },
                            contents: '',
                        }

                        const pagination = paginate(feed, PAGE_LIMIT)

                        pagination.pages.forEach((page, index) => {
                            const pageUid = uuidv1()

                            documents[pageUid] = {
                                uid: pageUid,
                                extname: '.md',
                                path: index
                                    ? `page/${index + 1}/index.md`
                                    : 'index.md',
                                data: {
                                    posts: {
                                        items: page,
                                        total: pagination.total,
                                        currentPage: index + 1,
                                        lastPage: pagination.pages.length,
                                        perPage: pagination.perPage,
                                    },
                                    title: index ? `Page ${index + 1}` : '',
                                    url: index ? `/page/${index + 1}/` : '/',
                                    type: 'home',
                                },
                                contents: '',
                            }

                            if (!index) {
                                urls.push({
                                    uid: pageUid,
                                })
                            }
                        })

                        pageUid = uuidv1()

                        documents[pageUid] = {
                            uid: pageUid,
                            extname: '.xml',
                            path: 'sitemap.xml',
                            data: {
                                urls,
                                url: '/sitemap.xml',
                                type: 'sitemap',
                            },
                            contents: '',
                        }

                        const contents = yaml.dump(documents)
                        fs.writeFile('./data/documents.yml', contents, cb)
                    }
                )
            )
        )
}

const generateDocuments = () => {
    return gulp
        .src('./data/documents.yml')
        .pipe(generate())
        .pipe(
            gulpIf(file => {
                return file.extname === '.md'
            }, plugins.markdown())
        )
        .pipe(
            plugins.wrap(
                data => {
                    return fs
                        .readFileSync('./views/' + data.type + '.njk')
                        .toString()
                },
                nunjucks,
                {engine: 'nunjucks'}
            )
        )
        .pipe(gulp.dest('./build'))
}

const watch = cb => {
    browserSync.init({
        server: {
            baseDir: 'build',
        },
    })

    // gulp.watch(paths.scripts, gulp.series(scripts))
    gulp.watch(paths.styles, gulp.series(styles))

    const watchPaths = ['./views/**/*.njk'].concat(paths.documents)
    gulp.watch(
        watchPaths,
        gulp.series(
            clean,
            styles,
            scripts,
            mentions,
            documents,
            generateDocuments
        )
    ).on('change', browserSync.reload)

    cb()
}

exports.build = gulp.series(
    clean,
    styles,
    scripts,
    mentions,
    documents,
    generateDocuments
)
exports.documents = documents
exports.clean = clean
exports.serve = gulp.series(exports.build, watch)
exports.default = exports.serve
exports.mentions = mentions
