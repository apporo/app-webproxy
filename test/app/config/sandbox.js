module.exports = {
  plugins: {
    appConfighub: {
      jsonStoreDir: require('path').join(__dirname, '../data/confighub')
    },
    appWebrouter: {
      request: {
        headers: {
          'accept-encoding': '*;q=1,gzip=0'
        }
      },
      mappings: {
        sources: [
          {
            enabled: true,
            type: 'internal',
            rules: [
              {
                id: 'rabbitmq-management',
                enabled: true,
                source: {
                  url: '/(.*)',
                  //methods: ['GET', 'POST']
                },
                target: {
                  hostname: '192.168.56.56',
                  port: 15672,
                  url: '$1'
                }
              }
            ]
          },
          {
            enabled: false,
            type: 'external',
            configName: 'app-webrouter'
          }
        ]
      }
    }
  }
};
