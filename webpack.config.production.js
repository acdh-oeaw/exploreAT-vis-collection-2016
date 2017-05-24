const { resolve } = require('path');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
    target: 'web',
    entry: {
        main: './client/src/app.jsx',
        // TODO consider externals here
        vendor: [
            'react',
            'react-dom',
            'react-router-dom',
            'material-ui'
        ]
    },
    output: {
        filename: '[chunkhash].[name].js',
        path: resolve(__dirname, 'client/dist/js'),
        publicPath: '/js/'
    },
    stats: 'verbose',
    performance: {
        hints: 'warning'
    },
    module: {
        rules: [{
            test: /\.jsx$/,
            use: [{
                loader: 'babel-loader'
            }],
            exclude: /node_modules/
        }]
    },
    plugins: [
        // new AssetsPlugin(),
        new webpack.DefinePlugin({ 'process.env': { 'NODE_ENV': JSON.stringify('production') } }),
        new webpack.optimize.CommonsChunkPlugin({
            name: 'vendor',
            filename: "vendor.js",
        }),
        new BundleAnalyzerPlugin()
    ]
};