require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const slackRoutes = require('./routes/slack');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/slack', slackRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('server running on port ${PORT}'));