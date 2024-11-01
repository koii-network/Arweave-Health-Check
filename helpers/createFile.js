const { namespaceWrapper } = require('@_koii/namespace-wrapper');

module.exports = async (path, data) => {
  await namespaceWrapper.fs('writeFile', path, JSON.stringify(data), err => {
    if (err) {
      console.error(err);
    }
  });
};
