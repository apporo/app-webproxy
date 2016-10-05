module.exports = {
  plugins: {
    appWebproxy: {
      mappings: {
        'rule1': {
          source: {
            url: '/(.*)'
          },
          target: {
            hostname: 'localhost:8080',
            url: '/$1'
          }
        }
      }
    }
  }
};
