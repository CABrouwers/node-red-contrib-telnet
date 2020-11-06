

module.exports = function (RED) {
    const te = require('telnet-engine')

    function requestNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var server = RED.nodes.getNode(config.connection);

        var broadcasting = null;
        var statusBroadcasting = null;
        var statusVal = { fill: "grey", shape: "ring", text: "idle" };
        var statusResetter = null;
        var engine = null;



        if (config.ending.length == 0) { config.endingType = "nul" }
        var error = config.error ? config.error : "Error"

        var endTest
        const reg1 = /^\/(.*)\/$/
        switch (config.endingType) {
            case "str":
                endTest = te.untilString(config.ending)
                break;
            case "rgx":
                var a = reg1.exec(config.ending)
                endTest = te.untilRegExp(RegExp(a ? a[1] : config.ending))
                break;
            case "lin":
                endTest = te.untilNumLines(parseInt(config.ending))
                break;
            case "tim":
                endTest = te.untilMilli(parseInt(config.ending))
                break;
            case "nul":
            default:
                endTest = te.oneLine()
        }



        if (server) {
            var statusSender = server.getStatusBroadcaster();
            engine = server.engine;
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

            if (engine) {
                setStatus(true);
                engine.requestString(msg.payload.toString(), endTest, undefined, node.id)
                    .then((arr) => {
                        msg1 = Object.assign({}, msg)
                        msg1.payload = arr
                        send([msg1, ,])
                        setStatus(true)
                        arr.forEach(pl => {
                            msg2 = Object.assign({}, msg)
                            msg2.payload =  pl 
                            send([ ,msg2, ])
                        })
                    },
                        (arr) => { msg.payload = error;  send([, , msg]) })
            }
            done()
        })


        node.on('close', function () {
            if (broadcasting) { broadcasting.resolve(); }
            if (statusBroadcasting) { broadcstatusBroadcastingasting.resolve(); }
        });
    }

    RED.nodes.registerType("telnet-request", requestNode, {
    })

}
