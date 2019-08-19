module.exports = function (api) {
  const config = {};
  config.presets = [{
    // retainLines: true // broken in babel 7 with decorators
  }];
  if (api.env('test')) {
    config.plugins = [['@babel/plugin-proposal-decorators', { 'legacy': true }]];
  }
  return config;
};
