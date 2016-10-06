module.exports = {
  bridges: {
    appWebrouterMongodbWrapper: {
      mongodb: {
        connection_options: {
          host: 'localhost',
          port: 3306,
          name: 'app-webrouter'
        }
      }
    }
  },
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
            enabled: true,
            type: 'mongodb',
            collection: 'mappingrules'
          }
        ]
      }
    }
  }
};
