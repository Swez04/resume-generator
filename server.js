const express = require('express');
const bodyParser = require('body-parser');
const { engine } = require('express-handlebars'); // Change made here
const sqlite3 = require('sqlite3').verbose();
const pdf = require('html-pdf');
const path = require('path');

const app = express();

// Set up Handlebars
app.engine('hbs', engine({ extname: '.hbs' })); // Change made here
app.set('view engine', 'hbs');

// Body-parser to handle form submissions
app.use(bodyParser.urlencoded({ extended: true }));

// Static folder for CSS and assets
app.use(express.static('public'));

// SQLite setup
const db = new sqlite3.Database('./db.sqlite');

// Create table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS resume_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    phone TEXT,
    education TEXT,
    experience TEXT,
    skills TEXT
  )
`);

// Routes
// Show form to enter resume data
app.get('/', (req, res) => {
    res.render('form');
});

// Handle form submission
app.post('/generate', (req, res) => {
    const { name, email, phone, education, experience, skills } = req.body;

    db.run(`INSERT INTO resume_data (name, email, phone, education, experience, skills) 
            VALUES (?, ?, ?, ?, ?, ?)`, 
           [name, email, phone, education, experience, skills], function (err) {
        if (err) {
            return res.send('Error occurred while saving data');
        }
        // Fetch saved data and render resume
        db.get(`SELECT * FROM resume_data WHERE id = ?`, [this.lastID], (err, row) => {
            if (err) {
                return res.send('Error occurred while fetching data');
            }

            // Render HTML resume
            res.render('resume', row, (err, html) => {
                if (err) {
                    return res.send('Error generating resume');
                }

                // Convert HTML to PDF and send to client
                pdf.create(html).toStream((err, stream) => {
                    if (err) return res.send('Error generating PDF');
                    res.setHeader('Content-Type', 'application/pdf');
                    stream.pipe(res);
                });
            });
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
