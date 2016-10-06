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
      contextPath: '/webrouter',
      mappings: {}
  }
};
