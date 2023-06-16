const {namespaceWrapper} = require("../namespaceWrapper");

module.exports = async (path, data) => {

  await namespaceWrapper.fs('writeFile', path, JSON.stringify(data), (err) => {
    if (err) {
      console.error(err);
    }
  });
};
