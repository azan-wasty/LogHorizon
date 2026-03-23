const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();

app.use(cors());
app.use(express.json());

// Mount API routes
app.use('/api', require('./routes/auth.routes'));
app.use('/api/preferences', require('./routes/preferences.routes'));
app.use('/api/tags', require('./routes/tags.routes'));
app.use('/api/content', require('./routes/content.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

const PORT = process.env.PORT || 6767;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;