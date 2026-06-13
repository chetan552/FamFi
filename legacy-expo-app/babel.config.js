module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Custom plugin to transform import.meta.env to process.env
      // This is needed for ESM-only dependencies like Zustand 5 that use Vite-style env access
      function () {
        return {
          visitor: {
            MetaProperty(path) {
              if (path.get('meta').isIdentifier({ name: 'import' }) &&
                  path.get('property').isIdentifier({ name: 'meta' })) {
                // Not the right property, we want import.meta.env
              }
            },
            MemberExpression(path) {
              const { node } = path;
              if (
                node.object.type === 'MetaProperty' &&
                node.object.meta.name === 'import' &&
                node.object.property.name === 'meta' &&
                node.property.name === 'env'
              ) {
                path.replaceWith({
                  type: 'MemberExpression',
                  object: { type: 'Identifier', name: 'process' },
                  property: { type: 'Identifier', name: 'env' },
                });
              }
            },
          },
        };
      },
    ],
  };
};
