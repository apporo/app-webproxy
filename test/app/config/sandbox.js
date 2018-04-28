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
              hostname: 'opflow-broker-default',
              port: 15672,
              url: '$1'
            }
          }
        ]
      }
    }
  }
};
