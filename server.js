const app = require("./app");
const PORT = Number(process.env.PORT) || 8000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
