import http from 'http';
import url from 'url';
import {
	StringDecoder
} from 'string_decoder';
import net from 'net';

const server = http.createServer((req, res) => {

	let parsedUrl = url.parse(req.url, true);
	let path = parsedUrl.pathname;
	let trimmedPath = path.replace(/^\/+|\/+$/g, '');
	let method = req.method.toUpperCase();
	let queryParams = parsedUrl.query;
	let headers = req.headers;
	let decoder = new StringDecoder('utf8');
	let buffer = '';

	req.on('data', (data) => {
		buffer += decoder.write(data);
	});

	req.on('end', () => {
		buffer += decoder.end();
		console.log(`${ method } /${ trimmedPath }`);
		let handlerFunction = typeof (router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

		let data = {
			'trimmedPath': trimmedPath,
			'queryParams': queryParams,
			'method': method,
			'headers': headers,
			'body': buffer
		};

		handlerFunction(data, (statusCode, payload) => {
			statusCode = typeof (statusCode) == 'number' ? statusCode : 200;
			payload = typeof (payload) == 'object' ? payload : {};

			let payloadString = JSON.stringify(payload);

			res.writeHead(statusCode, {
				'Content-Type': 'application/json'
			});
			return res.end(payloadString);
		});
	})
});

server.listen(5000, (err) => {
	if (err) {
		return console.log('something went wrong ', err)
	}
	console.log("The server started on port 5000")
});

let handlers = {};
let clientsArr = [];
let killClientArr = [];

handlers.sleep = (data, callback) => {

	if (isNaN(data.queryParams.timeout) || isNaN(data.queryParams.connid)) {
		return callback(200, {
			'msg': 'Please try again with correct query params'
		});
	}
	let flagExists = clientsArr.some((item) => {
		return data.queryParams.connid === item.connid;
	});

	if (flagExists === true) {
		return callback(200, {
			'msg': 'The connid already exists'
		});
	}

	let client = new net.Socket();
	client.connect(3000, () => {
		killClientArr.push({
			connid: parseInt(data.queryParams.connid),
			clientConnection: client
		});
		client.write(JSON.stringify(data.queryParams));
		client.on('close', (data) => {
			return callback(500, {
				'stat': 'closed via POST /kill route'
			});
		});

		client.on('data', (data) => {
			client.destroy();
			return callback(200, {
				'stat': 'ok'
			});
		});
	});
};

handlers.serverStatus = (data, callback) => {

	clientsArr.map((item) => {
		item.timeLeft = Math.round((item.timeout * 1000 - Date.now() + item.start) / 1000);
	});
	return callback(200, {
		'serverStatus': clientsArr
	});
};

handlers.kill = (data, callback) => {
	if (data.method === 'POST') {
		let parsedBody = JSON.parse(data.body);
		if (isNaN(parsedBody.connid)) {
			return callback(200, {
				'msg': 'connid should be a number.'
			});
		}

		killClientArr.map((item) => {
			if (parsedBody.connid === item.connid) {
				item.clientConnection.destroy();
				killClientArr.splice(killClientArr.indexOf(item), 1);
				return callback(200, {
					'stat': `killed connid ${parsedBody.connid}`
				});
			}
		});
		return callback(200, {
			'msg': 'Socket connection with the given connid not found.'
		});
	} else {
		return callback(200, {
			'msg': 'Please use POST method.'
		});
	}
};

handlers.notFound = (data, callback) => {
	callback(404);
};

let router = {
	'sleep': handlers.sleep,
	'server-status': handlers.serverStatus,
	'kill': handlers.kill
};

net.createServer((sock) => {
	sock.name = sock.remotePort;

	sock.on('data', (data) => {
		console.log(`Connected: connid = ${ JSON.parse(data).connid } | timeout = ${ JSON.parse(data).timeout }`);

		setTimeout(() => {
			if (!sock.destroyed) {
				sock.write('time out');
			}
		}, JSON.parse(data).timeout * 1000);

		clientsArr.push({
			connid: JSON.parse(data).connid,
			port: sock.remotePort,
			start: Date.now(),
			timeout: JSON.parse(data).timeout,
		});
	});

	sock.on('close', (data) => {
		clientsArr = clientsArr.filter((item) => {
			if (item.port === sock.remotePort) {
				console.log(`Connection with connid ${ item.connid } closed`);
			}
			return item.port !== sock.remotePort;
		});
	});
}).listen(3000);