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
          },
          {
            "id": "elasticsearch-plugins",
            "enabled": false,
            "source": {
              "url": "/tool(.*)",
              "methods": ["GET", "PUT"]
            },
            "target": {
              "hostname": "opflow-broker-default",
              "port": 9200,
              "url": "$1",
              "authentication": {
                "enabled": false,
                "type": "basic",
                "username": "nobody",
                "password": "secret"
              },
              "request": {
                "headers": [{
                  "name": "accept-encoding",
                  "value": "*;q=1,gzip=0"
                }]
              },
              "response": {
                "headers": [{
                  "name": "content-security-policy",
                  "value": null
                }]
              }
            }
          }
        ]
      }
    }
  }
};
