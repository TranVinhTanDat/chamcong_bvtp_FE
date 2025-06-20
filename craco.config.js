module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Tìm quy tắc source-map-loader
      const sourceMapLoaderRule = webpackConfig.module.rules.find((rule) =>
        rule.test?.toString().includes('js|jsx|ts|tsx')
      );

      if (sourceMapLoaderRule) {
        // Đảm bảo exclude là một mảng
        const existingExcludes = Array.isArray(sourceMapLoaderRule.exclude)
          ? sourceMapLoaderRule.exclude
          : sourceMapLoaderRule.exclude
          ? [sourceMapLoaderRule.exclude]
          : [];

        // Thêm /node_modules/react-datepicker/ vào exclude
        sourceMapLoaderRule.exclude = [
          /node_modules\/react-datepicker/,
          ...existingExcludes,
        ];
      }

      return webpackConfig;
    },
  },
};