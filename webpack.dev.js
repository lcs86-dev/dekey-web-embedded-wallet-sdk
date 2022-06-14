const webpack = require("webpack");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const WriteFilePlugin = require("write-file-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const CompressionPlugin = require("compression-webpack-plugin");
const BrotliPlugin = require("brotli-webpack-plugin");

require("dotenv").config({ path: "./.env" });

module.exports = {
  mode: "development",
  entry: {
    background: "./src/background/wrapper.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].bundle.js",
  },
  devtool: "inline-source-map",
  devServer: {
    static: "./dist",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: "babel-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.wasm$/,
        loaders: ["wasm-loader"],
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "src", "background", "index.html"),
      filename: "index.html",
      chunks: ["background"],
    }),
    new CopyWebpackPlugin(
      [
        {
          from: "src/background/wasm/dkeyswasm.wasm",
          to: path.resolve(__dirname, "dist"),
          force: true,
        },
      ],
      {
        logLevel: "info",
        copyUnmodified: true,
      }
    ),
    new CompressionPlugin({
      test: /\.(js|html|wasm)$/,
      algorithm: "gzip",
      threshold: 10240,
      minRatio: 0.8,
    }),
    new BrotliPlugin({
      // asset: '[path].br[query]',
      test: /\.(js|css|html|svg|wasm)$/,
      threshold: 10240,
      minRatio: 0.8,
    }),
    new webpack.DefinePlugin({
      "process.env": JSON.stringify(process.env),
    }),
  ],
  target: "web",
  node: {
    fs: "empty",
  },
  optimization: {
    runtimeChunk: "single",
  },
};
