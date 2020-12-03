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

async function _get(url) {
  let request = {
    method: 'GET',
    headers: {
      "Authorization": "Basic Og==",
      'Content-Type': 'application/json',
      'x-access-token': token,
    }
  }
  const serverReturn = await fetch(ENDPOINT_URL + url, request)
  const serverResponse = await serverReturn.json()
  return serverResponse
}

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
  const serverReturn = await fetch(ENDPOINT_URL + '/application/messages', request)
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
  const serverReturn = await fetch(ENDPOINT_URL + '/application/messages', request)
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
      ENDPOINT_URL + '/application/messages',
      { 'text': '' + agent.query, 'isUser': true }
    )
    agent.add(responses[0])
    agent.add(responses[1])
    await _post(
      ENDPOINT_URL + '/application/messages',
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
      await _delete(ENDPOINT_URL + "/application/messages")
      agent.add("Welcome to Wiscshop!")
      await agentMessage("Welcome to Wiscshop!")
    }
  }

  async function category_query() {
    let responses = [
      "No problem.",
      "OK.",
      "Sure.",
      "Got it.",
      "Here's what I've found for you.",
    ];
    await userMessage(agent.query);
    serverResponse = await _get("/categories");
    await agentMessage(responses[Math.floor(Math.random() * responses.length)]);
    let catString = "";
    serverResponse.categories.forEach((element, index) => {
      catString += element + ", ";
    })
    await agentMessage("These categories of products are offered: " + catString);

  }

  async function category_tag_query() {
    let responses = [
      "No problem.",
      "OK.",
      "Sure.",
      "Got it.",
      "Here's what I've found for you.",
    ];
    await userMessage(agent.query);
    serverResponse = await _get("/categories/" + agent.parameters.category + "/tags")
    await agentMessage(responses[Math.floor(Math.random() * responses.length)]);
    let tagString = "";
    serverResponse.tags.forEach((element, index) => {
      tagString += element + ", ";
    })
    await agentMessage("These tags are found under " + agent.parameters.category + ": " + tagString)
  }

  async function cart_number() {
    let greetingSyno = [
      "You have ",
      "There are "
    ];
    let cartSyno = [
      "cart.",
      "shopping cart.",
      "shopping bag.",
      "bag."
    ];
    await userMessage(agent.query)
    serverResponse = await _get('/application/products')
    await agentMessage(greetingSyno[Math.floor(Math.random() * greetingSyno.length)]
      + serverResponse.products.length + " items in your " + cartSyno[Math.floor(Math.random() * cartSyno.length)])
  }

  async function cart_price() {
    let cartSyno = [
      "cart",
      "shopping cart",
      "shopping bag",
      "bag"
    ];
    await userMessage(agent.query)
    serverResponse = await _get('/application/products')
    let priceSum = 0;
    serverResponse.products.forEach(item => {
      priceSum += item.price
    })
    await agentMessage("The total cost of products in your " + cartSyno[Math.floor(Math.random() * cartSyno.length)] + " is: " + priceSum + " dollars")
  }

  async function cart_category() {
    let greetingSyno = [
      "These are the different categories of items in your bag: ",
      "Here's a list of different styles of items you have selected: ",
      "You have these styles of products added to your shopping cart: "
    ]
    await userMessage(agent.query);
    serverResponse = await _get('/application/products');
    let catCollection = new Set();
    serverResponse.products.forEach(item => {
      catCollection.add(item.category);
    })
    let str = "[ ";
    catCollection.forEach(style => {
      str += style.toString() + " ";
    })
    str += "]"
    await agentMessage(greetingSyno[Math.floor(Math.random() * greetingSyno.length)] + str)

  }

  async function product_information() {
    let responses = [
      "No problem.",
      "OK.",
      "Sure.",
      "Got it."
    ];
    await userMessage(agent.query);
    let pageData = await _get('/application')
    let page = pageData.page
    let id = agent.parameters.product
    if (!Number.isInteger(Number(page.substring(page.lastIndexOf("/") + 1)))) {
      await _put(ENDPOINT_URL + '/application', { 'page': page + '/products/' + id })
      let productData = await _get('/products/' + id);
      let description = productData.description;
      await agentMessage(responses[Math.floor(Math.random() * responses.length)] + "Here's a short description for it: " + description)
    }
  }

  async function product_review() {
    await userMessage(agent.query)
    // get the id of current product
    let pageData = await _get('/application')
    let page = pageData.page
    let id = Number(page.substring(page.lastIndexOf("/") + 1))
    if (Number.isInteger(id)) {
      let reviewData = await _get("/products/" + id + "/reviews");
      reviews = reviewData.reviews
      if (reviews.length === 0) {
        await agentMessage("There is no rating for this product right now. You can try other products.")
        return
      }
      let avgRating = 0;
      let strRating = "The average rating for this product is ";
      let strReview = "Here is a list of at most 5 reviews of this product: "
      for (let i = 0; i < reviews.length; i++) {
        avgRating += reviews[i].stars;
        if (i < 5) {
          // display at most 5 items
          strReview += 1 + i + ". " + reviews[i].text + "; ";
        }
      }
      strRating += avgRating + ". ";
      await agentMessage(strRating);
      await agentMessage(strReview);
    } else {
      await agentMessage("You are not in a product page, please navigate to a product and try to ask for reviews again.")
    }

  }

  async function tag_filter() {
    let responses = [
      "No problem.",
      "OK.",
      "Sure.",
      "Got it."
    ];
    await userMessage(agent.query);
    await agentMessage(responses[Math.floor(Math.random() * responses.length)] + "I'm Filtering out the products for you...");
    let tags = agent.parameters.tags;
    for (let i = 0; i < tags.length; i++) {
      await _post(ENDPOINT_URL + '/application/tags/' + tags[i].toString());
    }
  }

  async function tag_delete() {
    let responses = [
      "No problem.",
      "OK.",
      "Sure.",
      "Got it."
    ];
    await userMessage(agent.query);
    await agentMessage(responses[Math.floor(Math.random() * responses.length)] + "Showing all the products in this category for you...");
    await _delete(ENDPOINT_URL + '/application/tags');
  }

  async function cart_add() {
    let responses = [
      "No problem.",
      "OK.",
      "Sure.",
      "Got it."
    ];
    await userMessage(agent.query);
    await agentMessage(responses[Math.floor(Math.random() * responses.length)] + "Adding this item to your cart...");
    let pageData = await _get('/application');
    let page = pageData.page;
    let id = Number(page.substring(page.lastIndexOf("/") + 1));
    if (Number.isInteger(id)) {
      // get the quantity of items user wants to add
      let quantity = agent.parameters.quantity;
      for (let i = 0; i < quantity; i++){
        await _post(ENDPOINT_URL + '/application/products/' + id);
      }
    } else {
      await agentMessage("You are not in a product page, please navigate to a product and try to ask for reviews again.")
    }
  }

  async function cart_delete() {
    let responses = [
      "No problem.",
      "OK.",
      "Sure.",
      "Got it."
    ];
    await userMessage(agent.query);
    await agentMessage(responses[Math.floor(Math.random() * responses.length)] + "Modifying your cart...");
    let cartData = await _get('/application/products');
    let cart = cartData.products;
    let deleteID = Number(agent.parameters.product);
    let quantity = agent.parameters.quantity;
    for (let i = 0; i < cart.length; i++) {
      if (Number(cart[i].id) === deleteID) {
        await agentMessage("Recognized");
        for (let j = 0; j < quantity; j++) {
          await _delete(ENDPOINT_URL + '/application/products/' + deleteID);
        }
      }
    }
  }

  async function navigate() {
    let responses = [
      "No problem.",
      "OK.",
      "Sure.",
      "Got it."
    ];
    await userMessage(agent.query);
    // await _put('https://mysqlcs639.cs.wisc.edu/application', {'page': '/' + username})
    if (agent.parameters.page !== null) {
      // randomly select a success message
      await agentMessage(responses[Math.floor(Math.random() * responses.length)]);
      let body = {};
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
      // navigate to that page
      await _put(ENDPOINT_URL + '/application', body);
    }
  }


  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  // You will need to declare this `Login` content in DialogFlow to make this work
  intentMap.set('Login Intent', login);
  intentMap.set('Navigate Intent', navigate);
  intentMap.set('Category Query Intent', category_query);
  intentMap.set('Category Tag Query Intent', category_tag_query);
  // Cart Query Options
  intentMap.set('Cart Query Number Intent', cart_number);
  intentMap.set('Cart Query Price Intent', cart_price);
  intentMap.set('Cart Query Category Intent', cart_category);
  // Product Query Options
  intentMap.set('Product Query Information Intent', product_information);
  intentMap.set('Product Query Review Intent', product_review);
  // narrow down
  intentMap.set('Tag Filter Intent', tag_filter);
  intentMap.set('Tag Delete Intent', tag_delete);
  // cart operations
  intentMap.set('Cart Add Intent', cart_add);
  intentMap.set('Cart Delete Intent', cart_delete);
  agent.handleRequest(intentMap);
})

app.listen(process.env.PORT || 8080)
