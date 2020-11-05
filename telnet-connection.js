module.exports = function (RED) {
    const rp = require('openpromise');
    const te = require('telnet-engine')

    function connectionNode(config) {

        RED.nodes.createNode(this, config);
        var node = this;

        const port = config.port ? config.port : 23
        const host = config.address


        node.engine = new te.Engine(host, port)



        node.engine.timeOut = config.timeOut ? config.timeOut : 1000

        node.engine.clearOut = config.clearOut ? config.clearOut : 0

        node.engine.inDelimiter = config.inDelimiter ? RegExp(config.inDelimiter) : /\r\n|\r|\n/ 

        node.engine.outDelimiter = config.outDelimiter ? config.outDelimiter.replace(/\\n/, '\n').replace(/\\r/, '\r').replace(/\\l/, '\l') : "\n" 

        node.engine.modeStrict = false

        node.engine.autoFlush = 100

        node.engine.autoFlush = config.openTries ? config.openTries : 1

        
        var statusBroadcaster = new rp.Cycle();

        statusBroadcaster.repeat({ fill: "grey", shape: "ring", text: "idle" });
        

        const onConnecting = node.engine.onConnecting(() => {
            statusBroadcaster.repeat({
                fill: "yellow", text: "connecting"
            })
        })

        const onSuccess = node.engine.onConnectionSuccess(() => {
            statusBroadcaster.repeat({ fill: "green", text: "OK" });
            node.log("Connected to " + host+":"+port);
        })


        const onError = node.engine.onConnectionError(() => {
            node.error('Connection error during communication');
            statusBroadcaster.repeat({ fill: "red", text: "error" })
        })

        const onEnd = node.engine.onConnectionEnd(() => {
            statusBroadcaster.repeat({ fill: "grey", text: "closed" });
            node.log('Requested an end to the  connection');
        })

        const onConnectionTimeOut = node.engine.onConnectionTimeOut(() => {
            statusBroadcaster.repeat({ fill: "red", text: "timeout" });
            node.error(`Connection wait exceeded timeout`);
        }
        )

        const onResponseTimeOut = node.engine.onResponseTimeOut(() => {
            statusBroadcaster.repeat({ fill: "red", text: "timeout" });
            node.error(`Response wait exceeded timeout value (request ${node.engine.timeOut})`);
        }
        )

        const onReceive = node.engine.onReceive(() => {
            statusBroadcaster.repeat({ fill: "green", text: "OK" });
        })

        node.getStatusBroadcaster = () => { return statusBroadcaster };


        node.on('input', function (msg, send, done) {
            done();
        });

        node.on('close',

            () => {
                node.engine.destroy()
                statusBroadcaster.terminate()
            }

        )

    }

    RED.nodes.registerType("telnet-connection", connectionNode, {
    })



}