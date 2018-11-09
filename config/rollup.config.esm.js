import config from './rollup.config';

// ES output
config.output.format = 'es';
config.output.file = 'lib/easy-socket.esm.js';

export default config;