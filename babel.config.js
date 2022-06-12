module.exports = function (api) {
  // plugin이나 preset을 캐시하여 다시 실행하지 않도록
  api.cache(true);

  // preset 추가
  const presets = [["@babel/preset-env"]];

  return {
    presets,
    plugins: ["@babel/plugin-transform-runtime"],
  };
};
