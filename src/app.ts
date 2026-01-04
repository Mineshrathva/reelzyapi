app.get("/env-check", (_req, res) => {
  res.json({
    host: process.env.DB_HOST || null,
    port: process.env.DB_PORT || null,
    user: process.env.DB_USER || null,
    name: process.env.DB_NAME || null,
  });
});
