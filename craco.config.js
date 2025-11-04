module.exports = {
  devServer: {
    port: process.env.PORT || 3000,
    host: '0.0.0.0',
    setupMiddlewares: (middlewares, devServer) => {
      return middlewares;
    },
  },
};