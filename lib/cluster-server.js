/**
 * Created by Ralph Varjabedian on 11/16/16.
 */

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const disableCluster = require('../config').disableCluster;

//https://nodejs.org/api/cluster.html
module.exports = function(workerFn) {
  if(disableCluster) {
    return workerFn();
  }
  if(cluster.isMaster) {
    // Fork workers.
    console.log("Cluster, forking", numCPUs, "child processes.")
    for(var i = 0; i < numCPUs; i++) {
      cluster.fork();
    }
    cluster.on('exit', (worker, code, signal) => {
      console.log(`worker ${worker.process.pid} died`);
    });
  } else {
    workerFn();
  }
};