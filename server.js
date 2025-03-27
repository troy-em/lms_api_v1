const app = require('./app');

// set port, listen for requests
const PORT = process.env.PORT || 3501;

app.get("/", (req, res) => {
  res.json({ message: "Welcome" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
