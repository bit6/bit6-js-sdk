
$(function() {

    var tokens = {};

    var prefer = {
        identity: 'bob1',
        device: 'web' + Math.floor((Math.random() * 1000) + 1)
    };

    // Very advanced user and device selector based on the hash in the browser address bar
    if (location.hash) {
        var arr = location.hash.substring(1).toLowerCase().split('/');
        if (arr.length > 0 && arr[0].length > 0) {
            prefer.identity = arr[0];
        }
        if (arr.length > 1 && arr[1].length > 0) {
            prefer.device = arr[1];
        }
    }

    function fetchToken(identity, device, cb) {
        // Use hardcoded token if available
        if (tokens[identity] && tokens[identity].length > 0) {
            return cb(null, tokens[identity]);
        }

        var data = {
            identity: identity,
            device: device
        };

        var url = 'https://bit6-demo-token-svc.herokuapp.com/token';

        // Use browser url to determine if we want to connect to dev or prod Bit6 API
        if (location.search.indexOf('env=dev') > 0) {
            url += '?env=dev';
        }

        $.ajax({
            type: 'POST',
            url: url,
            //url: 'https://localhost:5001/token',
            data: data,
            success: function(resp) {cb(null, resp.token);}
        });
    }


    fetchToken(prefer.identity, prefer.device, function(err, token) {
        console.log('Got token', token, err);
        // We just need a JWT token to start using the Communications Services
        startApp(token);
    });

});


