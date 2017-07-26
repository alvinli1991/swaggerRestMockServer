/**
 * 将文档内的definitions中的引用都解析出来
 */
const _ = require('lodash');

/**
 * 将 #/definitions/Category 转为 definitions.Category
 * @param $ref
 * @returns {*}
 */
const getRefPath = function getRefPath($ref) {
  return _.reduce(_.filter(_.split($ref, '/'), value => value !== '#'),
    (result, value) => `${result}.${value}`);
}


exports.getRefPath = getRefPath;
