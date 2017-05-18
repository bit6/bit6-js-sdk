
// Changes in video elements
// v - video element to add or remove
// s - Video Session. null for a local video feed
// p - Participant. null for local video feed
// op - operation. 1 - add, 0 - update, -1 - remove
function handleVideoElemChange(v, s, p, op) {
    var vc = $('#videoContainer');
    if (op < 0) {
        vc[0].removeChild(v);
    }
    else if (op > 0) {
        // Remote video
        if (p) {
            v.setAttribute('class', 'remote');
            vc.append(v);
        }
        // Local video, insert as the first child node
        else {
            v.setAttribute('class', 'local');
            vc.prepend(v);
        }
    }
    // Total number of video elements (local and remote)
    var n = vc[0].children.length;
    if (op !== 0) {
        vc.toggle(n > 0);
    }
    console.log('VIDEO elems.count: ' + n);
    var rn = vc.children('.remote').length;
    // Use number of remote video elems to determine the layout using CSS
    var kl = rn > 1 ? 'grid' : 'simple';
    vc.attr('class', kl);
}


function startApp(token) {

    var accessToken = new bit6.AccessToken(token);
    accessToken.on('expired', function(t) {
        console.log('AccessToken expired, need to renew', t);
    });
    console.log('AccessToken', accessToken);

    $('.loggedInAddress').text(accessToken.identity);

    // Init Signal Service
    var signalSvc = new bit6.Signal(accessToken);
    // We will get direct messages about call invite / hangup
    signalSvc.on('message', function(msg) {
        // See the code in 'inviteButton' click handler about
        // this signal message payload
        var t = msg.type;
        // Sender will contain a full addres of the other
        // user's client connection: identity/device/route
        var sender = msg.from;
        var ident = sender.split('/')[0];
        if (t === 'invite') {
            var sessionId = msg.data;
            console.log('Invite from', ident, 'to join a Session id=', sessionId);
            // Automatically accepting - by joining the session
            // If we want to reject the invite, we could send another signal
            // back to the invitor
            videoSvc.join(sessionId, function(err, s) {
                // Publish all my media into the Session
                //s.me.publish({audio: true, video: true});
            });
        }
    });
    // Init Video service
    var videoSvc = new bit6.Video(signalSvc);
    videoSvc.on('session', function(session, op) {
        console.log('Video session', op, session);
        // Adjust UI
        $('#join').toggleClass('hidden', op > 0);
        $('#info').toggleClass('hidden', op < 0 );
        // New Video Session added
        if (op > 0) {
            $('.sessionId').text(session.id);
            // Listen to the changes in the Participants in this Session
            session.on('participant', function(p, op) {
                // New remote Participant joined
                if (op > 0) {
                    // Subscribe to all media published by this remote Participant
                    p.subscribe({audio: true, video: true});
                }
                // Participant has left
                else if (op < 0) {
                    // If this was the last remote Participant, let's leave the session too
                    // since we are simulating a person to person calling
                    session.leave();
                }
            });
            // Handle Video elements from this session
            session.on('video', function(v, p, op) {
                handleVideoElemChange(v, session, p, op);
            });
            // Publish local audio + video into the Session
            session.me.publish({audio: true, video: true});
        }
        // Video Session removed
        else if (op < 0) {
            $('.sessionId').text('');
        }
    });
    // Local video feed element available
    videoSvc.capture.on('video', function(v, op) {
        console.log('Local video elem', op, v);
        handleVideoElemChange(v, null, null, op);
    });

    // Invite a user to join a Session
    $('#inviteButton').click(function() {
        var to = $('#dest').val();
        if (to) {
            $('#dest').val('');
            console.log('Invite clicked', to);
            // Create a new Video Session
            videoSvc.create({mode: 'p2p'}, function(err, s) {
                console.log('Created session', s.id);
                // Let's send its ID to the recipient so he/she can join
                // We invent our own signaling format.
                signalSvc.send({to: to, type: 'invite', data: s.id});
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

    // Leave all ongoing Session(s)
    $('#leaveButton').click(function() {
        for(var id in videoSvc.sessions) {
            var s = videoSvc.sessions[id];
            s.leave();
        }
        return false;
    });
}



$(function() {

    var user = 'john';
    // Very advanced user selector based on the hash in the browser address bar
    if (location.hash) {
        user = location.hash.substring(1).toLowerCase();
    }

    function fetchToken(identity, device, cb) {
        var data = {
            identity: identity,
            device: device
        };
        $.ajax({
            type: 'POST',
            url: 'https://bit6-demo-token-svc.herokuapp.com/token',
            data: data,
            success: function(resp) {cb(null, resp.token);}
        });
    }

    var deviceId = 'web' + Math.floor((Math.random() * 1000) + 1);

    fetchToken(user, deviceId, function(err, token) {
        console.log('Got token', token, err);
        // We just need a JWT token to start using the Communications Services
        startApp(token);
    });

});
