const {namespaceWrapper} = require("../namespaceWrapper");

module.exports = async (path) => {

  await namespaceWrapper.fs('unlink', path, (err) => {
    if (err) {
      console.error(err);
    }
  });
};
