module.exports = {
  // https://github.com/trivago/prettier-plugin-sort-imports/issues/131#issuecomment-1163488213
  plugins: [
    require.resolve('@trivago/prettier-plugin-sort-imports'),
  ],
  semi: false,
  trailingComma: 'all',
  printWidth: 100,
  singleQuote: true,
  tabWidth: 2,
  arrowParens: 'always',
  importOrder: [
    '^@snowballtools/(.*)$',
    '<THIRD_PARTY_MODULES>',
    '^[./]',
    '^[../]'
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
}
