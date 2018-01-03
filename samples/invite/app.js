
function startApp(token) {

    var accessToken = new bit6.AccessToken(token);
    accessToken.on('expired', function(t) {
        console.log('AccessToken expired, need to renew', t);
    });
    console.log('AccessToken', accessToken);

    $('.loggedInAddress').text(accessToken.identity + '/' + accessToken.device);

    // Init Signal Service
    var signalSvc = new bit6.Signal(accessToken);

    // Init Invite Service
    var inviteSvc = new bit6.Invite(signalSvc);
    inviteSvc.on('invite', function(invite) {
        console.log('Incoming invite received', invite);
        invite.on('timeout', function(payload) {
            console.log('Incoming invite timeout', invite, payload);
        });
        invite.on('handled', function() {
            console.log('Incoming invite already handled', invite);
        });
        if (location.search.indexOf('reply=accept') > 0) {
            setTimeout(function() {invite.accept({text: 'happy to talk'});}, 3000);
        }
        if (location.search.indexOf('reply=reject') > 0) {
            setTimeout(function() {invite.reject({text: 'cannot talk right now'});}, 3000);
        }
    });

    // Invite a user to join a Session
    $('#inviteButton').click(function() {
        var to = $('#dest').val();
        if (to) {
            $('#dest').val('');
            console.log('Invite clicked', to);
            var incomingText = 'Incoming call from ' + accessToken.identity;
            var missedText = 'Missed call from ' + accessToken.identity;
            var message = {
                to: to,
                ttl: 10,
                payload: {
                    signal: {
                        text: incomingText
                    },
                    apns: {
                        aps: {
                            alert: incomingText
                        }
                    },
                    fcm: {
                        data: {
                            subject: incomingText
                        }
                    }
                },
                timeout: {
                    signal: {
                        text: missedText
                    },
                    apns: {
                        aps: {
                            alert: missedText
                        }
                    },
                    fcm: {
                        data: {
                            subject: missedText
                        }
                    }
                }
            };
            inviteSvc.send(message, function(err, invite) {
                console.log('Outgoing invite sent', err, invite);
                invite.on('timeout', function() {
                    console.log('Outgoing invite timeout', invite);
                })
                invite.on('accept', function(payload) {
                    console.log('Outgoing invite accepted', invite, payload);
                })
                invite.on('reject', function(payload) {
                    console.log('Outgoing invite rejected', invite, payload);
                })

                if (location.search.indexOf('cancel=true') > 0) {
                   setTimeout(function() {invite.cancel();}, 2000);
                }
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
