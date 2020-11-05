var te = require("telnet-engine")
var opm = require("openpromise")
var qe = new opm.Queue()


qe.enQueue(() => {
    var en = new te.Engine("rainmaker.wunderground.com", 23)
    en.listenString(console.log)
    en.echoString((s) => { console.log("->", s) })
    en.requestString(null, te.untilPrompt("Press Return to continue:"))
    en.requestString("", te.untilPrompt("-- "))
    en.requestString("NYC", te.untilMilli(500))
    return en.terminate()
})

qe.enQueue(() => {
    var en = new te.Engine("rainmaker.wunderground.com", 23)
    en.requestString(null, te.untilPrompt("Press Return to continue:"))
    en.requestString("", te.untilPrompt("-- "), console.log)
    en.requestString("NYC", te.untilMilli(500), (s) => { console.log(s.slice(0, 10)) })
    return en.terminate()
})


qe.enQueue(() => {
    var en = new te.Engine("rainmaker.wunderground.com", 23)
    en.listenString(console.log)
    en.requestString(null, te.untilPrompt("Press Return to continue:"))
        .then(() => { console.log("1==== found the prompt") })
        .catch(() => { console.log("2=== couldn't find the prompt") })

    en.requestString("", te.untilPrompt("ThisIsNotTheCorrectPrompt"))
        .then(() => { console.log("3=== found the prompt") })
        .catch(() => { console.log("4=== couldn't find the prompt") })
        .finally(() => { console.log("5=== finished"); en.terminate() })
    return en.terminate()
})



qe.enQueue(() => {

    var en = new te.Engine("rainmaker.wunderground.com", 23)

    en.requestString(null, te.untilPrompt("Press Return to continue:"))
        .then((s) => { console.log(s) })

    en.requestString("", te.untilMilli(100), (s) => { return s.length })
        .then((s) => { console.log(s) })
    return en.terminate()
})


qe.enQueue(() => {
    var en = new te.Engine("rainmaker.wunderground.com", 23)
    en.listenString(console.log)

    en.requestString(null, te.untilPrompt("Press Return to continue:"))
    en.requestString("", te.untilPrompt("-- "))
    var lineNumber
    //f1 stores the number at the begining of the line for Canada
    f1 = (s) => { if (s.includes("Canad")) { lineNumber = /\d+/.exec(s)[0] } }
    lineNumber = 236  //this line has not effect (See explanation here under)
    en.requestString("", te.untilMilli(100), f1)
    //f2 returns the value stored
    f2 = () => { return lineNumber }
    en.requestString(f2, te.untilMilli(100))
    return en.terminate()
})



qe.enQueue(() => {
    var en = new te.Engine("rainmaker.wunderground.com", 23)

    en.listenString(console.log)
    en.requestString(null, te.untilPrompt("Press Return to continue:"))
    en.requestString("", te.untilPrompt("-- "))

    //the following line creates a proxy and freezes the queue of en
    var px = en.proxy()

    //the following commands are queued by en
    en.requestString("NYC", te.untilPrompt("exit:"))
    en.requestString("", te.untilPrompt("menu:"))
    en.requestString("", te.untilMilli(100))

    //the following commands are executed by px
    px.requestString("MIA", te.untilPrompt("exit:"))
    px.requestString("", te.untilPrompt("menu:"))
    px.requestString("", te.untilMilli(100))
    //this lines disables the proxy px and releases the queue of en
    px.release()

    return en.terminate()
})