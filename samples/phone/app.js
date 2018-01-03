
function startApp(token) {

    var accessToken = new bit6.AccessToken(token);
    accessToken.on('expired', function(t) {
        console.log('AccessToken expired, need to renew', t);
    });
    console.log('AccessToken', accessToken);

    $('.loggedInAddress').text(accessToken.identity + '/' + accessToken.device);

    // Init Signal Service
    var signalSvc = new bit6.Signal(accessToken);

    // Init Video Service
    var videoSvc = new bit6.Video(signalSvc);
    window.videoSvc = videoSvc;

    // Make a call to a phone number
    $('#inviteButton').click(function() {
        var to = $('#dest').val();
        if (to) {
            //$('#dest').val('');
            var callerid = '18324134080'
            console.log('Phone call to', to);
            // Create WebRTC session in SIP dialog mode
            videoSvc.create({mode: 'sip'}, function(err, session) {
                console.log('SIP Session created', err, session);
                session.dial(to, callerid, function(err, invite) {
                    // Similar to app-to-app Invite Svc, you can do invite.cancel()
                });
            });
            // Listen to Session events - created / deleted
            videoSvc.on('session', function(s, op) {
                var txt = op < 0 ? '' : s.id;
                $('.sessionId').text(txt);
            });
        }
        return false;
    });

    $('#dest').keyup(function(e) {
        var code = e.which;
        if (code === 13) {
            e.preventDefault();
            $('#inviteButton').click();
        }
    });

    // End all sessions
    $('#endAllButton').click(function() {
        for(var k in videoSvc.sessions) {
            var s = videoSvc.sessions[k];
            s.leave();
        }
        return false;
    });
}


// Fetch user JWT token from a sample service
function fetchToken(identity, device, cb) {
    var data = {
        identity: identity,
        device: device
    };
    var url = 'https://bit6-demo-token-svc.herokuapp.com/token';
    // Use browser url to determine if we want to connect to dev or prod Bit6 API
    if (location.search.indexOf('env=dev') >= 0) {
        url += '?env=dev';
    }
    else if (location.search.indexOf('env=local') >= 0) {
        url = 'https://localhost:5001/token';
    }

    $.ajax({
        type: 'POST',
        url: url,
        data: data,
        success: function(resp) {cb(null, resp.token);}
    });
}


$(function() {

    var user = 'john';
    var deviceId = 'web' + Math.floor((Math.random() * 1000) + 1);
    // Very advanced user selector based on the hash in the browser address bar
    if (location.hash) {
        var t = location.hash.substring(1).toLowerCase();
        var arr = t.split('/');
        if (arr.length > 0) {
            user = arr[0];
        }
        if (arr.length > 1) {
            deviceId = arr[1];
        }
    }


    fetchToken(user, deviceId, function(err, token) {
        console.log('Got token', token, err);
        // We just need a JWT token to start using the Communications Services
        startApp(token);
    });

});
