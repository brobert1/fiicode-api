module.exports = function (query) {
  const filter = {};

  if (query.type && query.type !== '' && query.type !== 'all') {
    filter.type = query.type;
  }

  return filter;
};
