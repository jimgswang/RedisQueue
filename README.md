RedisQueue
============

A simple queue for tasks using Redis

Install
============

    npm install redisqueue


Usage
------------

####Add tasks:

    var RedisQueue = require('rq');

    var taskQueue = new RedisQueue('test queue', {
        host: '127.0.0.1',
        port: 6379
    });

    taskQueue.enqueue({
        foo: 'bar',
        baz: 'qux'
    });

####Process:
    
    var RedisQueue = require('rq');

    var taskQueue = new RedisQueue('test queue', {
        host: '127.0.0.1',
        port: 6379
    });

    taskQueue.dequeue(function(task) {
        console.log(task.data.foo); // 'bar'
        console.log(task.data.baz); // 'qux'

        task.done();

        // or task.done(new Error('something went wrong'));
    });

    taskQueue.on('error', function(err) {
        console.log(err.message);
    });


##Retries:

By default all tasks are only attempted once. You may queues to attempt a task multiple times. Re-attempts will happen immediately after a failed attempt by the *same* queue instance.

##Events:

Queues fire a number of events:
    
####queue.on('error', function(err) {})
Whenever an error occurs with the queue or underlying redis client

####queue.on('complete', function(task) {})
Whenever a task is completed successfully

####queue.on('fail', function(err, task) {})
Whenever a task attempt is unsuccessful. Fired once for each attempt

API
---------

###RedisQueue(name, [options])

The constructor. Name specifies the name of the queue in redis. Queues only process tasks added to the queue with the same name. Options defines the redis settings including:
    host: host of the redis server. defaults to local host
    port: port of  redis server. defaults to 6379
    retry: max number of retries if a task fails. defaults to 0


####Queue.enqueue(data)

Add a new task to the queue. Data is a javascript object containing data specific to the created task

####Queue.dequeue(handler)

Define the handler function to process all tasks with. Handler is passed one argument: task, which holds the data of the current task and a callback to signal completion


####Task.data

Returns the data associated with the task

####Task.done([err])

Signals the completion of the task. If an error is passed, the task will be marked as unsuccessful.


License
--------

MIT
