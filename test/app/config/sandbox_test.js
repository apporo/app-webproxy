module.exports = {
  plugins: {
    appConfighub: {
      jsonStoreDir: require('path').join(__dirname, '../data/confighub')
    },
    appWebrouter: {
      mappings: {
        sources: [
          {
            enabled: true,
            type: 'internal',
            rules: [
              {
                id: 'elasticsearch-plugins',
                enabled: true,
                source: {
                  url: '/tool(.*)',
                  methods: ['GET', 'POST']
                },
                target: {
                  hostname: 'localhost',
                  port: 9200,
                  url: '$1'
                }
              }
            ]
          },
          {
            enabled: true,
            type: 'external',
            configName: 'app-webrouter'
          }
        ]
      }
    }
  }
};
