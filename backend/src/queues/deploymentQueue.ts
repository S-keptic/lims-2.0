import {Queue} from "bullmq"
import redisConnection from "../config/redis"

export const deploymentQueue = new Queue("deployment",{
    connection: redisConnection
})