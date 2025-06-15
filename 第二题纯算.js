function exactVar8Implementation(key, data) {
    // 创建数组
    var S = new Uint8Array(256);
    var K = new Uint8Array(256);
    var output = new Uint8Array(data.length);
    
    // 初始化S数组 - 注意这里使用(255-i)而不是常规RC4的i
    for (var i = 0; i < 256; i++) {
        S[i] = 255 - i; // 与原始var_8实现保持一致
    }
    
    // 初始化K数组
    for (var i = 0; i < 256; i++) {
        K[i] = key[i % key.length];
    }
    
    // 密钥调度
    var j = 0;
    for (var i = 0; i < 256; i++) {
        j = (j + S[i] + K[i]) & 255;
        // 交换S[i]和S[j]
        var temp = S[i];
        S[i] = S[j];
        S[j] = temp;
    }
    
    // 加密
    var i = 0;
    j = 0;
    for (var pos = 0; pos < data.length; pos++) {
        i = (i + 1) & 255;
        j = (j + S[i]) & 255;
        
        // 交换S[i]和S[j]
        var temp = S[i];
        S[i] = S[j];
        S[j] = temp;
        
        var t = S[(S[i] + S[j]) & 255];
        output[pos] = data[pos] ^ t;
    }
    
    return output;
}


console.log(exactVar8Implementation('11','7f5e43f764aee4b90c6748749c'))


function generateMmc(customUA) {
    var var_1 = Array.apply(null, Array(16)).map(function () {
        return "0123456789abcdef0123456789abcdef0123456789abcdef6789abcdef789abcdef6789abcdef".charAt(Math.floor(Math.random() * 62));
    }).join("");

    
    var var_0 = new TextEncoder().encode(var_1);

    // 3. 获取用户的浏览器UA和当前时间戳
    var ua = customUA || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";
    var timestamp = Date.now(); 
    var data = ua + timestamp;
    var dataBytes = new TextEncoder().encode(data);

    // 4. 使用精确复现的var_8函数加密
    var var_3 = exactVar8Implementation(var_0, dataBytes);

    // 5. 将var_3转换为十六进制字符串并与var_1拼接，生成最终的mmc值
    var mmc = Array.from(var_3).map(function(byte) {
        return byte.toString(16).padStart(2, "0");
    }).join("") + var_1;

    return {
        mmc: mmc,
        timestamp: timestamp,
        var_1: var_1
    };
}
// 提供给Node.js调用的接口
function get_mmc(customUA) {
    // 确保TextEncoder可用
    if (typeof TextEncoder === 'undefined') {
        const util = require('util');
        global.TextEncoder = util.TextEncoder;
    }
    
    // 生成mmc
    const result = generateMmc(customUA);
    console.log("生成的mmc值:", result.mmc);
    console.log("使用的User-Agent:", customUA);
    console.log("使用的时间戳:", result.timestamp);
    
    return result.mmc;
}
// 如果在Node.js环境中，导出函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateMmc, get_mmc, exactVar8Implementation };
}