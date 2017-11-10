module.exports = {
  plugins: {
    appWebrouter: {
      request: {
        headers: {
          'accept-encoding': '*;q=1,gzip=0'
        }
      },
      mappings: {
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
      }
    }
  }
};
