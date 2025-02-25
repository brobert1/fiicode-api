module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2020: true,
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 11,
    sourceType: 'module', // Enables ES module support
  },
  rules: {
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'no-unused-vars': ['error', { ignoreRestSiblings: true }],
  },
  ignorePatterns: ['**/tests/*.js', '**/*.test.js', '**/test.js'],
  overrides: [
    {
      files: ['scripts/**/*.js'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
