
// Initialize the application
// b6 - an instance of Bit6 SDK
function initApp(b6) {

    // Disable all audio in this demo
    var disableAudio = false;
    // Use 'mix' media mode for new calls
    var useMixMediaMode = false;
    // Current Chat
    var currentChatUri = null;
    // Timer to clear the 'user typing label'. Should be in SDK?
    var typingLabelTimer = 0;
    // Current Group
    var currentGroupId = null;

    // Incoming call from another user
    b6.on('incomingCall', function(c) {
        console.log('Incoming call', c);
        attachCallEvents(c);
        // c.invite is populated with the information about the user
        // who sent this call request
        var i = c.invite;
        // Try to get the sender name as the caller wanted it to be show.
        // If not specified, do local lookup
        var fromName = i.sender_name ? i.sender_name : b6.getNameFromIdentity(c.other);
        // Do we have a group name for this call?
        var groupName = i.group_name;
        // Let's format the incoming call message based on the information above
        var vid = c.options.video ? ' video' : '';
        var from, info;
        // Do we have a group name?
        if (typeof groupName !== 'undefined') {
            from = groupName.length > 0 ? groupName : 'a group';
            from = 'Join ' + from + vid + ' call...';
            info = 'Invited by ' + fromName;
        }
        // No group name
        else {
            from = fromName + ' is' + vid + ' calling...';
            info = 'Do you dare to answer this call?';
        }
        $('#incomingCallFrom').text(from);
        $('#incomingCallInfo').text(info);
        $('#incomingCall')
            .data({'dialog': c})
            .show();
    });

    // A conversation has changed
    b6.on('conversation', function(c, op) {
        //console.log('onConv', c);
        onConversationChange(c, op);
    });

    // A message has changed
    b6.on('message', function(m, op) {
        //console.log('onMsg', m);
        onMessageChange(m, op);
    });

    // A group has changed
    b6.on('group', function(g, op) {
        console.log('onGrp', op, g);
        // Is this the currently selected group?
        if (currentGroupId === g.id) {
            // Update GroupInfo modal UI
            populateGroupInfoModal(g);
        }
    });

    // Got a real-time notification
    b6.on('notification', function(m) {
        console.log('demo got rt notification', m);
        if (m.type === 'typing') {
            var isSentToGroup = m.to.indexOf('grp:') === 0;
            var key = isSentToGroup ? m.to : m.from;
            if (key === currentChatUri) {
                showUserTyping(m.from);
            }
        }
    });

    // Changes in video elements
    // v - video element to add or remove
    // c - Dialog - call controller. null for a local video feed
    // op - operation. 1 - add, 0 - update, -1 - remove
    b6.on('video', function(v, c, op) {
        var vc = $('#videoContainer');
        if (op < 0) {
            vc[0].removeChild(v);
        }
        else if (op > 0) {
            v.setAttribute('class', c ? 'remote' : 'local');
            vc.append(v);
        }
        // Total number of video elements (local and remote)
        var n = vc[0].children.length;
        if (op !== 0) {
            vc.toggle(n > 0);
        }
        console.log('VIDEO elems.count: ' + n);
        // Use number of video elems to determine the layout using CSS
        var kl = n > 2 ? 'grid' : 'simple';
        vc.attr('class', kl);
    });


    // Common click handler for signup and login buttons
    function authClicked(isNewUser) {
        $('#authError').html('');
        // Convert username to an identity URI
        var ident = 'usr:' + $('#authUsername').val();
        var pass = $('#authPassword').val();
        // Call either login or signup function
        var fn = isNewUser ? 'signup' : 'login';
        b6.session[fn]({'identity': ident, 'password': pass}, function(err) {
            if (err) {
                console.log('auth error', err);
                var msg = isNewUser ? 'New user' : 'Login';
                msg += ': ' + err.message;
                $('#authError').html('<p>' + msg + '</p>');
            }
            else {
                console.log('auth done');
                $('#authUsername').val('');
                $('#authPassword').val('');
                loginDone();
            }
        });
        return false;
    }

    // User has completed the login procedure
    function loginDone() {
        // The logged-in user display name
        var name = b6.getNameFromIdentity(b6.session.identity);
        b6.session.displayName = name;
        // Update the UI
        $('#welcome').toggle(false);
        $('#main').removeClass('hidden');
        $('#loggedInNavbar').removeClass('hidden');
        $('#loggedInUser').text( b6.session.displayName );
        selectFirstChat();
        $('body').removeClass('detail');
    }

    // Show the first chat
    function selectFirstChat() {
        // Do we have more chats?
        var chats = $('#chatList').children();
        if (chats.length > 0) {
            // Simulate a click on the first chat
            console.log('Selecting first chat');
            chats.first().click();
        }
        // No more chats
        else {
            // Clear message lists etc
            console.log('No more chats to select');
            showChat(null);
        }
    }

    // Update Conversation View
    function onConversationChange(c, op) {
        var chatList = $('#chatList');
        var tabId = tabDomIdForConversation(c);
        var msgsId = msgsDomIdForConversation(c);
        var tabDiv = $(tabId);
        var msgsDiv = $(msgsId);

        // Conversation deleted
        if (op < 0) {
            if (!c.deleted) {
                console.log('Warning: Deleting a conversation with no deleted property!', c);
            }
            if (tabDiv.length === 0 || msgsDiv.length === 0) {
                console.log('Warning: Deleting a conversation with no DOM element!', c);
            }
            tabDiv.remove();
            msgsDiv.remove();
            // Current conversation was deleted
            if (c.id === currentChatUri) {
                // Select the first chat
                selectFirstChat();
            }
            return;
        }

        // New conversation
        if (op > 0) {
            if (c.deleted) {
                console.log('Error: Adding a deleted conversation', c);
                return;
            }
            if (tabDiv.length > 0 || msgsDiv.length > 0) {
                console.log('Error: Adding a conversation that has DOM elements!', c);
            }

            // Entry in the Chat List
            tabDiv = $('<div class="tab" />')
                .attr('id', tabId.substring(1))
                .append('<strong />')
                .append('<span />')
                .append('<em />');
            chatList.append(tabDiv);
            // Create a container for message list for this conversation
            msgsDiv = $('<div class="msgs" />')
                .attr('id', msgsId.substring(1))
                .hide();
            $('#msgList').append(msgsDiv);
        }


        // Update Conversation data
        var stamp = getRelativeTime(c.updated);
        var latestText = '';
        var lastMsg = c.getLastMessage();
        if (lastMsg) {
            // Show the text from the latest conversation
            if (lastMsg.content) {
                latestText = lastMsg.content;
            }
            // If no text, but has an attachment, show the mime type
            else if (lastMsg.data && lastMsg.data.type) {
                latestText = lastMsg.data.type;
            }
        }
        var title = b6.getNameFromIdentity(c.id);
        if (c.unread > 0) {
            title += ' (' + c.unread + ')';
        }

        // Apply data to DOM
        tabDiv.children('strong').html(title);
        tabDiv.children('span').html(latestText);
        tabDiv.children('em').html(stamp);

        // If the updated conversation is newer than the top one -
        // move this conversation to the top
        var top = chatList.children(':first');
        if (top.length > 0) {
            var topTabId = top.attr('id');
            var topConvId = domIdToConversationId(topTabId);
            var topConv = b6.getConversation(topConvId);
            if (topConv && topConv.id !== c.id && c.updated > topConv.updated) {
                top.before(tabDiv);
            }
        }
        // Is this the current conversation?
        if (c.id === currentChatUri) {
            // Update chat title
            showChatTitle();
        }
    }

    // Update Message View
    function onMessageChange(m, op) {
        var divId = domIdForMessage(m);
        var div = $(divId);

        // Message deleted
        if (op < 0) {
            console.log('Deleting msg div', m);
            if (!m.deleted) {
                console.log('Warning: Deleting a message with no deleted property!', m);
            }
            if (div.length === 0) {
                console.log('Warning: Deleting a message with no DOM element!', m);
            }
            div.remove();
            return;
        }

        // Message added
        if (op > 0) {
            if (m.deleted) {
                console.log('Error: Adding a deleted message', m);
                return;
            }
            if (div.length > 0) {
                console.log('Error: Adding a message that has a DOM element!', m);
            }

            var cssClass = m.incoming() ? 'other' : 'me';

            div = $('<div class="msg ' + cssClass + '" />').attr('id', divId.substring(1));

            // This message has an attachment
            if (m.data && m.data.type) {
                var attachType = m.data.type;
                var href = m.data.attach;
                // We have a thumbnail and this is not an audio file
                if (m.data.thumb && attachType.indexOf('audio/') < 0) {
                    var thumbImg = m.data.thumb;
                    div.append('<a class="thumb" href="' + href + '" target="_new"><img src="' + thumbImg + '" /></a>');
                }
                // Show Play button
                else {
                    var btn = $('<button class="btn btn-info"/>')
                        .text('Play')
                        .data('src', href)
                        .click(function() {
                            var src = $(this).data('src');
                            var audio = new Audio(src);
                            audio.play();
                        });
                    div.append(btn);
                }
            }
            // Message content to show
            var text = m.content;

            // This is a call history item
            if (m.isCall()) {
                var ch = m.channel();
                var r = [];
                if (ch & bit6.Message.AUDIO) {
                    r.push('Audio');
                }
                if (ch & bit6.Message.VIDEO) {
                    r.push('Video');
                }
                if (ch & bit6.Message.DATA) {
                    if (r.length === 0) {
                        r.push('Data');
                    }
                }
                text = r.join(' + ') + ' Call';
                if (m.data && m.data.duration) {
                    var dur = m.data.duration;
                    var mins = Math.floor(dur / 60);
                    var secs = dur % 60;
                    text += ' - ' + (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
                }
            }

            // Text content
            if (text) {
                div.append('<span>' + text + '</span>');
            }
            // Timestamp
            div.append('<i />');
            // Message status
            div.append('<em />');

            // Find the container for this message
            var convId = m.getConversationId();
            var c = b6.getConversation(convId);
            var msgsDiv = $( msgsDomIdForConversation(c) );
            msgsDiv.append(div);

            // If the conversation for this message is visible
            if (msgsDiv.is(':visible')) {
                // Scroll to the bottom of the conversation
                scrollToLastMessage();
                // Mark this new message as read since it is on the screen
                if (m.incoming()) {
                    b6.markMessageAsRead(m);
                }
                // If we had user 'typing' indicator - clear it
                showUserTyping(false);
            }
        }

        // Update Message data

        // Latest updated stamp
        var stamp = getRelativeTime(m.updated);

        // Status string
        var status;
        if (m.incoming()) {
            status = b6.getNameFromIdentity(m.other) + ' ' + m.getStatusString();
        }
        else {
            status = getMessageStatusString(m);
        }

        // Apply data to DOM
        div.children('i').text(stamp);
        div.children('em').text(status);
    }

    function showUserTyping(ident) {
        clearInterval(typingLabelTimer);
        if (ident) {
            typingLabelTimer = setTimeout(function() {
                $('#msgOtherTyping').toggle(false);
            }, 10000);
            ident = b6.getNameFromIdentity(ident);
            var txt = ident + ' is typing...';
            $('#msgOtherTyping').html(txt);
        }
        $('#msgOtherTyping').toggle(ident ? true : false);
    }


    function getMessageStatusString(m) {
        // Is this an outgoing message?
        if (!m.incoming()) {
            // Is the message being sent?
            if (m.status() === bit6.Message.SENDING) {
                // Do we have upload progress info?
                if (m.progress && m.total) {
                    var s = '' + m.progress;
                    // We know total size of the message attachments
                    if (m.total > 0) {
                        var perc = Math.floor(m.progress * 100 / m.total);
                        s = perc + '% of ' + ( m.total < 1024 ? m.total : (m.total >> 10) + 'k' );
                    }
                    return s;
                }
            }
            // Multiple destinations
            if (m.others) {
                var d = [];
                // Was it delievered to any destinations?
                for(var i=0; i < m.others.length; i++) {
                    var o = m.others[i];
                    if (o.status === bit6.Message.DELIVERED || o.status === bit6.Message.READ) {
                        d.push(b6.getNameFromIdentity(o.uri) + ' ' + o.status);
                    }
                }
                // List destinations it was delivered to
                if (d.length) {
                    return d.join(', ');
                }
            }
        }
        return m.getStatusString();
    }

    function getRelativeTime(stamp) {
        var now = Date.now();
        // 24 hours in milliseconds
        var t24h = 24 * 60 * 60 * 1000;
        var d = new Date(stamp);
        var s = (now - stamp > t24h) ? d.toLocaleDateString() : d.toLocaleTimeString();
        return s;
    }

    function showChat(uri) {
        console.log('Show messages for', uri);

        //if (uri.indexOf('grp:') == 0) {
        //    b6.api('/groups/'+uri.substring(4), function(err, g) {
        //        console.log('Got group err=', err, 'group=', g);
        //    });
        //}

        // Hide 'user typing' if switching to a different chat
        if (uri !== currentChatUri) {
            showUserTyping(false);
        }

        // Current conversation identity
        currentChatUri = uri;

        // Show current Chat title - participants
        showChatTitle();

        // Nothing to show
        if (!uri) {
            $('#chatButtons').toggle(false);
            $('body').removeClass('detail');
            return;
        }

        $('body').addClass('detail');

        var conv = b6.getConversation(uri);
        // Mark all messages as read
        if (b6.markConversationAsRead(conv) > 0) {
            // Some messages have been marked as read
            // update chat list
            console.log('Messages marked as read');
        }

        $('#chatButtons').toggle(true);
        $('#groupInfoButton').toggle(conv.isGroup());

        var msgsDiv = $( msgsDomIdForConversation(conv) );
        // Show only message container for this conversation
        // Hide all the other message containers
        msgsDiv.show().siblings().hide();
        // Scroll to the bottom of the conversation
        scrollToLastMessage();

        // Request focus for the compose message text field
        //$('#msgText').focus();
    }

    function showChatTitle() {
        var uri = currentChatUri;
        var t = '';
        if (uri) {
            var conv = b6.getConversation(uri);
            t = b6.getNameFromIdentity(conv.id);
        }
        $('#chatTitle').text(t);
    }

    // Get jQuery selector for a Message
    function domIdForMessage(m) {
        return '#msg__' + m.domId();
    }

    // Get Chat Tab jQuery selector for a Conversation
    function tabDomIdForConversation(c) {
        return '#tab__' + c.domId();
    }

    // Get Messages Container jQuery selector for a Conversation
    function msgsDomIdForConversation(c) {
        return '#msgs__' + c.domId();
    }

    // Convert element id to a Conversation id
    function domIdToConversationId(id) {
        var r = id.split('__');
        id = r.length > 0 ? r[1] : id;
        return bit6.Conversation.fromDomId(id);
    }

    // Convert element id to a Message id
    function domIdToMessageId(id) {
        var r = id.split('__');
        id = r.length > 0 ? r[1] : id;
        return bit6.Message.fromDomId(id);
    }

    // Scroll to the last message in the messages list
    function scrollToLastMessage() {
        var t = $('#msgList');
        t.scrollTop( t[0].scrollHeight );
    }

    // I wonder what this function does...
    function sendMessage() {
        var text = $('#msgText').val();
        var dest = currentChatUri;
        if (!text || !dest) {
            return;
        }
        $('#msgText').val('');
        console.log ('Send message to=', dest, 'content=', text);
        b6.compose(dest)
            .text(text)
            .send(function(err, m) {
                console.log('sendMessage result=', m, 'err=', err);
            });
    }

    // User selected file(s) to attach to a message
    function handleAttachFiles(files) {
        // files is a FileList of File objects. List some properties.
        for (var i = 0, f; f = files[i]; i++) {
            console.log(f.name + ' - selected - type: ' + (f.type || 'n/a') + ' size: ' + f.size + 'b');
            handleAttachFile(f);
        }
    }

    // Send each attached file as a separate message
    function handleAttachFile(f) {
        var dest = currentChatUri;
        if (!f || !dest) {
            return;
        }
        console.log ('Send attachment to=', dest, 'file=', f);
        b6.compose(dest)
            .attach(f)
            .send(function(err, m) {
                console.log('sendMessage attach result=', m, 'err=', err);
            });
    }

    // User dropped files in the chat messages area
    function handleAttachFilesDrop(e) {
        var evt = e.originalEvent;
        evt.stopPropagation();
        evt.preventDefault();
        // FileList object
        var files = evt.dataTransfer.files;
        handleAttachFiles(files);
    }

    // User is dragging files over the chat messages area
    function handleAttachFilesDragOver(e) {
        var evt = e.originalEvent;
        evt.stopPropagation();
        evt.preventDefault();
        // Explicitly show this is a copy
        evt.dataTransfer.dropEffect = 'copy';
    }

    // Start an outgoing call
    function startOutgoingCall(to, video, screen) {
        var mediaMode = useMixMediaMode ? 'mix' : 'p2p';
        // Outgoing call params
        var opts = {
            audio: !disableAudio,
            video: video,
            screen: screen,
            mode: mediaMode
        };
        // Start the outgoing call
        prepareInCallUI();
        var c = b6.startCall(to, opts);
        attachCallEvents(c);
        c.connect();
        updateInCallUI(c);
    }

    // Start an outgoing phone call
    function startPhoneCall(to) {
        var c = b6.startPhoneCall(to);
        prepareInCallUI();
        attachCallEvents(c);
        c.connect();
        updateInCallUI(c);
    }

    // Attach call state events to a RtcDialog
    function attachCallEvents(c) {
        // Call progress
        c.on('progress', function() {
            showInCallName();
            console.log('CALL progress', c);
        });
        // Call answered
        c.on('answer', function() {
            console.log('CALL answered', c);
        });
        // Error during the call
        c.on('error', function() {
            console.log('CALL error', c);
        });
        // Call ended
        c.on('end', function() {
            showInCallName();
            console.log('CALL ended', c);
            // No more dialogs?
            if (b6.dialogs.length === 0) {
                // Hide InCall UI
                $('#detailPane').removeClass('hidden');
                $('#inCallPane').addClass('hidden');
            }
            // Hide Incoming Call dialog
            // TODO: check that it was for this dialog
            $('#incomingCall')
                .data({'dialog': null})
                .hide();
        });
    }

    function prepareInCallUI() {
        showInCallName();
        $('body').addClass('detail');
        $('#detailPane').addClass('hidden');
        $('#inCallPane').removeClass('hidden');
    }


    function updateInCallUI(c) {
        showInCallName();
        // Allow recording only in media mix mode
        $('#incallRecord').toggle( c.supports('recording') );
        $('#incallRecord').toggleClass('active', c.recording());
        $('#incallVideo').toggleClass('active', c.options.video);
        $('#incallScreen').toggleClass('active', c.options.screen);
    }

    // Show all the call participants
    function showInCallName() {
        var s = '';
        for(var i in b6.dialogs) {
            var d = b6.dialogs[i];
            if (i > 0) {
                s += ', ';
            }
            s += b6.getNameFromIdentity(d.other);
        }
        $('#inCallOther').text(s);
    }

    // Show Group Info modal
    function showGroupInfo(g) {
        currentGroupId = g.id;
        // Populate the UI
        populateGroupInfoModal(g);
        // Show modal
        $('#groupInfoModal').modal('show');
    }

    function populateGroupInfoModal(g) {
        $('#groupInfoId').text(g.id);
        $('#groupInfoMe').text(JSON.stringify(g.me));
        $('#groupInfoMetaRaw').text(JSON.stringify(g.meta, null, 2));
        $('#groupInfoPermsRaw').text(JSON.stringify(g.permissions, null, 2));
        $('#groupInfoMembersRaw').text(JSON.stringify(g.members, null, 2));
        var tbody = $('#groupInfoMembers').empty();
        for(var i in g.members) {
            var m = g.members[i];
            console.log('Member', m);
            var tr = $('<tr/>');
            tr.append('<td>' + m.id + '</td>');
            tr.append('<td>' + m.role + '</td>');
            tr.append('<td>' + (m.status ? m.status : '') + '</td>');
            // Leaving myself or kicking somebody else?
            var removeMemberLabel = m.id === g.me.identity ? 'leave' : 'kick';
            if (m.role !== 'left') {
                tr.append('<td><a href="#">' + removeMemberLabel + '</a></td>');
            }
            tbody.append(tr);
        }
    }


    console.log('Bit6 Demo Ready!');

    // Hide 'Typing' notification
    $('#msgOtherTyping').toggle(false);
    // Hide 'IncomingCall' alert
    $('#incomingCall').toggle(false);

    // Fix input elements within dropdown click problem
    $('.dropdown input, .dropdown label').click(function(e) {
        e.stopPropagation();
    });

    if (disableAudio) {
        $('#inCallAudioDisabled').removeClass('hidden');
    }


    // Login click
    $('#loginButton').click(function() {return authClicked(false);});

    // Signup click
    $('#signupButton').click(function() {return authClicked(true);});

    // Click on a tab in the chat list shows the messages
    $('#chatList').on('click', '.tab', function(e) {
        var id = $(this).attr('id');
        var convId = domIdToConversationId(id);
        // Do we have ongoing calls?
        if (b6.dialogs.length > 0) {
            var d = b6.dialogs[0];
            // Add the user to the conversation
            startOutgoingCall(convId, d.options.video);
        }
        // No ongoing calls
        else {
            // Select the chat
            showChat(convId);
        }
    });

    // Clicking on Navbar takes you back into the chat list
    // Useful on small screens
    $('#backToList').click(function() {
        $('body').removeClass('detail');
    });

    // When GroupInfo modal is closed, clear currentGroupId
    $('#groupInfoModal').on('hidden.bs.modal', function () {
        currentGroupId = null;
    });


    // Click on a message deletes it
    //$('#msgList').on('click', '.msg', function(e) {
    //    var id = $(this).attr('id');
    //    var msgId = domIdToMessageId(id);
    //    console.log('Clicked to delete message', msgId);
    //    b6.deleteMessage(msgId, function(err, result) {
    //        console.log('Msg deleted err=', err, 'result=', result);
    //    });
    //});

    // When user clicks on New Chat, give focus to Username
    $('#newChatDropdown').on('shown.bs.dropdown', function () {
        $('#newChatUsername').val('');
        setTimeout(function() {$('#newChatUsername').focus();}, 100);
    });

    // Start a new chat
    $('#newChatStart').click(function() {
        var v = $('#newChatUsername').val().trim();
        console.log('Start chat with' + v);
        // Closes the dropdown but then you cannot open it again
        //$('#newChatDropdown').dropdown('toggle');
        // Slightly hackier way to close the dropdown
        $('body').trigger('click');
        if (v) {
            if (v.indexOf(':') < 0) {
                v = 'usr:' + v;
            }
            b6.addEmptyConversation(v);
            showChat(v);
        }
        return false;
    });

    // Create a new Group
    $('#newGroupCreate').click(function() {
        var t = $('#newGroupTitle').val().trim();
        console.log('Create a group with title: ' + t);
        // Closes the dropdown but then you cannot open it again
        //$('#newChatDropdown').dropdown('toggle');
        // Slightly hackier way to close the dropdown
        $('body').trigger('click');
        var opts = {};
        if (t) {
            opts.meta = {title: t};
        }
        b6.createGroup(opts, function(err, g) {
            console.log('Group created', g, err);
        });
        //showChat(uri);
        return false;
    });

    // Add a new group member
    $('#newMemberButton').click(function() {
        var v = $('#newMemberUsername').val().trim();
        var g = b6.getGroup(currentGroupId);
        if (v && g) {
            $('#newMemberUsername').val('');
            // No URI scheme
            if (v.indexOf(':') < 0) {
                // Assume a username
                v = 'usr:' + v;
            }
            b6.inviteGroupMember(g, v, 'user', function(err) {
                console.log('Member added to group err=', err);
            });
        }
        return false;
    });

    // Send Message click
    $('#sendMsgButton').click(function() {
        console.log('Send message clicked');
        sendMessage();
    });

    // Selected attachment file
    $('#attachFile').change(function(evt) {
        console.log('Attach clicked');
        var files = evt.target.files; // FileList object
        handleAttachFiles(files);
    });

    // Files to attach can be dropped in the messages area
    $('#detailPane')
        .on('dragover', handleAttachFilesDragOver)
        .on('drop', handleAttachFilesDrop);


    // Delete a Conversation
    $('#deleteChatButton').click(function() {
        console.log('Delete current conversation');
        b6.deleteConversation(currentChatUri, function(err) {
            console.log('Conversation deleted');
        });
        return false;
    });

    // Show Group info
    $('#groupInfoButton').click(function() {
        var g = b6.getGroup(currentChatUri);
        console.log('Show group info for ' + currentChatUri, g);
        if (g) {
            showGroupInfo(g);
        }
        return false;
    });

    // Member action in GroupInfo Modal
    $('#groupInfoMembers').on('click', 'a', function(e) {
        console.log(e);
        var t = $(this);
        var idx = t.parents('tr').index();
        console.log('Removing group member idx', idx);
        var g = b6.getGroup(currentChatUri);
        if (g) {
            var m = g.members[idx];
            console.log('Removing group member', m);
            b6.kickGroupMember(g, m, function(err) {
                console.log('Member removal result err=', err);
            });
        }
    });

    // Change Media Mode for new calls
    $('#mediaModeButton').click(function() {
        useMixMediaMode = !useMixMediaMode;
        $(this).text(useMixMediaMode ? 'Media mode: Mix' : 'Media mode: P2P');
    });

    // Start a voice call
    $('#audioCallButton').click(function() {
        console.log('Audio call clicked');
        startOutgoingCall(currentChatUri, false, false);
    });

    // Start a video call
    $('#videoCallDefault').click(function() {
       startOutgoingCall(currentChatUri, true, false);
    });

    $('#videoCallFrontCam').click(function() {
       var videoOpt = {facingMode: 'user'};
       startOutgoingCall(currentChatUri, videoOpt, false);
    });

    $('#videoCallBackCam').click(function() {
       var videoOpt = {facingMode: 'environment'};
       startOutgoingCall(currentChatUri, videoOpt, false);
    });

    // Start a screen sharing call
    $('#screenCallButton').click(function() {
        console.log('ScreenShare call clicked');
        startOutgoingCall(currentChatUri, false, true);
    });

    // Start a phone call
    $('#phoneCallButton').click(function() {
        console.log('Phone call clicked');
        // For this demo, call a helpdesk of a well-known store
        startPhoneCall('+18004663337');
    });

    // Key down event in compose input field
    $('#msgText').keydown(function() {
        console.log('keydown in compose');
        b6.sendTypingNotification(currentChatUri);
    });

    // Send message when user hits Enter
    $('#msgText').keyup(function(e) {
        var code = e.which;
        if (code === 13) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Paste event. If a file is pasted - send it as an attachment
    $('#msgText').on('paste', function(e) {
        var files = [];
        var evt = e.originalEvent;
        var clipboardData = evt.clipboardData || {};
        var items = clipboardData.items || [];
        for (var i = 0; i < items.length; i++) {
            var f = items[i].getAsFile();
            if (f) {
                files.push(f);
            }
        }
        if (files.length > 0) {
            evt.stopPropagation();
            evt.preventDefault();
            handleAttachFiles(files);
        }
    });


    // 'Answer Incoming Call' click
    $('#answerAudio').click(function() {
        var e = $('#incomingCall').hide();
        var d = e.data();
        // Call controller
        if (d && d.dialog) {
            var c = d.dialog;
            // Accept the call, send local audio only
            prepareInCallUI();
            c.connect({audio: true, video: false});
            updateInCallUI(c);
            e.data({'dialog': null});
        }
    });

    $('#answerVideo').click(function() {
        var e = $('#incomingCall').hide();
        var d = e.data();
        // Call controller
        if (d && d.dialog) {
            var c = d.dialog;
            // Accept the call, send local audio+video
            prepareInCallUI();
            c.connect({audio: true, video: true});
            updateInCallUI(c);
            e.data({'dialog': null});
        }
    });

    // 'Reject Incoming Call' click
    $('#reject').click(function() {
        var e = $('#incomingCall').hide();
        var d = e.data();
        // Call controller
        if (d && d.dialog) {
            // Reject call
            d.dialog.hangup();
            e.data({'dialog': null});
        }
    });

    $('#incallRecord').click(function() {
        var x = b6.dialogs.slice();
        // Adjust only the first call controller
        if (x.length > 0) {
            var c = x[0];
            // Toggle recording
            c.recording( !c.recording() );
        }
    });


    $('#incallVideo').click(function() {
        var x = b6.dialogs.slice();
        // Adjust only the first call controller
        if (x.length > 0) {
            var c = x[0];
            // Toggle video
            var t = !c.options.video;
            c.connect({video: t});
            updateInCallUI(c);
        }
    });

    $('#incallScreen').click(function() {
        var x = b6.dialogs.slice();
        // Adjust only the first call controller
        if (x.length > 0) {
            var c = x[0];
            // Toggle screen
            var t = !c.options.screen;
            c.connect({screen: t});
            updateInCallUI(c);
        }
    });

    // 'Call Hangup' click
    $('#hangup').click(function() {
        $('#detailPane').removeClass('hidden');
        $('#inCallPane').addClass('hidden');
        // Hangup all active calls
        var x = b6.dialogs.slice();
        for (var i in x) {
            console.log('multi-hangup: ', x[i]);
            x[i].hangup();
        }
    });

    // Logout click
    $('#logout').click(function() {
        currentChatUri = null;
        $('#welcome').toggle(true);
        $('#main').addClass('hidden');
        $('#loggedInNavbar').addClass('hidden');
        $('#loggedInUser').text('');
        $('#chatList').empty();
        $('#msgList').empty();
        b6.session.logout();
    });

}
