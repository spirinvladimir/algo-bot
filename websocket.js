rest = require('./rest')

WebSocket = require('ws')

ws_url = 'wss://stream.binance.com:9443/ws/'
ws = null
key = null
interval = null

create = (next, cb) =>
    rest.getUserData()
        .then(({ listenKey }) => {
            ws = new WebSocket(ws_url + listenKey)
            ws.onmessage = (msg, _ = JSON.parse(msg.data)) =>
                _.e == 'outboundAccountPosition' && cb({
                    balances: _.B.map(({ a, f, l }) => ({ asset: a, free: f, locked: l })),
                    eventTime: _.E,
                    updateTime: _.u
                })
            ws.onerror = () => ws.close()
            ws.onclose = () => create(true, cb)

            key = listenKey

            interval = setInterval(() => keep(false, cb), 50000)

            keep(true)
        })
        .catch(_ =>
            next && console.error(_) || setTimeout(() => create(true, cb), 30000)
        )

keep = (next, cb) =>
    key && rest.keepUserData({ listenKey: key }).catch(() => {
        close()
        if (next) setTimeout(() => create(true, cb), 30000)
        else create(true, cb)
    })

close = () => {
    if (!key) return
    clearInterval(interval)
    rest.closeUserData({ listenKey: key })
    ws.close()
    key = null
}

module.exports.user = cb => create(false, cb)
module.exports.trade = (symbol, cb) => {
    w = new WebSocket(ws_url + symbol + '@trade')
    w.onmessage = _ => cb(JSON.parse(_.data).E/*eventTime*/)
    w.onerror = () => w.close()
    w.onclose = () => trade(symbol, cb)
}
