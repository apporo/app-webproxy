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
                id: 'elasticsearch-plugins',
                source: {
                  url: '/tool(.*)'
                },
                target: {
                  hostname: '192.168.2.244',
                  port: 9200,
                  url: '$1'
                }
              }
            ]
          }
        ]
      }
    }
  }
};
