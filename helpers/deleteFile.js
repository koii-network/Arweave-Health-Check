const { namespaceWrapper } = require('@_koii/namespace-wrapper');

module.exports = async path => {
  await namespaceWrapper.fs('unlink', path, err => {
    if (err) {
      console.error(err);
    }
  });
};
