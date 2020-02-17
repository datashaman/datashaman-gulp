require('dotenv').config()

const browserSync = require('browser-sync').create()
const compiler = require('webpack')
const del = require('del')
const fs = require('fs')
const generate = require('./lib/gulp/generate')
const gulp = require('gulp')
const gulpIf = require('gulp-if')
const log = require('fancy-log')
const more = require('./lib/gulp/more')
const nunjucks = require('./lib/nunjucks')
const plugins = require('gulp-load-plugins')()
const postDates = require('./lib/gulp/post-dates')
const sink = require('lead')
const through = require('through2')
const uniqid = require('uniqid')
const webpack = require('webpack-stream')
const yaml = require('js-yaml')

const paths = {
    documents: [
        './src/**/*.md',
    ],
    scripts: './src/scripts/main.js',
    styles: [
        './src/styles/*.scss',
    ],
}

const FEED_LIMIT = 30
const PAGE_LIMIT = 6
const TAGS_LIMIT = 1

function paginate(arr, perPage) {
    const pages = []
    const total = arr.length

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
    return del([
        './build',
        './documents.yml',
    ])
}

const scripts = () => {
    return gulp.src(paths.scripts)
        .pipe(webpack({
            mode: process.env.NODE_ENV || 'development',
            output: {
                filename: 'main.js',
            },
        }))
        .pipe(gulp.dest('./build/scripts'))
}


const styles = () => {
    return gulp.src(paths.styles)
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.sass())
        .pipe(plugins.cleanCss())
        .pipe(plugins.sourcemaps.write())
        .pipe(gulp.dest('./build/styles'))
        .pipe(browserSync.stream())
}

const documents = () => {
    loadedDocuments = null

    let documents = {}
    let feed = []
    let tags = {}
    let urls = []

    return gulp.src(paths.documents)
        .pipe(plugins.frontMatter({
            property: 'data',
            remove: true,
        }))
        .pipe(more())
        .pipe(postDates())
        .pipe(through.obj((file, encoding, cb) => {
            file.data = Object.assign({ url: '/' + file.relative.replace(/index\..+$/, '') }, file.data || {})
            cb(null, file)
        }))
        .pipe(sink(through.obj(
            (file, encoding, cb) => {
                id = uniqid()

                const fileTags = file.data.tags || []

                if (file.data.tag) {
                    fileTags.push(file.data.tag)
                    delete file.data.tag
                }

                if (file.data.date) {
                    file.data.date = new Date(file.data.date)
                }

                if (file.data.view === 'page') {
                    urls.push({
                        id,
                        priority: '0.8000',
                    })
                }

                if (file.data.view === 'post') {
                    feed.push({
                        id,
                        date: file.data.date,
                    })
                    urls.push({
                        id,
                        priority: '0.6000',
                    })
                }

                documents[id] = {
                    id,
                    extname: file.extname,
                    path: file.path.replace(file.base + '/', ''),
                    data: file.data,
                    contents: file.contents.toString(),
                }

                fileTags.forEach(tag => {
                    if (typeof tags[tag] === 'undefined') {
                        tags[tag] = []
                    }

                    tags[tag].push({
                        date: file.data.date,
                        id,
                    })
                })

                cb()
            },
            function (cb) {
                Object.keys(tags).forEach(tag => {
                    tags[tag].sort((a, b) => b.date - a.date)
                    let pagination = paginate(tags[tag].map(defn => defn.id), PAGE_LIMIT)

                    pagination.pages.forEach((page, index) => {
                        const pageId = uniqid()

                        documents[pageId] = {
                            id: pageId,
                            extname: '.md',
                            path: index ? `tags/${tag}/page/${index+1}/index.md` : `tags/${tag}/index.md`,
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
                                url: index ? `/${tag}/page/${index+1}/` : `/${tag}/`,
                                view: 'tag',
                            },
                            contents: '',
                        }

                        urls.push({
                            id: pageId,
                            priority: '0.7000',
                        })
                    })

                    pagination = paginate(tags[tag].map(defn => defn.id), TAGS_LIMIT)

                    tags[tag] = {
                        items: pagination.pages[0],
                        lastPage: pagination.pages.length,
                        total: pagination.total,
                    }
                })

                let pageId = uniqid()

                tags = Object.keys(tags).sort().reduce((acc, tag) => {
                    acc[tag] = tags[tag]

                    return acc
                }, {})

                documents[pageId] = {
                    id: pageId,
                    extname: '.md',
                    path: 'tags/index.md',
                    data: {
                        tags,
                        title: 'Tags',
                        url: '/tags/',
                        view: 'tags',
                    },
                    contents: '',
                }

                urls.push({
                    id: pageId,
                    priority: '0.8000',
                })

                feed = feed
                    .sort((a, b) => b.date - a.date)
                    .map(post => post.id)

                pageId = uniqid()
                
                documents[pageId] = {
                    id: pageId,
                    extname: '.xml',
                    path: 'feed.xml',
                    data: {
                        entries: feed.slice(0, FEED_LIMIT),
                        url: '/feed.xml',
                        view: 'feed',
                    },
                    contents: '',
                }

                const pagination = paginate(feed, PAGE_LIMIT)

                pagination.pages.forEach((page, index) => {
                    const pageId = uniqid()

                    documents[pageId] = {
                        id: pageId,
                        extname: '.md',
                        path: index ? `page/${index+1}/index.md` : 'index.md',
                        data: {
                            posts: {
                                items: page,
                                total: pagination.total,
                                currentPage: index + 1,
                                lastPage: pagination.pages.length,
                                perPage: pagination.perPage,
                            },
                            title: index ? `Page ${index+1}` : '',
                            url: index ? `/page/${index+1}/` : '/',
                            view: 'home',
                        },
                        contents: '',
                    }

                    if (!index) {
                        urls.push({
                            id: pageId,
                        })
                    }
                })

                pageId = uniqid()

                documents[pageId] = {
                    id: pageId,
                    extname: '.xml',
                    path: 'sitemap.xml',
                    data: {
                        urls,
                        url: '/sitemap.xml',
                        view: 'sitemap',
                    },
                    contents: '',
                }

                const contents = yaml.dump(documents)
                fs.writeFile('./documents.yml', contents, cb)
            }
        )))
}

const generateDocuments = () => {
    return gulp.src('./documents.yml')
        .pipe(generate())
        .pipe(gulpIf(
            (file) => {
                return file.extname === '.md'
            },
            plugins.markdown()
        ))
        .pipe(plugins.wrap(
            (data) => {
                return fs
                    .readFileSync('./views/' + data.view + '.njk')
                    .toString()
            },
            nunjucks, 
            { engine: 'nunjucks' }
        ))
        .pipe(gulp.dest('./build'))
}

const watch = (cb) => {
    browserSync.init({
        server: {
            baseDir: 'build',
        },
    })

    // gulp.watch(paths.scripts, gulp.series(scripts))
    gulp.watch(paths.styles, gulp.series(styles))

    const watchPaths = ['./views/**/*.njk'].concat(paths.documents)
    gulp.watch(watchPaths, gulp.series(clean, styles, documents, generateDocuments)).on('change', browserSync.reload)

    cb()
}

exports.build = gulp.series(clean, styles, documents, generateDocuments)
exports.clean = clean
exports.serve = gulp.series(exports.build, watch)
exports.default = exports.serve
