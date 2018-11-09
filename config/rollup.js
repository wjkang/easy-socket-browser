var pkg = require('../package.json');

var name = pkg.name.split('/').pop();
var version = pkg.version;

var banner = 
`/*!
 * easy-socket-browser ${version} (https://github.com/wjkang/easy-socket-browser)
 * Copyright 2017-${(new Date).getFullYear()} ruoxie. All Rights Reserved
 * Licensed under MIT 
 */
`;

exports.name = name;
exports.banner = banner;