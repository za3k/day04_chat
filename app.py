#!/bin/python3
import flask, flask_login
from datetime import datetime,timedelta
import random
from base import app,load_info,ajax

# -- Info for every Hack-A-Day project --
load_info({
    "project_name": "Hack Chat",
    "source_url": "https://github.com/za3k/day04_chat",
    "subdir": "/hackaday/chat"
})

# -- Routes specific to this Hack-A-Day project --

class Peer():
    peers = {}
    def __init__(self, color, username, display_name):
        self.display_name = display_name
        self.id = "client"+str(random.randint(10000,99999))
        self.lastseen = datetime.now()
        self.messages = []
        self.color = color
        self.username = username
        Peer.peers[self.id] = self
    def receive_message(self, message):
        self.messages.append(message)
    def get_messages(self):
        self.messages, messages = [], self.messages
        return messages
    def was_seen(self):
        self.lastseen = datetime.now()
    def get(self):
        return {
            "id": self.id,
            "displayName": self.display_name,
			"username": self.username,
            "color": self.color,
        }
    @classmethod
    def find(cls, id):
        return cls.peers.get(id)
    @classmethod
    def _delete_stale(cls):
        stale = []
        for p,peer in cls.peers.items():
            if peer.lastseen + timedelta(minutes=1) <= datetime.now():
                stale.append(p)
        for p in stale:
            del cls.peers[p]
    @classmethod
    def get_all(cls):
        Peer._delete_stale()
        return { p: peer.get() for p,peer in cls.peers.items() }

@app.route("/")
def index():
    return flask.render_template('index.html')

@ajax("/ajax/connect")
def ajax_connect(json):
    me = Peer(display_name=json["displayName"], color=json["color"], username=json["username"])
    return {
        "id": me.id,
        "peers": Peer.get_all(),
        "messages": me.get_messages(),
    }

@ajax("/ajax/send")
def ajax_send(json):
    sender = Peer.find(json["id"])
    receiver = peers.find(json["peerId"])
    message = json["message"]
    sender.was_seen()
    if receiver:
        receiver.receive_message(message)
        return {
            success: True,
            "messages": sender.get_messages(),
        }
    else:
        return {
            success: False,
            "messages": sender.get_messages(),
        }

@ajax("/ajax/broadcast")
def ajax_broadcast(json):
    sender = Peer.find(json["id"])
    message = json["message"]
    sender.was_seen()
    for peer in Peer.peers.values():
        peer.receive_message(message)
    return {
        "peers": Peer.get_all(),
        "messages": sender.get_messages(),
    }

@ajax("/ajax/keepalive")
def ajax_keepalive(json):
    id = json["id"]
    me = Peer.find(id)
    me.was_seen()
    return {
        "peers": Peer.get_all(),
        "messages": me.get_messages(),
    }