function startApp(token) {

    var accessToken = new bit6.AccessToken(token);
    accessToken.on('expired', function(t) {
        console.log('AccessToken expired, need to renew', t);
        // Fetch the new token from your application server or Bit6 Auth service
        // Then update it by calling:
        // t.update('new-token-here');
    });
    console.log('AccessToken', accessToken);

    $('.loggedInAddress').text(accessToken.claims.sub);

    //var pushSvc = new bit6.Push(accessToken);
    //pushSvc.register({service: 'fcm', token: 'abcxyz'}, function(err, d) {
    //    console.log('Got device', d, err);
    //});
    //pushSvc.unregister(function(err, d) {
    //    console.log('Deleted device', d, err);
    //});

    // Init Signal Service
    var signalSvc = new bit6.Signal(accessToken);

/*
    // Various Signaling tests
    signalSvc.on('message', function(msg) {
        console.log('Received direct signal', msg);
        // Echo it back to the sender
        // Clone the message object
        //var obj = Object.assign({}, msg);
        //obj.to = msg.from;
        //delete obj.from;
        //signal.send(obj);
    });
    // Signal channel named 'cha'
    var cha = signalSvc.join('cha');
    console.log('Joined channel', cha);
    cha.on('message', function(msg) {
        console.log('Received channel signal', msg);
    });

    // Do an RPC call to another service
    signalSvc.conn.rpc('video.sessions.create', {'mode': 'p2p'}, function(err, resp) {
        console.log('video.sessions.create response', err, resp);
    });

    var chb = signalSvc.join('test', {presence: true});
    console.log('Joined channel', chb);
    chb.on('participant', function(p, op) {
        console.log('Participant', op, p);
    });
    chb.on('message', function(msg) {
        console.log('Received channel signal', msg);
    });

    chb.me.updateState( { hello: 'world' } );
*/

/*
    var chatSvc = new bit6.Chat(signalSvc, {sync: true});
    // Expose into browser dev console
    window.chatSvc = chatSvc;

    chatSvc.on('conversation', function(c, op) {
        console.log('Chat Conversation', op, c);
        if (op > 0) {
            c.on('message', function(m, op) {
                console.log('Chat Message', op, m, c);
            });
            c.on('participant', function(p, op) {
                console.log('Chat Participant', op, p, c);
                //p.kick();
            });
            c.me.on('change', function(me) {
                console.log('Chat Me', me, c);
            });
            //for(var i = 0; i < 10; i++) {
            //    c.send({text: 'Hello ' + i + ' from ' + c.me.id});
            //}
            c.add('david11');
        }
    });

    if (accessToken.identity === 'bob1') {
        chatSvc.create({}, function(err, c) {
            console.log('Conversation created', err, c.id);
            c.on('participant', function(p, op) {
                console.log('Participant', op, p.id, p, 'for conversation', c.id);
            });
            c.add('carol1');
            c.add('david11');
            //setInterval(function() {
            //    c.send({text: 'Hola'});
            //}, 5000);
        });
    }
*/

    // Changes in video elements
    // v - video element to add or remove
    // s - Video Session. null for a local video feed
    // p - Participant. null for local video feed
    // op - operation. 1 - add, 0 - update, -1 - remove
    var handleVideoElemChange = function(v, s, p, op) {
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
    };

    var onSubscribeTo = function() {
        var d = $(this).data();
        console.log('SubscribeTo clicked', d);
        if (d && d.participant && d.kind) {
            var isActive = $(this).hasClass('active');
            // Toggle the value
            isActive = !isActive;
            $(this).toggleClass('active', isActive);
            var opts = {};
            opts[d.kind] = isActive;
            d.participant.subscribe(opts);
        }
    };

    // Render a list of Session Participants and their media pub/sub
    var showParticipants = function(s) {
        // For now we just re-render the whole participants list on each change
        $('#sessionParticipants').html('');
        for(var id in s.participants) {
            var o = s.participants[id];
            // Show nicely what media this participant is publishing/subscribing to
            var rpubs = [];
            var rsubs = [];
            var kinds = ['audio', 'video'];
            for(var i in kinds) {
                var kind = kinds[i];
                if (o.pub && o.pub[kind]) {
                    rpubs.push(kind);
                }
                if (o.sub && o.sub[kind]) {
                    rsubs.push(kind);
                }
            }
            var subAudio = $('<button>')
                .attr('class', 'btn btn-default btn-xs')
                .text('Audio')
                .data({participant: o, kind: 'audio'})
                .click(onSubscribeTo)
                .toggleClass('active', o.subTo.audio);

            var subVideo = $('<button>')
                .attr('class', 'btn btn-default btn-xs')
                .text('Video')
                .data({participant: o, kind: 'video'})
                .click(onSubscribeTo)
                .toggleClass('active', o.subTo.video);

            var title = $('<div/>')
                .text(o.id);
            var lsub = $('<div/>')
                .append('<span> - Sub to remote: </span>')
                .append(subAudio)
                .append(' ')
                .append(subVideo);
            var rpub = $('<div/>')
                .text(' - Remote pub: ' + rpubs.join(', '));
            var rsub = $('<div/>')
                .text(' - Remote sub to my: ' + rsubs.join(', '));
            var e = $('<div/>')
                .append(title)
                .append(lsub)
                .append(rpub)
                .append(rsub)
                .appendTo('#sessionParticipants');
        }
    };

    var videoSvc = new bit6.Video(signalSvc);
    // Expose into browser dev console
    window.videoSvc = videoSvc;

    videoSvc.on('session', function(s, op) {
        console.log('Video session', op, s);
        // We are allowing just one session at a time.
        if (op > 0) {
            $('.sessionId').text(s.id);
            $('.sessionMode').text(s.options.mode);
            $('#pubAudio').toggleClass('active', false);
            $('#pubVideo').toggleClass('active', false);
            // Changes to local media pub/sub
            s.me.on('change', function() {
                var pub = s.me.pub;
                $('#pubAudio').toggleClass('active', pub.audio);
                $('#pubVideo').toggleClass('active', pub.video);
            });

            s.on('participant', function(p, op) {
                // New Participant joined
                if (op > 0) {
                    // Re-render participants when one of them changes pub/sub media
                    // TODO: Should just update the change participant
                    p.on('change', function() {
                        showParticipants(s);
                    });
                    // Subscribe to all media published by this participant
                    p.subscribe({audio: true, video: true});
                }
                showParticipants(s);
            });
            s.on('video', function(v, p, op) {
                handleVideoElemChange(v, s, p, op);
            });
        }
        else if (op < 0) {
            // Clear Session UI
            $('.sessionId').text('');
            showParticipants(s);
        }
        else {
            return;
        }
        $('#join').toggleClass('hidden', op > 0);
        $('#info').toggleClass('hidden', op < 0 );
    });
    // Local video feed element available
    videoSvc.capture.on('video', function(v, op) {
        console.log('Local video elem', op, v);
        handleVideoElemChange(v, null, null, op);
    });


    // Start P2P Session
    $('#createP2pButton').click(function() {
        videoSvc.create({mode: 'p2p'}, function(err, s) {
            console.log('Created session', s.id);
        });
        return false;
    });

    // Start SFU Session
    $('#createSfuButton').click(function() {
        videoSvc.create({mode: 'sfu'}, function(err, s) {
            console.log('Created session', s.id);
        });
        return false;
    });

    // Join Session
    $('#joinButton').click(function() {
        var to = $('#dest').val();
        if (to) {
            $('#dest').val('');
            console.log('Join Session clicked', to);
            var s = videoSvc.join(to);
            // Inititally do not publish anything
            //s.me.publish();
        }
        return false;
    });

    // Leave Session(s)
    $('#leaveButton').click(function() {
        for(var id in videoSvc.sessions) {
            var s = videoSvc.sessions[id];
            s.leave();
        }
        return false;
    });


    $('#dest').keyup(function(e) {
        var code = e.which;
        if (code === 13) {
            e.preventDefault();
            $('#joinButton').click();
        }
    });

    $('#pubAudio').click(function() {
        var isActive = $(this).hasClass('active');
        for(var id in videoSvc.sessions) {
            videoSvc.sessions[id].me.publish({audio: !isActive});
        }
        return false;
    });

    $('#pubVideo').click(function() {
        var isActive = $(this).hasClass('active');
        for(var id in videoSvc.sessions) {
            videoSvc.sessions[id].me.publish({video: !isActive});
        }
        return false;
    });

}
