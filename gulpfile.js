require('dotenv').config()

const browserSync = require('browser-sync').create()
const compiler = require('webpack')
const del = require('del')
const fs = require('fs')
const generate = require('./gulp/lib/generate')
const gulp = require('gulp')
const gulpIf = require('gulp-if')
const log = require('fancy-log')
const more = require('./gulp/lib/more')
const nunjucks = require('./nunjucks')
const plugins = require('gulp-load-plugins')()
const postDates = require('./gulp/lib/post-dates')
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
        .pipe(plugins.sourcemaps.write())
        .pipe(gulp.dest('./build/styles'))
        .pipe(browserSync.stream())
}

const documents = () => {
    loadedDocuments = null

    let documents = {}
    let pages = []
    let posts = []
    let tags = {}

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
                    pages.push(id)
                }

                if (file.data.view === 'post') {
                    posts.push({
                        id,
                        date: file.data.date,
                    })
                }

                documents[id] = {
                    id,
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
                            path: index ? `${tag}/page/${index+1}/index.md` : `${tag}/index.md`,
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
                                view: 'tag',
                            },
                            contents: '',
                        }
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
                    path: 'tags/index.md',
                    data: {
                        tags,
                        title: 'Tags',
                        view: 'tags',
                    },
                    contents: '',
                }

                posts = posts
                    .sort((a, b) => b.date - a.date)
                    .map(post => post.id)

                pageId = uniqid()
                
                documents[pageId] = {
                    id: pageId,
                    path: 'feed.xml',
                    data: {
                        pages,
                        posts: posts.slice(0, FEED_LIMIT),
                        url: '/feed.xml',
                        view: 'feed',
                    },
                    contents: '',
                }

                const pagination = paginate(posts, PAGE_LIMIT)

                pagination.pages.forEach((page, index) => {
                    const pageId = uniqid()

                    documents[pageId] = {
                        id: pageId,
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
                            view: 'home',
                        },
                        contents: '',
                    }
                })

                const contents = yaml.dump(documents)
                fs.writeFile('documents.yml', contents, cb)
            }
        )))
}

const generateDocuments = () => {
    return gulp.src('documents.yml')
        .pipe(generate())
        .pipe(gulpIf(
            (file) => file.extname === '.md',
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

    gulp.watch(paths.scripts, gulp.series(scripts))
    gulp.watch(paths.styles, gulp.series(styles))

    const watchPaths = ['./views/**/*.njk'].concat(paths.documents)
    gulp.watch(watchPaths, gulp.series(clean, scripts, styles, documents, generateDocuments)).on('change', browserSync.reload)

    cb()
}

exports.build = gulp.series(clean, scripts, styles, documents, generateDocuments)
exports.serve = gulp.series(exports.build, watch)
exports.default = exports.serve
