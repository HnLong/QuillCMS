module.exports = {
  root: true,
  parser: 'babel-eslint',
  env: {
    browser: true,
    node: true
  },
  extends: 'standard',
  // required to lint *.vue files
  plugins: [
    'html'
  ],
  // add your custom rules here
  rules: {
    'space-before-function-paren': [0, {
      "anonymous": 'ignore',
      'named': 'ignore',
      'asyncArrow': 'ignore'
    }]
  },
  globals: {}
}
