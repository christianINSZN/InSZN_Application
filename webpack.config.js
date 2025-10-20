const path = require('path');

module.exports = {
  // ... other configurations if present
  resolve: {
    fallback: {
      "fs": false, // SQLite3 doesn't need fs in browser, disable it
      "path": require.resolve("path-browserify"),
      "util": require.resolve("util/"),
    },
  },
};