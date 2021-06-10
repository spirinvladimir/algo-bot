global.apiKey = 'mUIZNutr1Zl8MOPQflNiGNeS7unf9HfzE1J9dTCRDYM4F0doiAHakBIlsW3RbMUO',
global.apiSecret = 'CfR6uRodi3vovae1v52hzWzsYIvPuaGsHlCuj8oCtAKllku5wkiMYZpGiyc4qnvE'


rest = require('./rest')
websocket = require('./websocket')

top_volume_symbols_count = 10
m1 = 60000
min = Infinity
max = -Infinity
sum = 0
count = 0

min_mean_max = t => {
    t = Math.floor((Date.now() - t) / 1000)
    if (t < min) min = t
    if (t > max) max = t
    sum += t
    count++
}
latency_events = () => setTimeout(() => {
    if (count != 0) {
        console.log('latency in seconds by events per minute:', min, 'min',  Math.round(sum / count), 'mean', max, 'max')
        min = Infinity
        max = -Infinity
        sum = 0
        count = 0
    }
    latency_events()
}, m1)

state = null

//- Log to console current non 0 asset balances available on the SPOT account (testnet)
rest.account({recvWindow: 60000})
    .then(_ => state = _) //- Keep your local asset balances state up to date based on the data coming from userData
    .then(_ => _.balances.filter(_ => _.free > 0))
    .then(console.table)
    .then(() => {
        //- Open a single userData websocket (with all the requirement logic to keep the listenKey active)
        websocket.user(_ => {
            if (!_.updateTime || _.updateTime <= state.updateTime) return
            state.updateTime = _.updateTime
            _.balances.forEach(update => {
                balance = state.balances.find(balance => balance.asset == update.asset)
                if (balance) Object.keys(balance).forEach(_ => balance[_] = update[_])
                else state.balances.push(update)
                console.table(_.balances)//- Log the asset balances again on every balance change
            })
        })
        //- Determinate the 10 pairs dynamically (no hard-coded pairs)
        rest.hr24()
            .then(_ => _
                .filter(_ => _.symbol.endsWith('USDT'))
                .sort((a, b) => b.quoteVolume - a.quoteVolume)
                .slice(0, top_volume_symbols_count - 1)
                .map(_ => _.symbol.toLowerCase())
            )
            .then(symbols => {
                //- Open 10 *@trade websockets for the 10 pairs with the highest volume in the last 24h on the SPOT exchange
                symbols.forEach(symbol =>
                    websocket.trade(symbol, _ => min_mean_max(_))
                )
                //- Measure event time => client receive time latency and log (min/mean/max) to console every 1 minute
                latency_events()
            })
            .catch(console.error)
    })
    .catch(console.error)
