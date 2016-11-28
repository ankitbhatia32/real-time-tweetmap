var fs = require('fs'),
configPath = '/Users/ankitbhatia/Desktop/config.json'; 
var parsed = JSON.parse(fs.readFileSync(configPath, 'UTF-8'));
exports.storageConfig=  parsed;