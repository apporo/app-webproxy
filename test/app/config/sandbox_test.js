module.exports = {
  bridges: {
    appWebrouterMongodbWrapper: {
      mongodb: {
        connection_options: {
          host: '192.168.56.56',
          port: 27017,
          name: 'app-webrouter'
        }
      }
    }
  },
  plugins: {
    appConfighub: {
      jsonStoreDir: require('path').join(__dirname, '../data/confighub')
    },
    appWebrouter: {
      mappings: {
        default: 'mongodb',
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
          },
          {
            type: 'static',
            enabled: true,
            rules: [
              {
                id: 'elasticsearch-plugins',
                enabled: true,
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
          },
          {
            type: 'mongodb',
            enabled: true,
            collectionName: 'mappingrules'
          }
        ]
      }
    }
  }
};
