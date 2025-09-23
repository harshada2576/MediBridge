const express = require('express');
const app = express();
const apiRouter = require('./routes/api');

app.use(express.json()); // Parse JSON bodies
app.use('/api', apiRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
