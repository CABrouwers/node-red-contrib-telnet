module.exports = function  (RED) {

    function readNode(config) {

        RED.nodes.createNode(this, config);
        var node = this;
        var server = RED.nodes.getNode(config.connection);

        var broadcasting = null;
        var statusBroadcasting = null;
        var statusVal = { fill: "grey", shape: "ring", text: "idle" };
        var statusResetter = null;

        if (server) {


            var engine = server.engine
            
            var statusSender = server.getStatusBroadcaster();


            broadcasting = engine.listenString(
                (pl) => {
                    if (pl) {
                        let msg = { payload: pl };
                        setStatus(true);
                        node.send(msg);
                    }
                })


            statusBroadcasting = statusSender.thenAgain(
                (st) => {
                    statusVal = Object.assign(statusVal, st);
                    this.status(statusVal);
                })

        }

        const setStatus = (state) => {
            clearTimeout(statusResetter);
            if (state) {
                statusVal['shape'] = "dot";
                this.status(statusVal);
                statusResetter = setTimeout(() => { setStatus(false) }, 500)
            }
            else {
                statusVal['shape'] = "ring";
                this.status(statusVal);
            }
        }

        setStatus(false);

        node.on('input', function (msg, send, done) {
            send(msg);
            done()

        })


        node.on('close', function () {
            if (broadcasting) { broadcasting.terminate(); }
            if (statusBroadcasting) { broadcstatusBroadcastingasting.resolve(); }
        });
    }

    RED.nodes.registerType("telnet-read", readNode, {
    })

}
