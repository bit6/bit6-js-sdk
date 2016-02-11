// Uncomment when publishing
var opts = {
    // IMPORTANT! Set your own Bit6 API key
    //'apikey': 'MyApiKey',
};

if (!opts.apikey) {
    alert('Missing "apikey".\nSpecify it in bit6.Client() constructor!');
}

// Keep the instance global for easy access form dev console
var b6 = new bit6.Client(opts);

$(function() {
    // Init the application from demo.js
    window.initApp(b6);
});
