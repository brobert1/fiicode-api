module.exports = function (query) {
  const filter = {};

  if (query.name && query.name !== '') {
    filter.name = { $regex: query.name, $options: 'i' };
  }

  return filter;
};
