module.exports = {
  plugins: {
    appWebproxy: {
      contextPath: 'webrouter',
      mappings: {
        default: 'static',
        sources: [
          {
            enabled: true,
            type: 'static',
            rules: [
              {
                enabled: true,
                id: 'rule1',
                source: {
                  url: '/(.*)'
                },
                target: {
                  hostname: 'localhost:8080',
                  url: '/$1'
                }
              }
            ]
          }
        ]
      }
    }
  }
};
