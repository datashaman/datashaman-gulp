const { src, dest, task, series, parallel, watch } = require('gulp')
const browserSync = require('browser-sync').create()
const del = require('del')
const named = require('gulp-named')
const nunjucks = require('nunjucks')
const plugins = require('gulp-load-plugins')()
const compiler = require('webpack')
const webpack = require('webpack-stream')

const paths = {
    posts: [
        './src/posts/*.md',
    ],
    scripts: './src/scripts/app.js',
    styles: [
        './src/styles/*.scss',
    ],
}

function posts() {
    const env = nunjucks.configure('./views')

    env.addFilter('date', require('nunjucks-date'))

    return src(paths.posts)
        .pipe(plugins.rename(path => {
            const { groups: { year, month, day, slug }} =
                path.basename.match(/^(?<year>[0-9]{4})-(?<month>[0-9]{2})-(?<day>[0-9]{2})-(?<slug>.*)$/)

            return {
                dirname: `${path.dirname}/${year}/${month}/${day}/${slug}`,
                basename: 'index',
                extname: '.html',
            }
        }))
        .pipe(plugins.frontMatter({
            property: 'data',
            remove: true,
        }))
        .pipe(plugins.markdown())
        .pipe(plugins.ssg())
        .pipe(plugins.wrap(
            { src: './views/post.njk' },
            { site: { link: 'https://datashaman.com', title: 'datashaman' }, nunjucksEnv: env },
            { engine: 'nunjucks' }
        ))
        .pipe(dest('./build'))
}

function scripts() {
    return src(paths.scripts)
        .pipe(webpack({
            mode: process.env.NODE_ENV || 'development'
        }, compiler))
        .pipe(dest('./build/scripts'))
}

function styles() {
    return src(paths.styles)
        .pipe(plugins.sass())
        .pipe(dest('./build/styles'))
        .pipe(browserSync.reload({
            stream: true,
        }))
}

function clean() {
    return del('./build')
}

task('watch', () => {
    watch(paths.posts, posts)
    watch(paths.scripts, scripts)
    watch(paths.styles, styles)
})

task('browserSync', () => {
    browserSync.init({
        server: {
            baseDir: 'build',
        },
    })
})

const build = series(clean, parallel(posts, scripts, styles))

exports.clean = clean
exports.posts = posts
exports.scripts = scripts
exports.styles = styles
exports.watch = series('browserSync', scripts, styles, 'watch')
exports.build = build
exports.default  = build
