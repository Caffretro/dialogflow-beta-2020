const express = require('express')
const { WebhookClient } = require('dialogflow-fulfillment')
const app = express()
const fetch = require('node-fetch')
const base64 = require('base-64')

let username = "";
let password = "";
let token = "";

USE_LOCAL_ENDPOINT = false;
// set this flag to true if you want to use a local endpoint
// set this flag to false if you want to use the online endpoint
ENDPOINT_URL = ""
if (USE_LOCAL_ENDPOINT) {
  ENDPOINT_URL = "http://127.0.0.1:5000"
} else {
  ENDPOINT_URL = "https://mysqlcs639.cs.wisc.edu"
}

// Basic API wrappers, these will be called by higher level wrappers

async function _put(url, body) {
  let request = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token,
    },
    body: JSON.stringify(body)
  };
  const serverReturn = await fetch(url, request)
  const serverResponse = await serverReturn.json()
  return serverResponse
}

async function _post(url, body) {
  let request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token,
    },
    body: JSON.stringify(body)
  };
  const serverReturn = await fetch(url, request)
  const serverResponse = await serverReturn.json()
  return serverResponse
}

async function _delete(url) {
  let request = {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token,
    }
  };
  const serverReturn = await fetch(url, request)
  const serverResponse = await serverReturn.json()
  return serverResponse
}

async function agentMessage(message) {
  let request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token,
    },
    body: JSON.stringify({ 'text': message, 'isUser': false })
  };
  const serverReturn = await fetch('https://mysqlcs639.cs.wisc.edu/application/messages', request)
  const serverResponse = await serverReturn.json()
  return serverResponse
}

async function userMessage(message) {
  let request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': token,
    },
    body: JSON.stringify({ 'text': message, 'isUser': true })
  };
  const serverReturn = await fetch('https://mysqlcs639.cs.wisc.edu/application/messages', request)
  const serverResponse = await serverReturn.json()
  return serverResponse
}

async function getToken() {
  let request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + base64.encode(username + ':' + password)
    },
    redirect: 'follow'
  }

  const serverReturn = await fetch(ENDPOINT_URL + '/login', request)
  const serverResponse = await serverReturn.json()
  token = serverResponse.token

  return token;
}

app.get('/', (req, res) => res.send('online'))
app.post('/', express.json(), (req, res) => {
  const agent = new WebhookClient({ request: req, response: res })

  async function welcome() {
    // clear messages on API side


    let responses = ['Hello!', 'What can I do for you today?'];
    await _post(
      'https://mysqlcs639.cs.wisc.edu/application/messages',
      { 'text': '' + agent.query, 'isUser': true }
    )
    agent.add(responses[0])
    agent.add(responses[1])
    await _post(
      'https://mysqlcs639.cs.wisc.edu/application/messages',
      { 'text': '' + responses[0] + '\n' + responses[1], 'isUser': false }
    )
  }

  async function login() {
    // You need to set this from `username` entity that you declare in DialogFlow
    username = agent.parameters.username
    // You need to set this from password entity that you declare in DialogFlow
    password = agent.parameters.password
    await getToken()
    if (typeof token === 'undefined') {
      agent.add("Sorry, your username or password is incorrect.");
      await agentMessage("Sorry, your username or password is incorrect.");
    } else {
      await _delete("https://mysqlcs639.cs.wisc.edu/application/messages")
      agent.add("Welcome to Wiscshop!")
      await agentMessage("Welcome to Wiscshop!")
    }
  }

  async function navigate() {
    let responses = [
      "No problem.",
      "OK.",
      "Sure.",
      "Got it."
    ]
    await userMessage(agent.query)
    // await _put('https://mysqlcs639.cs.wisc.edu/application', {'page': '/' + username})
    if (agent.parameters.page !== null) {
      // randomly select a success message
      await agentMessage(responses[Math.floor(Math.random() * responses.length)])
      let body = {}
      if (agent.parameters.page === "Home") {
        body = { 'page': '/' + username };
      } else if (agent.parameters.page === 'Cart') {
        body = { 'page': '/' + username + '/cart' };
      } else if (agent.parameters.page === 'Hats') {
        body = { 'page': '/' + username + '/hats' };
      } else if (agent.parameters.page === 'Sweatshirts') {
        body = { 'page': '/' + username + '/sweatshirts' };
      } else if (agent.parameters.page === 'Plushes') {
        body = { 'page': '/' + username + '/plushes' };
      } else if (agent.parameters.page === 'Leggings') {
        body = { 'page': '/' + username + '/leggings' };
      } else if (agent.parameters.page === 'Tees') {
        body = { 'page': '/' + username + '/tees' };
      } else if (agent.parameters.page === 'Bottoms') {
        body = { 'page': '/' + username + '/bottoms' };
      } else if (agent.parameters.page === 'Back') {
        body = { "back": true };
      }
      await _put('https://mysqlcs639.cs.wisc.edu/application', body)
    }
  }


  let intentMap = new Map()
  intentMap.set('Default Welcome Intent', welcome)
  // You will need to declare this `Login` content in DialogFlow to make this work
  intentMap.set('Login Intent', login)
  intentMap.set('Navigate Intent', navigate)

  agent.handleRequest(intentMap)
})

app.listen(process.env.PORT || 8080)
