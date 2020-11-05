
class OpenPromise extends Promise {

    constructor(f) {
        var reject
        var resolve

        super((res, rej) => {

            resolve = (v) => { this.resolved = true; res(v) }
            reject = (v) => { this.rejected = true; rej(v) }
            if (f) { f(resolve, reject) }
        })

        this.resolve = resolve
        this.reject = reject
        this.fail = reject
    }
}


function Defer() {
    return new OpenPromise()
}



function Delay(d, val) {
    var df = new Defer()
    var timer
    df.finally(() => { clearTimeout(timer) }).catch(() => { })
    df.reset = (d, val) => {
        clearTimeout(timer)
        if (d || d == 0) { timer = setTimeout(() => { df.resolve(val) }, d) }
    }
    df.reset(d, val)
    return df

}



function TimeOut(d, val) {
    var df = new Defer()
    var tm
    df.finally(() => { clearTimeout(tm) }).catch(() => { })
    df.reset = (d, val) => {
        clearTimeout(tm)
        if (d || d == 0) { tm = setTimeout(() => { df.fail(val) }, d) }
    }
    df.reset(d, val)
    return df
}

class Queue {

    constructor(f) {
        this._Queue = Promise.resolve()
    }

    enQueue = (f) => {
        var df = new Defer()
        df.catch(() => { })
        if (f instanceof Promise) {
            this._Queue = this._Queue.then(() => { return f }).then(df.resolve, df.fail)
        }
        else {
            this._Queue = this._Queue.then(f).then(df.resolve, df.fail)
        }
        return df
    }


}



class _Cycler {

    constructor(f) {
        this._promise = new Defer()
    }

    repeat(pl) {
        this._successor = new _Cycler();
        this._promise.resolve(pl)
        return this._successor
    }

    terminate(val) {
        this._promise.resolve(val)
    }


    fail(val) {
        this._promise.reject(val)
    }


    reset(pl, f, tracker, repo) {
        if (repo.kill) { return }
        f(pl)
        this._successor._promise
            .then((pl) => {

                if (this._successor._successor) {
                    this._successor.reset(pl, f, tracker, repo)
                }
                else { tracker.resolve(pl) }
            })
            .catch((pl) => { tracker.reject(pl) })
    }

    thenAgain(f) {

        let tracker = new Defer();
        let repo = {}

        tracker
            .then(() => { repo.kill = true })
            .catch(() => { })
        this._promise
            .then((pl) => {
                if (this._successor) {
                    this.reset(pl, f, tracker, repo)
                }
                else { tracker.resolve(pl) }
            })
            .catch((pl) => { tracker.reject(pl) })
        return tracker
    }

    thenOnce(f) { return this._promise.then(f) }

}




class Cycle {
    constructor(f) {

        this._prom = new Defer()
        this._queue = new Queue()
        this._cycler = new _Cycler()


    }

    repeat(pl) {
        var me = this
        return this._queue.enQueue(() => {
            me._cycler = me._cycler.repeat(pl)
        })
    }

    thenAgain(f) {
        var me = this
        return this._cycler.thenAgain(f)
    }


    thenOnce(f) {
        var me = this
        return this._cycler.thenOnce(f)
    }


    terminate(pl) {
        var me = this
        return this._queue.enQueue(() => {
            me._cycler.terminate(pl)
            me._prom.resolve(pl)
        })

    }

    fail(pl) {
        return this._queue.enQueue(() => {
            me._cycler.fail(pl)
            me._prom.fail(pl)
        })

    }

    then(f) {
        return this._prom.then(f)
    }


    catch(f) {
        return this._prom.catch(f)
    }


    finally(f) {
        return this._prom.finally(f)
    }

    get resolved() { return this._prom.resolved }
    get rejected() { return this._prom.rejected }
    get failed() { return this._prom.failed }

}



function Repeater(d) {
    var cycle = new Cycle()
    console.debug(cycle)
    var timer = setInterval(() => { cycle.repeat() }, d)
    cycle.then(() => { clearInterval(timer) })
    return cycle
}




class Flipflop {
    constructor(f) {
        this._defer = new Defer()
    }

    on() {
        if (this._defer.rejected) { this._defer = new Defer() }
        this._defer.resolve()
    }

    off() {
        if (this._defer.resolved || this._defer.rejected) { this._defer = new Defer() }
    }


    fail() {
        this._defer.fail()
    }

    flip() {
        if (this._defer.resolved) { this._defer = new Defer() }
        else { this._defer.resolve() }
    }

    then(f) { return this._defer.then(f) }
    catch(f) { return this._defer.catch(f) }
    finally(f) { return this._defer.finally(f) }

    get resolved() { return this._defer.resolved }
    get failed() { return this._defer.failed }

}


function untilResolved(f, n, wait) {
    let ret = new Defer()
    f()
        .then((v) => { ret.resolve(v) })
        .catch((v) => {
            if (n && n <= 1) { ret.fail(v) }
            else {
                if (wait) {
                    let dl = new Delay(wait)
                    dl.then(() => {
                        untilResolved(f, n ? n - 1 : undefined, wait)
                            .then((v) => { ret.resolve(v) })
                            .catch((v) => { ret.fail(v) })
                    })
                }
                else {
                    untilResolved(f, n ? n - 1 : undefined)
                        .then((v) => { ret.resolve(v) })
                        .catch((v) => { ret.fail(v) })
                }
            }
        })
    return ret
}



module.exports = {
    OpenPromise,
    Defer,
    Cycle,
    Delay,
    TimeOut,
    Queue,
    Repeater,
    Flipflop,
    untilResolved
}


