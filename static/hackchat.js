// Adapted closely from https://webrtc.github.io/samples/src/content/datachannel/messaging/main.js
function random_username() { return `guest${Math.floor(Math.random()*1000)}`; }

class ServerTalk {
    constructor(messagebox, userbox) {
        this.connected = false;
        this.peers = {};
        this.messagebox = messagebox;
        this.userbox = userbox;
        this.displayName = random_username();
        this.peerDivs = {};
    }

    setUsername(username) {
        if (window.loggedIn && username == "zachary") {
            this.displayName = "✬"+username;
        } else if (window.loggedIn) {
            this.displayName = "☆"+username;
        } else {
            this.displayName = "~" + username;
        }
    }

    makeMessageDiv(message) {
		let extraClass="";
        //let extraClass = "message-notme tri-right border btm-left-in text-box";
        //if (message.from == this.displayName) extraClass = "message-me tri-right border btm-right-in text-box";
        
        return $(`<div class="message message-${message.type} ${extraClass}"><div class="author">${message.from}</div><div class="message-text">${message.message}</div></div>`);
    }

    makePeerDiv(peer) {
        return $(`<div class="user">${peer.displayName}</div>`);
    }

    async ajax(url, data, success) {
        $.ajax({
            url: `${window.ajaxPrefix}${url}`,
            method: "POST",
            data: JSON.stringify(data),
            dataType: 'json',
            contentType: 'application/json',
            success: success
        });

    }

    async connect() { this.ajax("/ajax/connect",
        {
            displayName: this.displayName,
        },
        (result) => {
            this._onReceiveResponse(result);
            if (!this.connected) this.scheduleKeepalive(5000);
            this.connected = true;
            this.emote("joined the chat.")
        }
    )}

    scheduleKeepalive(duration) {
        setInterval(this.keepAlive.bind(this), duration);
    }

    async emote(message) {
        return await this.broadcast({
            from: this.displayName,
            message: message,
            type: "emote"
        });
    }
    async say(message) {
        return await this.broadcast({
            from: this.displayName,
            message: message,
            type: "say"
        });
    }
    async sayPrivate(peerId, message) {
        return await this.send(peerId, {
            from: this.displayName,
            message: message,
            type: "say"
        });
    }

    async send(peerId, message) { this.ajax("/ajax/send",
        {
            id: this.id,
            peerId: peerId,
            message: message
        },
        this._onReceiveResponse.bind(this)
    )}

    async broadcast(message) { this.ajax("/ajax/broadcast",
        {
            id: this.id,
            message: message
        },
        this._onReceiveResponse.bind(this)
    )}

    async keepAlive() { this.ajax("/ajax/keepalive",
        {
            id: this.id
        },
        this._onReceiveResponse.bind(this)
    )}

    _onReceivePeer(peer) {
        if (!this.peers[peer.id]) {
            console.log("[server] new peer", peer);
            this.peers[peer.id] = peer;
            this.peerDivs[peer.id] = this.makePeerDiv(peer);
            this.userbox.append(this.peerDivs[peer.id]); // TODO: Put in the correct place in the list
        } else {
            //console.log("[server] existing peer", peer);
        }
    }

    _onRemovedPeer(id) {
        console.log("[server] peer vanished", this.peers[id]);
        delete this.peers[id];
        this.peerDivs[id].remove();
        delete this.peerDivs[id]
    }

    _onReceiveId(id) {
        console.log("[server] set id", id);
        this.id = id;
    }

    _onReceiveMessage(message) {
        console.log("[server] message", message);
        const content = $("#messages");
        const div = this.makeMessageDiv(message);
        this.messagebox.append(div);
        this.messagebox.scrollTop(this.messagebox[0].scrollHeight);
    }

    _onReceiveResponse(response) {
        if (response.id) this._onReceiveId(response.id);
        if (response.peers) {
            for (const p in response.peers) {
                this._onReceivePeer(response.peers[p]);
            }
            for (const p in this.peers) {
                if (!response.peers[p]) this._onRemovedPeer(p);
            }
        }
        if (response.messages) {
            for (const m of response.messages) this._onReceiveMessage(m);
        }
    }
}

window.onload = (event) => {
    const server = window.server = new ServerTalk($("#messagebox"), $("#userbox"));
    const name = $("#username");
    if (window.loggedIn) {
        server.setUsername(name.val()); 
        server.connect(); 
    } else {
        $("#connect").on('click', () => {
            const username = name.val() || random_username();
            server.setUsername(username);
            server.connect(); 
            $("#guestlogin").hide();
            $(".compose").show();
        });
    }
    const message = $("#message");
    $("#sendbutton").on('click', () => {
        const m = message.val();
        console.log("sending message:", m);
        if (!m) {
            console.log("Refusing to send empty message");
            return;
        }
        message.val("");
        server.say(m);
    });
};
