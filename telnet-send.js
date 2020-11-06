

module.exports = function (RED) {
    const te = require('telnet-engine')
    function senderNode(config) {

        RED.nodes.createNode(this, config);
        var node = this;
        var server = RED.nodes.getNode(config.connection);
        var engine = null;
        var statusBroadcasting = null;
        var statusVal = { fill: "grey", shape: "ring", text: "idle" };
        var statusResetter = null;

        if (server) {
            engine = server.engine
            var statusSender = server.getStatusBroadcaster();
            statusBroadcasting = statusSender.thenAgain(
                (st) => {
                    statusVal = Object.assign(statusVal, st);
                    this.status(statusVal);
                })
        }


        const setStatus = (state) => {
            clearTimeout(statusResetter);
            if (state) {
                statusVal['shape'] = "dot"    
                statusResetter = setTimeout(() => { setStatus(false) }, 500)
            }
            else {
                statusVal['shape'] = "ring"
            }
            this.status(statusVal);
        }

        setStatus(false);



        node.on('input', function (msg, send, done) {


            if (engine) {
                setStatus(true);
                engine.requestString(msg.payload.toString(), te.noResponse())
           }
            done()

        })

        node.on('close', function () {
            if (statusBroadcasting) { statusBroadcasting.resolve(); }
        });
}

    RED.nodes.registerType("telnet-send", senderNode, {
    })

}
