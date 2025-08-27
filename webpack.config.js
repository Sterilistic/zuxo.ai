require('dotenv').config();
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { DefinePlugin } = require('webpack');

const Dotenv = require('dotenv-webpack');

module.exports = {
  entry: {
    background: './src/background.ts',
    content: './src/content.ts',
    popup: './src/popup/popup.ts'
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader'
        ]
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    }
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new Dotenv(),
    new MiniCssExtractPlugin(),
    new CopyPlugin({
      patterns: [
        { from: "manifest.json", to: "manifest.json" },
        { from: "src/popup/popup.html", to: "popup.html" },
        { from: "src/popup/popup.output.css", to: "popup.output.css" },
        { from: "icons", to: "icons" }
      ],
    }),
    new DefinePlugin({
      'LINKEDIN_CLIENT_ID': JSON.stringify(process.env.LINKEDIN_CLIENT_ID),
      'LINKEDIN_AUTH_SCOPE': JSON.stringify(process.env.LINKEDIN_AUTH_SCOPE),
      'LINKEDIN_RESPONSE_TYPE': JSON.stringify(process.env.LINKEDIN_RESPONSE_TYPE),
    })
  ],
}; 