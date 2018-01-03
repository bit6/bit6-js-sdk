
// Load FB SDK dynamically
function loadFbSdk(appId) {
    window.fbAsyncInit = function() {
        var opts = {
            appId: appId,
            xfbml: true,
            version: 'v2.10'
        }
        window.FB.init(opts);
    }

    var loadFn = function(d, s, id) {
        var fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        var js = d.createElement(s);
        js.id = id;
        js.src = '//connect.facebook.net/en_US/sdk.js';
        fjs.parentNode.insertBefore(js, fjs);
    }

    loadFn(window.document, 'script', 'facebook-jssdk');
}

function startAnonymousAuth(authSvc, deviceId) {
    var opts = {device: deviceId};
    authSvc.anonymous(opts, onAuthResponse);
}

function startFacebookAuth(authSvc, deviceId) {
    FB.login(function(response) {
        console.log('FB response', response);
        if (response.authResponse) {
            var opts = {device: deviceId, provider: response.authResponse};
            authSvc.facebook(opts, onAuthResponse);
        } else {
            console.log('User cancelled login or did not fully authorize.');
        }
    });
}

// Handle Auth Service response
function onAuthResponse(err, resp) {
    if (err) {
        console.log('Could not get token', err);
        return;
    }
    var accessToken = new bit6.AccessToken(resp.token);
    accessToken.on('expired', function(t) {
        console.log('AccessToken expired, need to renew', t);
    });
    console.log('AccessToken', accessToken);
    $('#token').text( accessToken.token );
    $('#claims').text( JSON.stringify(accessToken.claims, null, 2) );
}


$(function() {

    // Unique ID for this browser instance
    var deviceId = 'web' + Math.floor((Math.random() * 1000) + 1);
    console.log('Device:', deviceId)

    // Demo for production environment
    var opts = {
        apikey: '616af706a5ad441c9320837769da7857'
    }

    // Use browser url to determine if we want to connect to dev or prod Bit6 API
    if (location.search.indexOf('env=dev') >= 0) {
        // Demo for development environment
        opts = {
            apikey: '91aaadb643df4107acb2797414ccdf75',
            env: 'dev'
        };
    }

    // Initialize Auth helper service
    var authSvc = new bit6.Auth(opts);

    // Get configured auth strategies
    authSvc.strategies(function(err, arr) {
        console.log('Got strategies', err, arr);
        // Prepare UI for the configured strategies
        for(var i = 0; i < arr.length; i++) {
            var o = arr[i];
            console.log('Enabling strategy: ' + o.id);
            var button = $('#' + o.id + 'Button');
            button.prop('disabled', false);
            switch(o.id) {
                case 'anonymous':
                    button.click(function() {
                        startAnonymousAuth(authSvc, deviceId);
                    });
                    break;
                case 'facebook':
                    loadFbSdk(o.params.client_id);
                    button.click(function() {
                        startFacebookAuth(authSvc, deviceId);
                    });
            }
        }
    });

    $('#restartButton').click(function() {location.reload()});
});
