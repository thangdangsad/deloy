const swaggerAutogen = require('swagger-autogen')();

const outputFile = './swagger-output.json'; // file json tạo ra
const endpointsFiles = ['./server.js', './routes/**/*.js']; // tất cả file route

const doc = {
    info: {
        title: 'API Node.js Demo',
        description: 'Swagger auto-generated',
    },
    host: 'localhost:5000',
    schemes: ['http'],
};

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
    require('./server'); // khởi động server sau khi tạo swagger
});
