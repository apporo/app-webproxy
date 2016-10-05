module.exports = {
  plugins: {
    appWebrouter: {
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
                  hostname: '192.168.56.56',
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
