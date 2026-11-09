import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ mensaje: "¡Backend funcionando!" });
});

app.post("/echo", (req, res) => {
  res.status(201).json({ recibido: req.body });
});

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});