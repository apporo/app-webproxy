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
    appWebrouter: {
      mappings: {
        default: 'mongodb',
        sources: [
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
