const { resolve } = require('path');
const webpack = require('webpack');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;


const hmr = [
    'react-hot-loader/patch',
    'webpack-hot-middleware/client?noInfo=false'
];

module.exports = {
    target: 'web',
    entry: {
        main: hmr.concat(['./client/src/app.jsx']),
        vendor: [
            'react',
            'react-dom',
            'react-router-dom'
        ]
    },

    // the bundle file we will get in the result
    output: {
        filename: '[name].js',
        path: resolve(__dirname, 'client/dist/js'),
        pathinfo: true,
        publicPath: '/js/'
    },
    performance: {
        hints: false
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
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NamedModulesPlugin(),
        new webpack.NoEmitOnErrorsPlugin(),
        // new AssetsPlugin(),
        // XXX manifest?
        new webpack.optimize.CommonsChunkPlugin({
            name: 'vendor',
            filename: "vendor.js",

        }),
        new webpack.SourceMapDevToolPlugin({
            filename: "[file].map",
            exclude: ["vendor.js"]
        })
    ]
};
