const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// Rotas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Servidor rodando!',
    timestamp: new Date()
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════╗
  ║  🚀 SERVIDOR INICIADO!             ║
  ║                                    ║
  ║  📍 http://localhost:${PORT}          ║
  ║                                    ║
  ║  Pressione Ctrl+C para parar       ║
  ╚════════════════════════════════════╝
  `);
});
