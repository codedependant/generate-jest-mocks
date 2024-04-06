const path = require('path');
const webpack = require('webpack');

const common = {
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: 'ts-loader',
        // exclude unit test files
        exclude: [/node_modules/, /.*\.test\.{js,ts}/],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
};

module.exports = [
  {
    entry: './src/index.ts',
    target: 'node',
    ...common,
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'index.js',
      library: { name: 'generateJestMocks', type: 'umd' },
    },
  },
  {
    entry: './src/bin/index.ts',
    target: 'node',
    ...common,
    plugins: [
      new webpack.BannerPlugin({
        banner: '#!/usr/bin/env node',
        raw: true,
      }),
    ],
    output: {
      path: path.resolve(__dirname, 'dist/bin'),
      filename: 'index.js',
    },
  },
];
