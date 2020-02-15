const { src, dest, task, series, parallel, watch } = require('gulp')
const browserSync = require('browser-sync').create()
const compiler = require('webpack')
const del = require('del')
const fs = require('fs')
const log = require('fancy-log')
const plugins = require('gulp-load-plugins')()
const through = require('through2')
const uniqid = require('uniqid')
const Vinyl = require('vinyl')
const webpack = require('webpack-stream')

const nunjucks = require('./nunjucks')

const paths = {
    posts: [
        './src/**/*.md',
    ],
    scripts: './src/scripts/main.js',
    styles: [
        './src/styles/*.scss',
    ],
}

function more() {
    return through.obj(
        (file, encoding, cb) => {
            const contents = file.contents.toString()

            const parts = contents.split(/\s*\<!--more--\>/)
            
            if(parts.length > 1) {
                file.data.excerpt = parts[0]
            }

            cb(null, file)
        },
        function (cb) {
            cb()
        },
    )
}

let counter = 0

function generateId() {
    nunjucks.index = {}

    return through.obj(
        (file, encoding, cb) => {
            file.data.id = uniqid()
            nunjucks.index[file.data.id] = file

            cb(null, file)
        },
        function (cb) {
            cb()
        }
    )
}

function generateTags() {
    nunjucks.tags = {}

    return through.obj(
        (file, encoding, cb) => {
            log(file.data)

            let fileTags = file.data.tags || []

            if(file.data.tag) {
                fileTags.push(tag)
            }

            fileTags.forEach(tag => {
                if (typeof nunjucks.tags[tag] === 'undefined') {
                    nunjucks.tags[tag] = []
                }

                nunjucks.tags[tag].push({
                    id: file.data.id,
                    date: file.data.date,
                })
            })

            cb(null, file)
        },
        function (cb) {
            log(nunjucks.tags)

            Object.keys(nunjucks.tags).forEach(tag => {
                nunjucks.tags[tag].sort((a, b) => a.date - b.date)

                contents = ''

                this.push(new Vinyl({
                    data: {
                        tag,
                        title: tag,
                        view: 'tag',
                    },
                    path: 'tags/' + tag + '/index.md',
                    contents: Buffer.from(contents)
                }))
            })

            cb()
        }
    )
}

function data() {
    return src(paths.posts)
        .pipe(plugins.frontMatter({
            property: 'data',
            remove: true,
        }))
        .pipe(more())
        .pipe(generateId())
        .pipe(generateTags())
}

function posts() {
    return data()
        .pipe(plugins.rename(path => {
            const result = path.basename.match(/^(?<year>[0-9]{4})-(?<month>[0-9]{2})-(?<day>[0-9]{2})-(?<slug>.*)$/)

            if (result) {
                const { groups: { year, month, day, slug }} = result

                path.dirname = `${path.dirname}/${year}/${month}/${day}/${slug}`
                path.basename = 'index'
                path.extname = '.md'
            }
        }))
        .pipe(plugins.markdown())
        .pipe(plugins.ssg())
        .pipe(plugins.wrap(
            (data) => fs.readFileSync('./views/' + data.view + '.njk').toString(),
            nunjucks, 
            { engine: 'nunjucks' }
        ))
        .pipe(dest('./build'))
}

function scripts() {
    return src(paths.scripts)
        .pipe(webpack({
            mode: process.env.NODE_ENV || 'development',
            output: {
                filename: 'main.js',
            },
        }))
        .pipe(dest('./build/scripts'))
}

function styles() {
    return src(paths.styles)
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.sass())
        .pipe(plugins.sourcemaps.write())
        .pipe(dest('./build/styles'))
        .pipe(browserSync.reload({
            stream: true,
        }))
}

function clean() {
    return del('./build')
}

task('watch', () => {
    watch(paths.scripts, scripts)
    watch(paths.posts, posts)
    watch(paths.styles, styles)
})

task('browserSync', () => {
    browserSync.init({
        server: {
            baseDir: 'build',
        },
    })
})

const build = series(clean, parallel(series(scripts, posts), styles))

exports.clean = clean
exports.data = data
exports.posts = posts
exports.scripts = scripts
exports.styles = styles
exports.watch = series('browserSync', build, 'watch')
exports.build = build
exports.default  = build
