const http = require('http');

const token = 'Bearer%20eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiZTk4NzIwZGY5MWFlNDE3MWIyOTlmYjMwNmNlMTY4YjEiLCJ1c2VySWQiOjMsImlhdCI6MTc2Nzc4MTEwM30.JKCpLbLiz5H2KI4pq9BDPrAeqUNxBLAtW7WbWAqPaco';
const path = `/api/resource/sse?Authorization=${token}&clientid=e5cd7e4891bf95d1d19206ce24a7b32e`;

const options = {
    hostname: 'localhost',
    port: 8080,
    path: path,
    method: 'GET',
    headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    }
};

console.log(`Connecting to http://localhost:8080${path}`);

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });

    res.on('end', () => {
        console.log('No more data in response.');
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
