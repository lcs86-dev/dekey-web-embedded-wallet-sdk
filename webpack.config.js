const webpack = require("webpack");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const WriteFilePlugin = require("write-file-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const CompressionPlugin = require("compression-webpack-plugin");
const BrotliPlugin = require("brotli-webpack-plugin");

require("dotenv").config({ path: "./.env" });

module.exports = {
  mode: "production",
  entry: {
    background: "./src/background/wrapper.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].bundle.js",
  },
  module: {
    // 사용하는 loader를 써줍니다.
    // loader는 순서가 중요합니다. 위에서 아래로 써주세요.
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
    minimize: true,
    // mangleWasmImports: true,
    // removeAvailableModules: true,
    splitChunks: {
      name: "vendor",
      // chunks: 'initial',
      chunks: "all",
      // minSize: 30000,
      // maxSize: 0,
      // minChunks: 1,
      // maxAsyncRequests: 5,
      // maxInitialRequests: 3,
      // automaticNameDelimiter: '~',
      // automaticNameMaxLength: 30,
      // name: true,
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
        },
        // default: {
        //   minChunks: 2,
        //   priority: -20,
        //   reuseExistingChunk: true,
        // },
      },
    },
  },
};
