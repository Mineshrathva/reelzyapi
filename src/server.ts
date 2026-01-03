import app from "./app";

const PORT = 4000;

(async () => {

  app.listen(PORT, () => {
    console.log(`🚀 REST API running on http://localhost:${PORT}`);
  });
})();
