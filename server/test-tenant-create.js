const http = require('http');

// 模拟前端发送的加密请求数据
const requestData = {
    encryptedKey: "wC6lKFZsBXPzLkLC724ewMNMMtkZgdwc5OiBqk6nnvoLW+5S2Ne8jsu5RCm7/A8znh5xtUV6XqM7QYisoYNXo/4Rv+Wgxqx22D8bJNoapMJbbc8yZj/zqeRzgPJm5kVRtgNbd845RM900vGPqdTyfKdtrQEUE/qfvGeWbZorzkPiCATjibeogrej8FqJP8Fm9+sgNnHOtx/wBHpP8A5lBbb/80jjzIvHRZHt5vUa1BvI/giEIEC6pznYBmhljvEkjlJ7G1q/hhw8zqiSxMKLMqeg+LGQ0D9Hl7FTAqEO+lujzfe42oucOcdfp6PNJMysPhTxu7BgNSLEJwup+m5PLQ==",
    encryptedData: "5PSdXojCw4CsStoPSkCHikVWoOmpFt3jgYXHTbDKOem4oXZ1ld17cOtdxsqBApB5OmQdswGpv41QzY6k09IGydnq4fvBW3WApAhBCps1K1axCCXRSbgsmyGWCBWf21l8v/UQyhZYu1vjOsw2d8QxOubHVeaHxbw4h1ccmuFYH2YFoWyZ57XRmK6Q0REyioYRNMFD9DIBVUtVRPoQTI19bS/YrIBVrpHHhJUaE0jGoGOCkxmww4vkXESnyNAJa0FoovhEKlwE6zGIxDqYtEgz7fH7z4TA4WDT+ajtOPXJ78GHmurTWQMl/AzJVJK+vNSyjtlnaYTKLlvSqBsnt8Psh5wmZJRfX6PNoPl53xJf1CtGHq1rM5OjVabB+J1BLyAv"
};

const postData = JSON.stringify(requestData);

const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/api/system/tenant',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiNjNjMTYwZmNjOTQ1NDBlNDhjNzg2YWQyNjA3ZmE2YjgiLCJ1c2VySWQiOjEsImlhdCI6MTc2NTg3NzcwNn0.smRDJSXRC1e_n5VzcJW7iWUnGFOsV-l_TNxjS6eEdzs',
        'X-Request-Id': 'tKmCqmIHY1vTaBCv9ihe5',
        'x-encrypted': 'true',
        'isEncrypt': 'true'
    }
};

const req = http.request(options, (res) => {
    console.log(`状态码: ${res.statusCode}`);
    console.log(`响应头:`, res.headers);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('\n响应数据:');
        try {
            console.log(JSON.stringify(JSON.parse(data), null, 2));
        } catch (e) {
            console.log(data);
        }
    });
});

req.on('error', (e) => {
    console.error(`请求失败: ${e.message}`);
});

req.write(postData);
req.end();
