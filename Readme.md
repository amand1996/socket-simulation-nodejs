#socket-simulation-nodejs

All the requirements of the task have been implemented in this project.
I haven't used any external modules, frameworks or dependencies except 'babel'.

Steps to run the project=>

a) Run: `$ npm install` (To install babel dependencies since the project code is in ES6)

b) Run: `$ npm start` (This will start the server)

c) Use Postman to test the APIs:

	1) `GET localhost:5000/sleep?timeout=30&connid=1`

	2) `GET localhost:5000/server-status`

	3) `POST localhost:5000/kill`
		body => `{ "connid": 1}`