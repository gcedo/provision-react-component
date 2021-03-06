#!/usr/bin/env node
import compose from 'lodash.compose';
import defaultsDeep from 'lodash.defaultsdeep';
import getObjectPath from 'lodash.get';
import jsonFile from 'packagesmith.formats.json';
import multiline from 'packagesmith.formats.multiline';
import packageVersions from '../package-versions';
import { runProvisionerSet } from 'packagesmith';
import sortPackageJson from 'sort-package-json';
function addDoc(packageJson) {
  return defaultsDeep({
    directories: {
      site: 'site',
    },
    devDependencies: {
      'npm-run-all': packageVersions['npm-run-all'],
      'git-directory-deploy': packageVersions['git-directory-deploy'],
    },
    scripts: {
      'prewatch:doc': 'npm run predoc',
      predoc: 'mkdir -p $npm_package_directories_site',
      doc: 'npm-run-all --parallel doc:*',
      'watch:doc': 'npm-run-all --parallel watch:doc:*',
      prepages: 'npm run doc',
      pages: 'git-directory-deploy --directory $npm_package_directories_site --branch gh-pages',
      start: 'npm run watch',
      watch: 'npm-run-all --parallel watch:*',
    },
  }, packageJson);
}

function addDocAssets(packageJson) {
  return defaultsDeep({
    devDependencies: {
      'npm-assets': packageVersions['npm-assets'],
    },
    scripts: {
      'doc:assets': 'npm-assets $npm_package_directories_site',
      'watch:doc:assets': 'npm run doc:assets',
    },
  }, packageJson);
}

function addDocCss(packageJson) {
  return defaultsDeep({
    devDependencies: {
      'postcss-import': packageVersions['postcss-import'],
      'postcss-url': packageVersions['postcss-url'],
      'postcss-cssnext': packageVersions['postcss-cssnext'],
      'postcss-reporter': packageVersions['postcss-reporter'],
      'postcss-cli': packageVersions['postcss-cli'],
    },
    config: {
      doc: {
        css: {
          options: getObjectPath(packageJson, 'config.doc.css.options', [
            '-u postcss-import',
            '-u postcss-url',
            '-u postcss-cssnext',
            '-u postcss-reporter',
          ].join(' ')),
        },
      },
    },
    scripts: {
      'doc:css': [
        'postcss',
        '$npm_package_config_doc_css_options',
        '-o $npm_package_directories_site/bundle.css',
        '$npm_package_directories_src/example.css',
      ].join(' '),
      'watch:doc:css': 'npm run doc:css -- --watch',
    },
  }, packageJson);
}

function addDocHtml(packageJson) {
  return defaultsDeep({
    devDependencies: {
      '@economist/doc-pack': packageVersions['@economist/doc-pack'],
      'hbs-cli': packageVersions['hbs-cli'],
    },
    config: {
      doc: {
        html: {
          files: getObjectPath(packageJson, 'config.doc.html.files', [
            '@economist/doc-pack/templates/index.hbs',
            '@economist/doc-pack/templates/standalone.hbs',
          ].join(' ')),
        },
      },
    },
    scripts: {
      'doc:html': [
        'hbs',
        '-D package.json',
        '-H @economist/doc-pack',
        '-o $npm_package_directories_site',
        '$npm_package_config_doc_html_files',
      ].join(' '),
      'watch:doc:html': 'npm run doc:html -- --watch',
    },
  }, packageJson);
}

function addDocJs(packageJson) {
  return defaultsDeep({
    devDependencies: {
      'browserify': packageVersions.browserify,
      'watchify': packageVersions.watchify,
      'babelify': packageVersions.babelify,
    },
    config: {
      doc: {
        js: { // eslint-disable-line id-length
          options: getObjectPath(packageJson, 'config.doc.js.options',
            '-r react -r react-dom -r ./src/example.js:example'
          ),
        },
      },
    },
    browserify: {
      transform: [ 'babelify' ],
    },
    scripts: {
      'doc:js': 'browserify ' +
        '$npm_package_config_doc_js_options ' +
        '$npm_package_directories_test/*.js ' +
        '-o $npm_package_directories_site/bundle.js',
      'watch:doc:js': 'watchify ' +
        '$npm_package_config_doc_js_options ' +
        '$npm_package_directories_test/*.js ' +
        '-o $npm_package_directories_site/bundle.js',
    },
  }, packageJson);
}

export function provisionDocgen() {
  return {
    'package.json': {
      after: [ 'npm install' ],
      contents: jsonFile(compose(
        sortPackageJson,
        addDocJs,
        addDocHtml,
        addDocCss,
        addDocAssets,
        addDoc,
      )),
    },

    '.gitignore': {
      contents: multiline((lines) => lines.concat([ 'site' ])),
    },

  };
}
export default provisionDocgen;
if (require.main === module) {
  const directoryArgPosition = 2;
  runProvisionerSet(process.argv[directoryArgPosition] || process.cwd(), provisionDocgen());
}
