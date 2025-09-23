const express = require('express');
const app = express();
const PORT = 3000;

// Middleware to parse JSON
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
  res.send('Hello from Node.js backend!');
});

// POST route example
app.post('/submit', (req, res) => {
  const data = req.body;
  res.send(`Received: ${JSON.stringify(data)}`);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
