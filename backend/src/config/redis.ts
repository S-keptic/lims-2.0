import IOredis from "ioredis";

const redisConnection = new IOredis({
    host: "127.0.0.1",
    port : 6379,
    maxRetriesPerRequest: null
})

export default redisConnection